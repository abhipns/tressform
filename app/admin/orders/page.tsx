"use client";

// /admin/orders — paid and refunded orders, with "Mark as refunded"
// (14.10.2026). OWNER ONLY. Refund the money in the PayU dashboard (find it
// by the PayU id shown here), then mark it here so the credit goes back,
// unused looks stop and the dashboard is corrected — see lib/refunds.ts.
//
// 26.10.2026: single-picture orders too — the hairstyle and the views
// bought, and any picture that failed 3 times or was paid for twice, with
// "Mark this picture refunded" once its price is refunded in PayU.

import { useEffect, useState } from "react";
import OwnerGate from "@/components/admin/OwnerGate";
import { authHeaders } from "@/lib/authClient";
import { PACK_TIERS, PICTURE_PRICE_PAISE, type PackTier, type PictureView } from "@/lib/pricing";
import { rupees } from "@/lib/stats";

interface Order {
  id: string;
  tier: string | null;
  price_paise: number;
  credit_used_paise: number;
  status: "PAID" | "REFUNDED";
  paid_at: string | null;
  created_at: string;
  preview_count: number;
  previews_used: number;
  email: string | null;
  txnid: string | null;
  /** 26.10.2026: single pictures. */
  order_kind?: "PACK" | "PICTURES";
  style_name?: string | null;
  picture_views?: PictureView[];
  problems?: { view: PictureView; status: "REFUND_DUE" | "DUPLICATE" | "REFUNDED"; failures: number }[];
}

const VIEW_NAME: Record<PictureView, string> = { front: "Front", left: "Left side", right: "Right side", back: "Back" };
const PROBLEM: Record<string, string> = {
  REFUND_DUE: "couldn't be made (failed 3 times)",
  DUPLICATE: "was paid for twice",
  REFUNDED: "refunded",
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

function Orders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null);

  async function load() {
    const res = await fetch("/api/admin/orders", { headers: await authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setOrders(data.orders ?? []);
    else setError(data.error ?? "Couldn't load the orders.");
  }
  useEffect(() => {
    void load();
  }, []);

  async function refund(o: Order) {
    const ok = window.confirm(
      `Mark this order as refunded?\n\n${o.email ?? "Customer"} · ${rupees(o.price_paise)}\n\n` +
        "This does NOT send money back — refund it in the PayU dashboard yourself. " +
        "Here it returns any credit they used, stops their unused looks, takes back credit a referrer earned from it, and corrects your dashboard. It can't be undone."
    );
    if (!ok) return;
    setBusy(o.id);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ orderId: o.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setNotice({ id: o.id, text: data.error ?? "That didn't work. Please try again." });
        return;
      }
      const parts = ["Marked as refunded."];
      if (data.creditReturnedPaise > 0) parts.push(`${rupees(data.creditReturnedPaise)} credit returned to the customer.`);
      if (data.referralTakenBackPaise > 0) parts.push(`${rupees(data.referralTakenBackPaise)} taken back from their referrer.`);
      if (data.referralShortPaise > 0) parts.push(`The referrer had already spent ${rupees(data.referralShortPaise)} of it.`);
      setNotice({ id: o.id, text: parts.join(" ") });
      await load();
    } finally {
      setBusy(null);
    }
  }

  // 26.10.2026: one picture of a single-picture order.
  async function refundPicture(o: Order, view: PictureView) {
    const ok = window.confirm(
      `Mark the ${VIEW_NAME[view].toLowerCase()} picture as refunded?\n\n` +
        `Refund ${rupees(PICTURE_PRICE_PAISE[view])} in the PayU dashboard yourself first (PayU id ${o.txnid ?? "—"}). This only records it here.`
    );
    if (!ok) return;
    setBusy(`${o.id}:${view}`);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ orderId: o.id, view }),
      });
      const data = await res.json().catch(() => ({}));
      setNotice({ id: o.id, text: res.ok ? `${VIEW_NAME[view]} picture marked as refunded.` : data.error ?? "That didn't work. Please try again." });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  }

  if (error) return <p className="text-[15px] text-danger">{error}</p>;
  if (!orders) return <p className="text-[15px] text-ink-muted">Loading…</p>;

  return (
    <div>
      <h1 className="text-[26px] font-semibold">Orders</h1>
      <p className="mt-1 max-w-[62ch] text-[14.5px] leading-[1.5] text-ink-muted">
        Refund the money in the PayU dashboard (search for the PayU id), then press <strong>Mark as refunded</strong> here.
      </p>
      {orders.length === 0 && <p className="mt-6 text-[15px] text-ink-muted">No paid orders yet.</p>}
      <ul className="mt-6 flex flex-col gap-3">
        {orders.map((o) => (
          <li key={o.id} className="rounded-[16px] bg-surface p-4 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[15.5px] font-semibold text-ink-heading">
                  {o.order_kind === "PICTURES"
                    ? `Single pictures · ${o.style_name ?? "hairstyle"}`
                    : o.tier && o.tier in PACK_TIERS
                      ? PACK_TIERS[o.tier as PackTier].label
                      : "Add-on"}{" "}
                  · {rupees(o.price_paise)}
                  {o.credit_used_paise > 0 && <span className="font-normal text-ink-muted"> + {rupees(o.credit_used_paise)} credit</span>}
                </p>
                <p className="mt-0.5 text-[13.5px] text-ink-muted">
                  {o.email ?? "—"} · paid {when(o.paid_at ?? o.created_at)} ·{" "}
                  {o.order_kind === "PICTURES"
                    ? (o.picture_views ?? []).map((v) => VIEW_NAME[v]).join(", ")
                    : `looks ${o.previews_used}/${o.preview_count}`}
                </p>
                {o.txnid && <p className="mt-0.5 text-[12.5px] text-ink-muted">PayU id: {o.txnid}</p>}
              </div>
              {o.status === "REFUNDED" ? (
                <span className="rounded-full bg-bg-soft px-3 py-1 text-[13px] font-semibold text-ink-muted">Refunded</span>
              ) : (
                <button
                  type="button"
                  className="btn-secondary !px-4 !py-2 !text-[14px]"
                  disabled={busy === o.id}
                  onClick={() => refund(o)}
                >
                  {busy === o.id ? "Working…" : "Mark as refunded"}
                </button>
              )}
            </div>
            {(o.problems ?? []).map((p) => (
              <div key={p.view} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-sm2 bg-lilac/15 px-3 py-2 text-[13.5px]">
                <span className="text-ink-heading">
                  <strong>{VIEW_NAME[p.view]}</strong> {PROBLEM[p.status]}
                  {p.status !== "REFUNDED" && <> · refund {rupees(PICTURE_PRICE_PAISE[p.view])} in PayU</>}
                </span>
                {p.status !== "REFUNDED" && o.status !== "REFUNDED" && (
                  <button
                    type="button"
                    className="btn-secondary !px-3 !py-1.5 !text-[13px]"
                    disabled={busy === `${o.id}:${p.view}`}
                    onClick={() => refundPicture(o, p.view)}
                  >
                    Mark this picture refunded
                  </button>
                )}
              </div>
            ))}
            {notice?.id === o.id && <p className="mt-2 text-[13.5px] text-ink-heading">{notice.text}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <OwnerGate title="Orders" path="/admin/orders">
      <Orders />
    </OwnerGate>
  );
}
