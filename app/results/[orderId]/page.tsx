// /results/[orderId] — the page checkout redirects to after a successful
// payment. Closes the other half of the doc's checkout gap: confirms the
// order, then hands off into ProductRecommendations.tsx (doc row 11,
// "Personalised Product Recommendations") — that component was built
// earlier per the doc's exact copy but deliberately not imported into
// app/page.tsx since it's a post-payment screen, not a homepage section.
// This is the page it was always meant to be dropped into.
//
// 12.10.2026 (PayU): PayU sends the customer here after paying. If the
// payment isn't confirmed yet (UPI can take a moment), the page checks again
// every few seconds for about a minute — the server asks PayU each time —
// instead of telling the customer to refresh. A failed payment says so
// plainly and offers to try again.
//
// 26.10.2026 (single pictures): an order for pictures of one hairstyle shows
// those pictures here, made as the page opens (components/PictureResult.tsx).

"use client";

import { useEffect, useState } from "react";
import { paiseToRupees } from "@/lib/pricing";
import { SUPABASE_MOCK_MODE, authHeaders, loginUrl } from "@/lib/authClient";
import { trackPurchaseOnce } from "@/lib/metaPixel";
import PictureResult, { type PictureOrderSummary } from "@/components/PictureResult";

interface OrderSummary {
  id: string;
  status: string;
  tier: string | null;
  tierLabel: string | null;
  imageCount: number;
  pricePaise: number;
  /** 14.10.2026: Tressform credit put toward the order (pricePaise is what was charged). */
  creditUsedPaise?: number;
  gstPaise: number;
  referralCreditsPaise: number;
  paidAt: string | null;
  /** 26.10.2026: set for single-picture orders. */
  pictures?: PictureOrderSummary | null;
}

/** Where "Try again" goes: the same pack, or the same pictures. */
function retryLink(order: OrderSummary): string {
  const p = order.pictures;
  if (p) {
    const views = p.bought.length === 4 ? "all" : p.bought.join(",");
    return `/checkout?style=${encodeURIComponent(p.styleId)}&photo=${encodeURIComponent(p.photoId ?? "")}&views=${views}`;
  }
  return `/checkout?tier=${order.tier ?? ""}`;
}

export default function ResultsPage({ params }: { params: { orderId: string } }) {
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checks, setChecks] = useState(0);
  const MAX_CHECKS = 12; // about a minute at 5 seconds apart

  // 21.10.2026: Meta Pixel — a confirmed payment, once per order on this device.
  useEffect(() => {
    if (order?.status === "PAID" && !SUPABASE_MOCK_MODE) trackPurchaseOnce(order.id, Math.round((order.pricePaise ?? 0) / 100), order.tierLabel ?? (order.pictures ? "Single pictures" : null));
  }, [order]);

  // Still waiting for PayU: check again shortly.
  useEffect(() => {
    if (!order || order.status !== "CREATED" || checks >= MAX_CHECKS) return;
    const t = window.setTimeout(() => setChecks((c) => c + 1), 5000);
    return () => window.clearTimeout(t);
  }, [order, checks]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // 09.10.2026: orders are private to their owner once a real database
        // is connected, so send the login token and bounce to /login without one.
        const res = await fetch(`/api/payment/order/${params.orderId}`, { headers: await authHeaders() });
        const data = await res.json();
        if (res.status === 401) {
          window.location.assign(loginUrl(`/results/${params.orderId}`));
          return;
        }
        if (!res.ok) throw new Error(data.error || "Order not found.");
        if (!cancelled) setOrder(data.order);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your order.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.orderId, checks]);

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

  if (order.status === "FAILED") {
    return (
      <section className="wrap py-16">
        <div className="mx-auto max-w-[480px] text-center">
          <h1 className="mb-3 text-[24px]">The payment didn&apos;t go through</h1>
          <p className="mb-6 text-[14.5px] text-ink-muted">
            No hairstyles were added and no money was taken. If money did leave your account, your bank returns it
            automatically within a few working days.
          </p>
          <a href={retryLink(order)} className="btn-primary">
            Try again
          </a>
        </div>
      </section>
    );
  }

  if (order.status !== "PAID") {
    const stillChecking = checks < MAX_CHECKS;
    return (
      <section className="wrap py-16">
        <div className="mx-auto max-w-[480px] text-center">
          {stillChecking && (
            <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
          )}
          <h1 className="mb-3 text-[24px]">{stillChecking ? "Confirming your payment…" : "Payment not confirmed yet"}</h1>
          <p className="mb-6 text-[14.5px] text-ink-muted">
            {stillChecking
              ? "This usually takes a few seconds. Please keep this page open."
              : "We haven't heard from the bank yet. If you paid, your hairstyles are added automatically as soon as it confirms — come back to this page in a few minutes. If you didn't finish paying, you can try again."}
          </p>
          {!stillChecking && (
            <div className="flex flex-col items-center gap-3">
              <button className="btn-primary" onClick={() => setChecks(0)}>
                Check again
              </button>
              <a href={retryLink(order)} className="text-[13.5px] font-semibold text-mint-deep">
                Try the payment again
              </a>
            </div>
          )}
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
          {order.pictures ? (
            <p className="mb-6 text-[14.5px] text-ink-muted">
              Your pictures of {order.pictures.styleName ?? "this hairstyle"} are being made below. Keep this page open.
            </p>
          ) : (
            <>
              <p className="mb-6 text-[14.5px] text-ink-muted">
                {order.tierLabel}: {order.imageCount} hairstyles have been added to your account. Use them on any
                style from your list.
              </p>
              <a href="/#upload" className="btn-primary mb-7">
                Continue to my hairstyles
              </a>
              <br />
            </>
          )}
          <div className="mx-auto mb-2 inline-flex gap-6 rounded-md2 border border-line bg-surface px-6 py-3 text-[13px] text-ink-muted">
            <span>
              {order.pricePaise > 0 || !order.creditUsedPaise ? (
                <>
                  Paid <strong className="text-ink-heading">₹{paiseToRupees(order.pricePaise).split(".")[0]}</strong>
                  {order.gstPaise > 0 ? " (GST incl.)" : ""}
                  {order.creditUsedPaise ? (
                    <> + ₹{paiseToRupees(order.creditUsedPaise).split(".")[0]} credit</>
                  ) : null}
                </>
              ) : (
                <>
                  Paid with <strong className="text-ink-heading">₹{paiseToRupees(order.creditUsedPaise).split(".")[0]}</strong> credit
                </>
              )}
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

      {order.pictures && (
        <div className="mt-8">
          <PictureResult orderId={order.id} pictures={order.pictures} />
        </div>
      )}

      {/* 12.10.2026: the made-up "Tressform" products that stood here are gone.
          Care tips and real product picks are on each hairstyle card now. */}
      <section className="wrap pb-16">
        <div className="mx-auto max-w-[720px] rounded-[16px] bg-bg-soft p-5 text-center">
          <p className="text-[15.5px] font-semibold text-ink-heading">Looking after your new cut</p>
          <p className="mt-1.5 text-[14.5px] leading-[1.55]">
            Each hairstyle card has wash and styling tips for that cut. See the{" "}
            <a href="/haircare" className="font-semibold text-mint-deep">
              Hair care
            </a>{" "}
            page for more.
          </p>
        </div>
      </section>
    </>
  );
}
