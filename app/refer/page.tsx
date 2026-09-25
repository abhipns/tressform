// /refer — built per the "Build all of them" decision on the placeholder
// nav-link pages (Header menu's "Refer & Earn" link, currently href="#").
//
// Pulls the real numbers straight from lib/pricing.ts (flat, capped,
// non-cash referral credits — resolved via doc comments 21.09.2026 and the
// ₹15,000/FY cap) rather than restating them as separate copy that could
// drift out of sync. No referral code / dashboard wiring yet (that needs a
// logged-in user + a real backend), so this is the marketing/explainer page
// only, matching the honesty pattern used elsewhere for not-yet-built
// pieces.

import { REFERRAL_CREDITS_BY_TIER_PAISE, REFERRAL_ANNUAL_CAP_PAISE, paiseToRupees } from "@/lib/pricing";

const TIER_LABELS: Record<keyof typeof REFERRAL_CREDITS_BY_TIER_PAISE, string> = {
  STARTER: "Starter Pack",
  STYLE: "Style Pack",
  FULL_EXPLORE: "Full Explore",
};

const STEPS = [
  {
    title: "Share your link",
    body: "Once you're logged in, you'll get a personal referral link to share with friends.",
  },
  {
    title: "They make their first purchase",
    body: "You earn a credit the moment someone you referred completes their first paid pack purchase.",
  },
  {
    title: "Credit lands in your account",
    body: "Use it toward your own future Tressform packs — it's a Tressform credit, not cash, and isn't withdrawable.",
  },
];

export default function ReferPage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px]">
        <p className="eyebrow">Refer & Earn</p>
        <h1 className="mb-4 text-[clamp(26px,4vw,36px)]">Share Tressform, earn credits</h1>
        <p className="mb-9 text-[15px] leading-[1.6] text-ink-body">
          When someone you refer makes their first purchase, you earn a flat Tressform credit — no math, no tiers to
          climb, no waiting on their spend.
        </p>

        <div className="mb-9 grid gap-4 sm:grid-cols-3">
          {(Object.keys(REFERRAL_CREDITS_BY_TIER_PAISE) as Array<keyof typeof REFERRAL_CREDITS_BY_TIER_PAISE>).map((tier) => (
            <div key={tier} className="rounded-lg2 border border-line bg-surface p-5 text-center">
              <p className="mb-1 text-[12px] font-bold uppercase tracking-[.03em] text-ink-muted">
                {TIER_LABELS[tier]}
              </p>
              <p className="text-[22px] font-bold text-mint-deep">
                {paiseToRupees(REFERRAL_CREDITS_BY_TIER_PAISE[tier])}
              </p>
              <p className="text-[12.5px] text-ink-muted">credit</p>
            </div>
          ))}
        </div>

        <div className="mb-9 flex flex-col gap-6">
          {STEPS.map((s, i) => (
            <div key={s.title} className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint-pale text-[13px] font-bold text-mint-deep">
                {i + 1}
              </div>
              <div>
                <h3 className="mb-1 text-[15px] font-semibold text-ink-heading">{s.title}</h3>
                <p className="text-[14px] leading-[1.6] text-ink-body">{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-md2 border border-line bg-bg-soft p-4 text-[13px] leading-[1.6] text-ink-muted">
          Credits are non-cash, non-withdrawable, and capped at {paiseToRupees(REFERRAL_ANNUAL_CAP_PAISE)} per
          referrer per financial year (1 April – 31 March). Full details are in our{" "}
          <a href="/terms" className="font-semibold text-mint-deep">
            Terms of Service
          </a>
          .
        </div>

        <p className="mt-8 text-center text-[14px] text-ink-muted">
          <a href="/login" className="font-semibold text-mint-deep">
            Log in or create an account
          </a>{" "}
          to get your referral link.
        </p>
      </div>
    </section>
  );
}
