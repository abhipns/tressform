// /checkout — closes the doc's top-priority checkout gap: Pricing.tsx's
// tier CTAs used to link to #upload (the free demo), with no way to
// actually buy a pack. Reads ?tier=STARTER|STYLE, shows the exact price
// breakdown from lib/pricing.ts (the same module the server uses to price
// the order — see api/payment/create-order/route.ts), and drives payment
// through Razorpay (mock-mode aware, per lib/integrations/razorpay.ts).
//
// In mock mode there's no real Razorpay widget to open (no real key), so
// "Pay" completes the order immediately against /api/payment/verify, which
// accepts any signature while RAZORPAY_MOCK_MODE is true — enough to walk
// the full create → pay → results journey end-to-end in dev/demo.
//
// Reuses the same per-browser demo user id UploadFlow.tsx already
// establishes (tressform_mock_user_id), so a single demo session's free
// previews, generations, and purchases all tie back to one identity.

"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PACK_TIERS, calculatePackPnl, paiseToRupees, type PackTier, isEarlyBirdActive } from "@/lib/pricing";

const SELLABLE_TIERS: PackTier[] = ["STARTER", "STYLE"];

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function getUserId(): string {
  if (typeof window === "undefined") return "ssr-user";
  const existing = window.localStorage?.getItem("tressform_mock_user_id");
  if (existing) return existing;
  const id = `demo_${Math.random().toString(36).slice(2, 10)}`;
  try {
    window.localStorage?.setItem("tressform_mock_user_id", id);
  } catch {
    /* private browsing / storage blocked — fine, just not persisted */
  }
  return id;
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tierParam = (searchParams.get("tier") || "").toUpperCase() as PackTier;

  const [status, setStatus] = useState<"idle" | "paying" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const validTier = SELLABLE_TIERS.includes(tierParam) ? tierParam : null;

  const pnl = useMemo(() => (validTier ? calculatePackPnl(validTier) : null), [validTier]);
  const pack = validTier ? PACK_TIERS[validTier] : null;

  async function handlePay() {
    if (!validTier) return;
    setStatus("paying");
    setError(null);

    try {
      const userId = getUserId();
      const createRes = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, tier: validTier }),
      });
      const createData = await createRes.json();
      if (!createRes.ok) throw new Error(createData.error || "Could not start checkout.");

      const { orderId, razorpayOrderId, amountPaise, keyId, mockMode } = createData;

      if (mockMode) {
        const verifyRes = await fetch("/api/payment/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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

      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) throw new Error("Could not load the payment widget. Check your connection and try again.");

      const rzp = new window.Razorpay({
        key: keyId,
        amount: amountPaise,
        currency: "INR",
        name: "Tressform",
        description: pack?.label,
        order_id: razorpayOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            const verifyRes = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed.");
            router.push(`/results/${orderId}`);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong confirming your payment.");
            setStatus("error");
          }
        },
        modal: {
          ondismiss: () => setStatus("idle"),
        },
        theme: { color: "#1f5a45" },
      });
      rzp.open();
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
              {pack.imageCount} hairstyle results, full resolution
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
              <span>Price (GST-inclusive)</span>
              <span>₹{paiseToRupees(pnl.pricePaise)}</span>
            </div>
            <div className="flex justify-between">
              <span>Includes GST</span>
              <span>₹{paiseToRupees(pnl.gstPaise)}</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[13.5px] font-medium text-danger">{error}</div>
        )}

        <button className="btn-primary w-full" disabled={status === "paying"} onClick={handlePay}>
          {status === "paying" ? "Processing…" : `Pay ₹${paiseToRupees(pnl.pricePaise).split(".")[0]}`}
        </button>

        <p className="mt-4 text-center text-[12px] text-ink-muted">
          Payments are processed securely by Razorpay. See our{" "}
          <a href="/refund" className="font-semibold text-mint-deep">
            Refund Policy
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
