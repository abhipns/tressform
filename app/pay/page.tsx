// /pay?t=… — "Pay from another phone" (17.10.2026; see lib/payHandoff.ts).
//
// Opened on someone else's phone by scanning the QR code on the customer's
// checkout page. It shows what is being paid and one button that opens
// PayU's payment page for that order (UPI apps, cards, net banking). No
// login is needed: the signed link is the permission, and it pays for that
// one unpaid order only.

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { paiseToRupees } from "@/lib/pricing";

type Loaded =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "done"; paid: boolean }
  | { kind: "ready"; amountPaise: number; packLabel: string; action: string; fields: Record<string, string> };

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

function PayContent() {
  const token = useSearchParams().get("t");
  const [state, setState] = useState<Loaded>({ kind: "loading" });
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    // Coming back here with the Back button: the button works again.
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) setOpening(false);
    };
    window.addEventListener("pageshow", onShow);
    return () => window.removeEventListener("pageshow", onShow);
  }, []);

  useEffect(() => {
    if (!token) {
      setState({ kind: "error", message: "This payment link is incomplete. Please scan the QR code again." });
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/payment/handoff?t=${encodeURIComponent(token)}`, { cache: "no-store" });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) return setState({ kind: "error", message: data.error || "We couldn't open this payment." });
        if (data.status !== "CREATED") return setState({ kind: "done", paid: data.status === "PAID" });
        setState({
          kind: "ready",
          amountPaise: data.amountPaise,
          packLabel: data.packLabel,
          action: data.payu.action,
          fields: data.payu.fields,
        });
      } catch {
        if (!cancelled) setState({ kind: "error", message: "We couldn't open this payment. Please check your connection and try again." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[440px] text-center">
        <p className="eyebrow">Tressform payment</p>
        {state.kind === "loading" && <p className="mt-4 text-[15px] text-ink-muted">Opening the payment…</p>}
        {state.kind === "error" && (
          <>
            <h1 className="mb-3 mt-2 text-[26px]">This link can&apos;t be used</h1>
            <p className="text-[15px] text-ink-muted">{state.message}</p>
          </>
        )}
        {state.kind === "done" && (
          <>
            <h1 className="mb-3 mt-2 text-[26px]">{state.paid ? "Already paid" : "This payment is closed"}</h1>
            <p className="text-[15px] text-ink-muted">
              {state.paid
                ? "This order has been paid. Nothing more to do here."
                : "Ask for a new QR code on the checkout page to try again."}
            </p>
          </>
        )}
        {state.kind === "ready" && (
          <>
            <h1 className="mb-2 mt-2 text-[26px]">Pay ₹{paiseToRupees(state.amountPaise).split(".")[0]}</h1>
            <p className="mb-6 text-[15px] text-ink-muted">
              For a Tressform {state.packLabel}, on behalf of the person who showed you this code.
            </p>
            <button
              className="btn-primary w-full"
              disabled={opening}
              onClick={() => {
                setOpening(true);
                postToPayu(state.action, state.fields);
              }}
            >
              {opening ? "Opening PayU…" : `Pay ₹${paiseToRupees(state.amountPaise).split(".")[0]} on PayU`}
            </button>
            <p className="mt-4 text-[12.5px] text-ink-muted">
              PayU&apos;s secure page opens: UPI apps, cards or net banking. Their screen moves on by itself once it&apos;s paid.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default function PayPage() {
  return (
    <Suspense fallback={null}>
      <PayContent />
    </Suspense>
  );
}
