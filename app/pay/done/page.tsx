// /pay/done — where PayU sends the other phone after "Pay from another
// phone" (17.10.2026; see lib/payHandoff.ts and /api/payment/payu-return).

import Link from "next/link";

const TEXT: Record<string, { title: string; body: string }> = {
  paid: { title: "Payment done, thank you", body: "The hairstyles are ready on the other phone now. You can close this page." },
  failed: {
    title: "The payment didn't go through",
    body: "No money was taken. If money did leave the account, the bank returns it automatically. Scan the QR code again to try once more.",
  },
  pending: {
    title: "Payment is being confirmed",
    body: "UPI can take a minute. The other phone moves on by itself once it is confirmed. You can close this page.",
  },
};

export default function PayDonePage({ searchParams }: { searchParams: { s?: string } }) {
  const t = TEXT[searchParams.s ?? ""] ?? TEXT.pending;
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[440px] text-center">
        <p className="eyebrow">Tressform payment</p>
        <h1 className="mb-3 mt-2 text-[26px]">{t.title}</h1>
        <p className="mb-8 text-[15px] text-ink-muted">{t.body}</p>
        <Link href="/" className="btn-secondary">
          See what Tressform does
        </Link>
      </div>
    </section>
  );
}
