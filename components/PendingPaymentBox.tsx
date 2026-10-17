"use client";

// "Your payment wasn't completed" (17.10.2026, owner). After pressing Back on
// PayU's page without paying, the customer lands on their hairstyles again
// and had no clear way to carry on paying. When this tab started a payment
// (lib/pendingPayment.ts) and that order is still unpaid, this box offers
// "Continue to payment" with the same pack, or another pack. Once the order
// is paid it disappears for good.

import { useCallback, useEffect, useState } from "react";
import { authHeaders } from "@/lib/authClient";
import { PACK_TIERS, getCurrentPackPricePaise, paiseToRupees, type PackTier } from "@/lib/pricing";
import { clearPendingPayment, readPendingPayment, type PendingPayment } from "@/lib/pendingPayment";

export default function PendingPaymentBox() {
  const [pending, setPending] = useState<PendingPayment | null>(null);

  const check = useCallback(async () => {
    const saved = readPendingPayment();
    if (!saved || !(saved.tier in PACK_TIERS)) {
      setPending(null);
      return;
    }
    try {
      const res = await fetch(`/api/payment/order/${saved.orderId}`, { headers: await authHeaders(), cache: "no-store" });
      if (res.status === 404) {
        clearPendingPayment();
        setPending(null);
        return;
      }
      const data = await res.json();
      const status = data?.order?.status;
      if (status === "PAID" || status === "REFUNDED") {
        clearPendingPayment();
        setPending(null);
        return;
      }
      setPending(saved);
    } catch {
      // Can't tell right now: offering to continue is still the helpful thing.
      setPending(saved);
    }
  }, []);

  useEffect(() => {
    void check();
    // Back from PayU can bring this page back from the browser's memory.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) void check();
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, [check]);

  if (!pending) return null;
  const tier = pending.tier as PackTier;
  const rupees = paiseToRupees(getCurrentPackPricePaise(tier)).split(".")[0];

  return (
    <div className="mt-5 rounded-[20px] border-[1.5px] border-lilac/70 bg-lilac/10 p-4 sm:p-5" role="status">
      <p className="text-[17px] font-semibold leading-tight text-ink-heading">Your payment wasn&apos;t completed</p>
      <p className="mt-1.5 text-[14.5px] leading-[1.5] text-ink-body">No money was taken. Your hairstyles are saved.</p>
      <a href={`/checkout?tier=${tier}`} className="btn-primary mt-4 w-full">
        Continue to payment · ₹{rupees}
      </a>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="text-[14px] font-semibold text-mint-deep underline decoration-mint/40 underline-offset-4"
          onClick={() => {
            const packs = document.getElementById("get-previews");
            if (packs) packs.scrollIntoView({ behavior: "smooth", block: "start" });
            else window.location.assign("/#pricing");
          }}
        >
          Choose a different pack
        </button>
        <button
          type="button"
          className="text-[13px] text-ink-muted underline underline-offset-4"
          onClick={() => {
            clearPendingPayment();
            setPending(null);
          }}
        >
          Not now
        </button>
      </div>
    </div>
  );
}
