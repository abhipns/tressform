// /results/[orderId] — the page checkout redirects to after a successful
// payment. Closes the other half of the doc's checkout gap: confirms the
// order, then hands off into ProductRecommendations.tsx (doc row 11,
// "Personalised Product Recommendations") — that component was built
// earlier per the doc's exact copy but deliberately not imported into
// app/page.tsx since it's a post-payment screen, not a homepage section.
// This is the page it was always meant to be dropped into.

"use client";

import { useEffect, useState } from "react";
import ProductRecommendations from "@/components/results/ProductRecommendations";
import { paiseToRupees } from "@/lib/pricing";

interface OrderSummary {
  id: string;
  status: string;
  tier: string | null;
  tierLabel: string | null;
  imageCount: number;
  pricePaise: number;
  gstPaise: number;
  referralCreditsPaise: number;
  paidAt: string | null;
}

export default function ResultsPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/payment/order/${params.orderId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Order not found.");
        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your order.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.orderId]);

  if (error) {
    return (
      <section className="wrap py-16">
        <div className="mx-auto max-w-[480px] text-center">
          <h1 className="mb-3 text-[24px]">We couldn&apos;t find that order</h1>
          <p className="mb-6 text-[14.5px] text-ink-muted">{error}</p>
          <a href="/" className="btn-primary">
            Back to Tressform
          </a>
        </div>
      </section>
    );
  }

  if (!order) {
    return (
      <section className="wrap py-16 text-center">
        <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
        <p className="text-[14px] text-ink-muted">Loading your order…</p>
      </section>
    );
  }

  if (order.status !== "PAID") {
    return (
      <section className="wrap py-16">
        <div className="mx-auto max-w-[480px] text-center">
          <h1 className="mb-3 text-[24px]">Payment not confirmed yet</h1>
          <p className="mb-6 text-[14.5px] text-ink-muted">
            This order is still showing as &ldquo;{order.status}&rdquo;. If you completed payment, give it a moment
            and refresh — otherwise, head back and try again.
          </p>
          <a href="/#pricing" className="btn-primary">
            Back to Pricing
          </a>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="wrap py-16 pb-0">
        <div className="mx-auto max-w-[560px] text-center">
          <span className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-mint-pale text-[20px]">
            ✓
          </span>
          <h1 className="mb-2 text-[clamp(24px,4vw,30px)]">Payment confirmed</h1>
          <p className="mb-6 text-[14.5px] text-ink-muted">
            {order.tierLabel} — {order.imageCount} hairstyle results unlocked at full resolution.
          </p>
          <div className="mx-auto mb-2 inline-flex gap-6 rounded-md2 border border-line bg-surface px-6 py-3 text-[13px] text-ink-muted">
            <span>
              Paid <strong className="text-ink-heading">₹{paiseToRupees(order.pricePaise).split(".")[0]}</strong>{" "}
              (GST incl.)
            </span>
            <span>
              Order <strong className="text-ink-heading">{order.id.slice(0, 8)}</strong>
            </span>
          </div>
          {order.referralCreditsPaise > 0 && (
            <p className="mt-3 text-[12.5px] text-mint-deep">
              Your referrer just earned ₹{paiseToRupees(order.referralCreditsPaise).split(".")[0]} in Tressform
              credits from this purchase.
            </p>
          )}
        </div>
      </section>

      <ProductRecommendations />
    </>
  );
}
