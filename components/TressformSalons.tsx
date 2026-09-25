// Master Section Plan doc, row 17 "Get Your Tressform Look at a Matching
// Salon" — reworked per that row's core content to introduce "Style Match":
// hairstyle → required technique → matching salon, rather than a generic
// "find a salon nearby" tease. Still front-end only: the actual matching
// depends on Part M's salon onboarding backend (hair specialities collected
// as structured tags — see db/schema.sql's salons/stylists tables and the
// doc's "Salon Onboarding Module" section), which is scaffolded but not
// live yet, and the Style Match algorithm itself is explicitly flagged in
// the doc as "still open / not built." This section renders now so the
// homepage order and nav ("Salons") are correct end-to-end.
//
// Image: doc asks for a real/realistic photo of a partner salon interior or
// barber at work — no fabricated photography inserted, same honesty rule as
// the Hero video and the GetStarted step cards.
//
// 24.09.2026: filled with an AI-generated illustrative salon interior
// (public/images/salon-interior.jpg) — a generic staged scene, not a real
// partner location, so it doesn't misrepresent an actual salon as a real
// Tressform partner.

import Image from "next/image";

const STYLE_MATCH_STEPS = ["Your hairstyle", "→", "Required technique", "→", "Matching salon"];

export default function TressformSalons() {
  return (
    <section id="salons" className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">Tressform + Salons</p>
        <h2>Get Your Tressform Look at a Matching Salon</h2>
        <p>
          Style Match reads the technique your chosen haircut actually needs — not just its name — and points you to
          a partner salon whose stylists can execute it. Coming soon.
        </p>
      </div>

      <div className="mx-auto mb-6 aspect-[16/7] max-w-[720px] overflow-hidden rounded-lg2 bg-gradient-to-br from-mint-pale to-white">
        <Image
          src="/images/salon-interior.jpg"
          alt=""
          width={1200}
          height={525}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="mb-7 flex flex-wrap items-center justify-center gap-2 text-[13px] font-semibold text-ink-heading">
        {STYLE_MATCH_STEPS.map((s, i) => (
          <span key={i} className={s === "→" ? "text-ink-muted" : "rounded-full border border-line bg-surface px-3.5 py-1.5"}>
            {s}
          </span>
        ))}
      </div>

      <span className="btn-secondary pointer-events-none opacity-70" aria-disabled="true">
        Find a Salon — Coming Soon
      </span>
    </section>
  );
}
