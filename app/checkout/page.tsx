// /checkout — closes the doc's top-priority checkout gap: Pricing.tsx's
// tier CTAs used to link to #upload (the free demo), with no way to
// actually buy a pack. Reads ?tier=STARTER|STYLE, shows the exact price
// breakdown from lib/pricing.ts (the same module the server uses to price
// the order — see api/payment/create-order/route.ts), and drives payment
// through the payment gateway (now PayU — see lib/integrations/payu.ts).
//
// In mock mode there's no real Razorpay widget to open (no real key), so
// "Pay" completes the order immediately against /api/payment/verify, which
// accepts any signature while RAZORPAY_MOCK_MODE is true — enough to walk
// the full create → pay → results journey end-to-end in dev/demo.
//
// Reuses the same per-browser demo user id UploadFlow.tsx already
// establishes (tressform_mock_user_id), so a single demo session's free
// previews, generations, and purchases all tie back to one identity.
//
// 09.10.2026 (real sign-in): with a real database connected, the buyer
// must be logged in (the Pay button becomes "Log in to continue" and brings
// them straight back here), requests carry their login token, and if the
// server reports that payments aren't switched on yet the page says so
// instead of showing a raw error.
//
// 12.10.2026 (PayU): the Razorpay pop-up is gone. "Pay" asks the server for
// the order and a ready-made form, then posts that form to PayU, so the
// customer pays on PayU's own page and PayU brings them back to
// /api/payment/payu-return. PayU requires a mobile number, so the page asks
// for one (passed to PayU, not stored by Tressform). Coming back with
// ?payment=failed shows a short "didn't go through" note above the button.
//
// 14.10.2026 (credit at checkout): customers with Tressform credit see a
// ticked-by-default "Use my ₹X credit" box; the breakdown and the Pay button
// follow it live. The server works the sum out again itself (lib/credit.ts)
// — this page only shows it. When the credit covers everything, there is no
// PayU step and no mobile number to give: the order completes straight away.
//
// 17.10.2026 (owner):
//   - Back from PayU's page brought back a saved copy of this page with the
//     button stuck on "Opening PayU…". The button now resets whenever the
//     page comes back, and the order is remembered for the tab
//     (lib/pendingPayment.ts) so the hairstyles screen can offer
//     "Continue to payment".
//   - "No UPI app on this phone? Pay from another phone": shows a QR code
//     (and a link to share) that opens PayU for this same order on another
//     phone (lib/payHandoff.ts). This page checks the order every few
//     seconds and moves on to the results once it is paid.

"use client";

import { saveWhatsAppNumber } from "@/components/WhatsAppOptIn";
import { WHATSAPP_CONSENT } from "@/lib/whatsapp";
import { Suspense, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import { setReloadBlocked } from "@/components/VersionWatch";
import { clearPendingPayment, savePendingPayment } from "@/lib/pendingPayment";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GST_RATE,
  GST_REGISTERED,
  PACK_TIERS,
  calculatePackPnl,
  paiseToRupees,
  type PackTier,
  isEarlyBirdActive,
} from "@/lib/pricing";
import { SUPABASE_MOCK_MODE, authHeaders, getMockUserId, isAnonymousSession, loginUrl, useSession } from "@/lib/authClient";
import SaveAccount from "@/components/SaveAccount";
import { splitWithCredit } from "@/lib/credit";
import { trackMeta } from "@/lib/metaPixel";
import { currentCampaign } from "@/lib/campaign";

const SELLABLE_TIERS: PackTier[] = ["STARTER", "STYLE"];

/** Send the browser to PayU by posting the form the server prepared. */
function postToPayu(action: string, fields: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

const PHONE_KEY = "tressform_phone";
const phoneOk = (v: string) => {
  let d = v.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d);
};

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = (searchParams.get("tier") || "").toUpperCase() as PackTier;
  const cameBackFailed = searchParams.get("payment") === "failed";

  const [status, setStatus] = useState<"idle" | "paying" | "error">("idle");
  // "Pay from another phone": the QR code and link, while waiting for the payment.
  const [other, setOther] = useState<{ orderId: string; url: string; qr: string } | null>(null);
  const [otherSlow, setOtherSlow] = useState(false);
  const [otherBusy, setOtherBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session, loading: sessionLoading } = useSession();
  const needsLogin = !SUPABASE_MOCK_MODE && !sessionLoading && !session;
  // 23.10.2026: tried the upload before signing in — create the account here, before paying.
  const needsAccount = !SUPABASE_MOCK_MODE && !sessionLoading && isAnonymousSession(session);
  const userId = session?.user.id ?? null;
  const [phone, setPhone] = useState("");
  const [balancePaise, setBalancePaise] = useState(0);
  const [useCredit, setUseCredit] = useState(true);
  const [phoneError, setPhoneError] = useState(false);
  // 15.10.2026: an unticked yes to WhatsApp updates on the same number.
  const [whatsappYes, setWhatsappYes] = useState(false);

  // Remember the number on this device only, so a second purchase is one tap.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PHONE_KEY);
      if (saved) setPhone(saved);
    } catch {
      /* private window: nothing remembered */
    }
  }, []);

  // The customer's Tressform credit, for the "Use my credit" box.
  useEffect(() => {
    if (!SUPABASE_MOCK_MODE && (sessionLoading || !userId)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/referral/me", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ userId: SUPABASE_MOCK_MODE ? getMockUserId() : undefined }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { balancePaise?: number };
        if (!cancelled) setBalancePaise(Math.max(0, data.balancePaise ?? 0));
      } catch {
        /* no credit shown — the customer can still pay in full */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, sessionLoading]);

  // Back from PayU can bring back this page as it was when PayU opened, with
  // the button stuck on "Opening PayU…". Make it usable again.
  useEffect(() => {
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setStatus("idle");
        setOtherBusy(false);
      }
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  // Paying from another phone: check the order every few seconds and move on
  // once it is paid. No automatic site reload meanwhile (VersionWatch).
  useEffect(() => {
    if (!other) return;
    setReloadBlocked(true);
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      try {
        const res = await fetch(`/api/payment/order/${other.orderId}`, { headers: await authHeaders(), cache: "no-store" });
        const data = await res.json();
        if (!stopped && data?.order?.status === "PAID") {
          stopped = true;
          clearPendingPayment();
          router.push(`/results/${other.orderId}`);
          return;
        }
      } catch {
        /* try again on the next tick */
      }
      if (!stopped && Date.now() - started < 30 * 60 * 1000) window.setTimeout(tick, 5000);
    };
    const first = window.setTimeout(tick, 5000);
    // 20.10.2026: UPI can take a few minutes to confirm. After two minutes,
    // say so — a customer once paid twice because the page seemed stuck.
    setOtherSlow(false);
    const slow = window.setTimeout(() => setOtherSlow(true), 2 * 60 * 1000);
    return () => {
      stopped = true;
      window.clearTimeout(first);
      window.clearTimeout(slow);
      setReloadBlocked(false);
    };
  }, [other, router]);

  const validTier = SELLABLE_TIERS.includes(tierParam) ? tierParam : null;

  const pnl = useMemo(() => (validTier ? calculatePackPnl(validTier) : null), [validTier]);
  const pack = validTier ? PACK_TIERS[validTier] : null;
  const split = splitWithCredit(pnl?.pricePaise ?? 0, balancePaise, useCredit);
  const free = split.duePaise === 0 && split.creditPaise > 0;
  const askPhone = !SUPABASE_MOCK_MODE && !free;
  const gstOnDuePaise = GST_REGISTERED ? Math.round(split.duePaise * GST_RATE) : 0;
  const rupees = (paise: number) => `₹${paiseToRupees(paise).split(".")[0]}`;

  async function handlePay(where: "here" | "other" = "here") {
    if (!validTier) return;
    if (askPhone && !phoneOk(phone)) {
      setPhoneError(true);
      return;
    }
    setPhoneError(false);
    try {
      if (askPhone) window.localStorage.setItem(PHONE_KEY, phone.trim());
    } catch {
      /* not remembered — fine */
    }
    if (where === "other") setOtherBusy(true);
    else setStatus("paying");
    // 21.10.2026: Meta Pixel — checkout started, with the amount to pay.
    trackMeta("InitiateCheckout", { value: Math.round(split.duePaise / 100), currency: "INR", content_name: pack?.label });
    setError(null);
    // Saved before PayU takes over the page; a failure here never stops the payment.
    if (askPhone && whatsappYes) await saveWhatsAppNumber({ phone, source: "checkout" }).catch(() => undefined);

    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const createRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers,
        body: JSON.stringify(
          SUPABASE_MOCK_MODE
            ? { userId: getMockUserId(), tier: validTier, useCredit }
            : { tier: validTier, phone: free ? undefined : phone, useCredit, campaign: currentCampaign() }
        ),
      });
      const createData = await createRes.json();
      if (createRes.status === 401) {
        if (createData.needsAccount) {
          // Shouldn't happen (the account box shows first), but never send them to /login and lose their photo.
          setStatus("idle");
          setOtherBusy(false);
          setError("Please create your account below to continue.");
          return;
        }
        window.location.assign(loginUrl(`/checkout?tier=${validTier}`));
        return;
      }
      // 20.10.2026: an earlier payment of theirs has just been confirmed — no second payment.
      if (createRes.status === 409 && createData.alreadyPaid && createData.orderId) {
        clearPendingPayment();
        router.push(`/results/${createData.orderId}`);
        return;
      }
      if (!createRes.ok) {
        if (createData.field === "phone") setPhoneError(true);
        throw new Error(createData.error || "Could not start checkout.");
      }

      const { orderId, razorpayOrderId, mockMode, payu } = createData;

      // Paid entirely with credit: nothing to pay, the order is already complete.
      if (createData.free) {
        router.push(`/results/${orderId}`);
        return;
      }

      if (mockMode) {
        const verifyRes = await fetch("/api/payment/verify", {
          method: "POST",
          headers,
          body: JSON.stringify({
            orderId,
            razorpayOrderId,
            razorpayPaymentId: `pay_mock_${Date.now()}`,
            razorpaySignature: "mock",
          }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed.");
        router.push(`/results/${orderId}`);
        return;
      }

      if (!payu?.action || !payu?.fields) throw new Error("Could not start the payment. Please try again.");
      savePendingPayment(orderId, validTier);

      if (where === "other") {
        const handoffRes = await fetch("/api/payment/handoff", {
          method: "POST",
          headers,
          body: JSON.stringify({ orderId, phone }),
        });
        const handoff = await handoffRes.json();
        if (!handoffRes.ok || !handoff.url) throw new Error(handoff.error || "Could not make the QR code. Please try again.");
        const qr = await QRCode.toDataURL(handoff.url, {
          margin: 1,
          width: 520,
          errorCorrectionLevel: "M",
          color: { dark: "#16261C", light: "#FFFFFF" },
        });
        setOther({ orderId, url: handoff.url, qr });
        setOtherBusy(false);
        return;
      }

      // Leaves this page for PayU's payment page; PayU brings the customer back.
      postToPayu(payu.action, payu.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong starting checkout.");
      setStatus("error");
      setOtherBusy(false);
    }
  }

  if (!validTier || !pack || !pnl) {
    return (
      <section className="wrap py-16">
        <div className="mx-auto max-w-[520px] text-center">
          <h1 className="mb-3 text-[26px]">We couldn&apos;t find that plan</h1>
          <p className="mb-6 text-[14.5px] text-ink-muted">
            Head back to pricing and choose Starter Pack or Style Pack — Full Explore isn&apos;t available for
            purchase yet.
          </p>
          <a href="/#pricing" className="btn-primary">
            Back to Pricing
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[480px]">
        <p className="eyebrow">Checkout</p>
        <h1 className="mb-6 text-[clamp(24px,4vw,32px)]">{pack.label}</h1>

        <div className="mb-6 rounded-lg2 border border-line bg-surface p-6">
          <div className="mb-4 flex items-baseline justify-between">
            <span className="text-[14.5px] text-ink-muted">
              {pack.imageCount} hairstyles on your own photo
            </span>
            <span className="font-heading text-[24px] font-bold text-ink-heading">
              ₹{paiseToRupees(pnl.pricePaise).split(".")[0]}
            </span>
          </div>
          {isEarlyBirdActive() && pack.regularPricePaise !== null && (
            <p className="mb-4 text-[12.5px] font-semibold text-mint-deep">
              Early Bird price applied — regular price is ₹{paiseToRupees(pack.regularPricePaise).split(".")[0]}
            </p>
          )}
          {balancePaise > 0 && (
            <label className="mb-4 flex cursor-pointer items-start gap-3 rounded-md2 bg-mint-pale/50 px-3.5 py-3">
              <input
                type="checkbox"
                checked={useCredit}
                onChange={(e) => setUseCredit(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-mint-deep"
              />
              <span className="text-[14px] leading-[1.45] text-ink-heading">
                <strong>Use my {rupees(balancePaise)} credit</strong>
                <span className="block text-[12.5px] text-ink-muted">
                  {useCredit
                    ? split.creditPaise < balancePaise
                      ? `${rupees(split.creditPaise)} goes toward this pack; ${rupees(balancePaise - split.creditPaise)} stays in your account.`
                      : "Your credit is taken only once your payment goes through."
                    : "Your credit stays in your account for later."}
                </span>
              </span>
            </label>
          )}
          <div className="flex flex-col gap-1.5 border-t border-line pt-4 text-[13px] text-ink-muted">
            {split.creditPaise > 0 && (
              <>
                <div className="flex justify-between">
                  <span>Price</span>
                  <span>₹{paiseToRupees(split.pricePaise)}</span>
                </div>
                <div className="flex justify-between text-mint-deep">
                  <span>Your credit</span>
                  <span>−₹{paiseToRupees(split.creditPaise)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between font-semibold text-ink-heading">
              <span>{GST_REGISTERED && split.duePaise > 0 ? "Total to pay (GST-inclusive)" : "Total to pay"}</span>
              <span>₹{paiseToRupees(split.duePaise)}</span>
            </div>
            {GST_REGISTERED && split.duePaise > 0 ? (
              <div className="flex justify-between">
                <span>Includes GST</span>
                <span>₹{paiseToRupees(gstOnDuePaise)}</span>
              </div>
            ) : (
              <p className="text-[12px]">
                {free ? "Covered in full by your credit. Nothing to pay." : "One-time payment. Nothing else is added."}
              </p>
            )}
          </div>
        </div>

        {cameBackFailed && !error && status === "idle" && (
          <div className="mb-5 rounded-sm2 bg-lilac/10 px-4 py-3 text-[13.5px] text-ink">
            Your payment didn&apos;t go through, and no money was taken. If money did leave your account, it is
            returned automatically by your bank. You can try again below.
          </div>
        )}

        {askPhone && !needsLogin && !needsAccount && (
          <label className="mb-5 block">
            <span className="mb-1.5 block text-[13.5px] font-semibold text-ink-heading">Mobile number</span>
            <input
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="10-digit mobile number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                if (phoneError) setPhoneError(!phoneOk(e.target.value));
              }}
              className={`w-full rounded-sm2 border bg-surface px-4 py-3 text-[15px] outline-none focus:border-mint-deep ${
                phoneError ? "border-danger" : "border-line"
              }`}
            />
            <span className={`mt-1.5 block text-[12px] ${phoneError ? "text-danger" : "text-ink-muted"}`}>
              {phoneError
                ? "Please enter a valid 10-digit mobile number."
                : "Our payment partner PayU needs it for the payment. We use it for nothing else unless you tick the box below."}
            </span>
          </label>
        )}
        {askPhone && !needsLogin && !needsAccount && (
          <label className="-mt-2 mb-5 flex items-start gap-2.5 text-[13px] leading-[1.45] text-ink-muted">
            <input
              type="checkbox"
              checked={whatsappYes}
              onChange={(e) => setWhatsappYes(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 accent-mint-deep"
            />
            <span>{WHATSAPP_CONSENT}</span>
          </label>
        )}

        {error && (
          <div className="mb-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[13.5px] font-medium text-danger">{error}</div>
        )}

        {needsAccount && validTier && <SaveAccount next={`/checkout?tier=${validTier}`} />}

        {needsAccount ? null : needsLogin ? (
          <a href={loginUrl(`/checkout?tier=${validTier}`)} className="btn-primary w-full">
            Log in to continue
          </a>
        ) : (
          <button
            className="btn-primary w-full"
            disabled={status === "paying" || otherBusy || sessionLoading}
            onClick={() => handlePay("here")}
          >
            {status === "paying"
              ? free
                ? "Completing your order…"
                : "Opening PayU…"
              : free
                ? "Get it with my credit"
                : `Pay ${rupees(split.duePaise)}`}
          </button>
        )}

        {/* 17.10.2026: for a phone with no UPI app — someone else pays by scanning a QR code. */}
        {!needsLogin && !needsAccount && askPhone && !other && (
          <button
            type="button"
            className="mt-3 w-full rounded-full border border-line bg-surface px-4 py-3 text-[14.5px] font-semibold text-ink-heading transition hover:border-ink-heading disabled:opacity-60"
            disabled={status === "paying" || otherBusy || sessionLoading}
            onClick={() => handlePay("other")}
          >
            {otherBusy ? "Making your QR code…" : "No UPI app on this phone? Pay from another phone"}
          </button>
        )}

        {other && (
          <div className="mt-5 rounded-lg2 border border-line bg-surface p-5 text-center">
            <p className="font-heading text-[18px] font-semibold text-ink-heading">Pay from another phone</p>
            <p className="mt-1.5 text-[13.5px] leading-[1.5] text-ink-muted">
              Ask someone to scan this with their phone&apos;s camera. PayU opens on their phone for this order, and they
              pay with their UPI app.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={other.qr} alt="QR code to pay from another phone" className="mx-auto mt-4 w-[240px] max-w-full rounded-md2" />
            <p className="mt-3 flex items-center justify-center gap-2 text-[13.5px] font-semibold text-mint-deep" role="status">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint-deep" />
              Waiting for the payment. This page moves on by itself.
            </p>
            {otherSlow && (
              <p className="mx-auto mt-3 max-w-[40ch] rounded-md2 bg-lilac/15 px-3 py-2 text-[13px] leading-[1.5] text-ink-heading">
                Already paid? UPI can take a few minutes to confirm. <strong>Please don&apos;t pay again.</strong> Your
                hairstyles open here, and under My hairstyles, as soon as PayU confirms.
              </p>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                className="rounded-full border border-line px-4 py-2 text-[13.5px] font-semibold text-ink-heading"
                onClick={async () => {
                  const text = `Please pay ${rupees(split.duePaise)} for my Tressform hairstyles: ${other.url}`;
                  try {
                    if (navigator.share) {
                      await navigator.share({ title: "Tressform payment", text });
                      return;
                    }
                  } catch {
                    return; // the customer closed the share sheet
                  }
                  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
                }}
              >
                Send the link instead
              </button>
              <button
                type="button"
                className="rounded-full border border-line px-4 py-2 text-[13.5px] font-semibold text-ink-heading"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(other.url);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2500);
                  } catch {
                    /* copying blocked: the share button still works */
                  }
                }}
              >
                {copied ? "Link copied" : "Copy link"}
              </button>
            </div>
            <p className="mt-3 text-[12px] text-ink-muted">The code works for 30 minutes and only for this order.</p>
            <button
              type="button"
              className="mt-3 text-[13px] font-semibold text-ink-muted underline underline-offset-4"
              onClick={() => setOther(null)}
            >
              Pay on this phone instead
            </button>
          </div>
        )}

        <p className="mt-4 text-center text-[12px] text-ink-muted">
          {free
            ? "Your credit pays for the whole pack, so there's no payment step."
            : "You'll pay on PayU's secure page (UPI, cards, net banking), then come straight back here."}{" "}
          See our{" "}
          <a href="/refund" className="font-semibold text-mint-deep">
            Refund and Cancellation Policy
          </a>{" "}
          for details.
        </p>
      </div>
    </section>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutContent />
    </Suspense>
  );
}
