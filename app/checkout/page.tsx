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

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GST_REGISTERED,
  PACK_TIERS,
  calculatePackPnl,
  paiseToRupees,
  type PackTier,
  isEarlyBirdActive,
} from "@/lib/pricing";
import { SUPABASE_MOCK_MODE, authHeaders, getMockUserId, loginUrl, useSession } from "@/lib/authClient";

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
  const [error, setError] = useState<string | null>(null);
  const { session, loading: sessionLoading } = useSession();
  const needsLogin = !SUPABASE_MOCK_MODE && !sessionLoading && !session;
  const askPhone = !SUPABASE_MOCK_MODE;
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState(false);

  // Remember the number on this device only, so a second purchase is one tap.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(PHONE_KEY);
      if (saved) setPhone(saved);
    } catch {
      /* private window: nothing remembered */
    }
  }, []);

  const validTier = SELLABLE_TIERS.includes(tierParam) ? tierParam : null;

  const pnl = useMemo(() => (validTier ? calculatePackPnl(validTier) : null), [validTier]);
  const pack = validTier ? PACK_TIERS[validTier] : null;

  async function handlePay() {
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
    setStatus("paying");
    setError(null);

    try {
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      const createRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers,
        body: JSON.stringify(SUPABASE_MOCK_MODE ? { userId: getMockUserId(), tier: validTier } : { tier: validTier, phone }),
      });
      const createData = await createRes.json();
      if (createRes.status === 401) {
        window.location.assign(loginUrl(`/checkout?tier=${validTier}`));
        return;
      }
      if (!createRes.ok) {
        if (createData.field === "phone") setPhoneError(true);
        throw new Error(createData.error || "Could not start checkout.");
      }

      const { orderId, razorpayOrderId, mockMode, payu } = createData;

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
      // Leaves this page for PayU's payment page; PayU brings the customer back.
      postToPayu(payu.action, payu.fields);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong starting checkout.");
      setStatus("error");
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
          <div className="flex flex-col gap-1.5 border-t border-line pt-4 text-[13px] text-ink-muted">
            <div className="flex justify-between">
              <span>{GST_REGISTERED ? "Price (GST-inclusive)" : "Total to pay"}</span>
              <span>₹{paiseToRupees(pnl.pricePaise)}</span>
            </div>
            {GST_REGISTERED ? (
              <div className="flex justify-between">
                <span>Includes GST</span>
                <span>₹{paiseToRupees(pnl.gstPaise)}</span>
              </div>
            ) : (
              <p className="text-[12px]">One-time payment. Nothing else is added.</p>
            )}
          </div>
        </div>

        {cameBackFailed && !error && status === "idle" && (
          <div className="mb-5 rounded-sm2 bg-lilac/10 px-4 py-3 text-[13.5px] text-ink">
            Your payment didn&apos;t go through, and no money was taken. If money did leave your account, it is
            returned automatically by your bank. You can try again below.
          </div>
        )}

        {askPhone && !needsLogin && (
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
                : "Our payment partner PayU needs it for the payment. We don't use it for anything else."}
            </span>
          </label>
        )}

        {error && (
          <div className="mb-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[13.5px] font-medium text-danger">{error}</div>
        )}

        {needsLogin ? (
          <a href={loginUrl(`/checkout?tier=${validTier}`)} className="btn-primary w-full">
            Log in to continue
          </a>
        ) : (
          <button className="btn-primary w-full" disabled={status === "paying" || sessionLoading} onClick={handlePay}>
            {status === "paying" ? "Opening PayU…" : `Pay ₹${paiseToRupees(pnl.pricePaise).split(".")[0]}`}
          </button>
        )}

        <p className="mt-4 text-center text-[12px] text-ink-muted">
          You&apos;ll pay on PayU&apos;s secure page (UPI, cards, net banking), then come straight back here. See our{" "}
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
