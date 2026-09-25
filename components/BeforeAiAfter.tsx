// Part G — "Before, AI, After" showcase (renamed from "Feature Yourself").
// Card structure: 3 images (Before / AI-generated / After-at-salon) per
// featured customer. Sharing one earns 5 credits (1 credit = 1 style unlock).
//
// Doc table row 15 — the holistic-approach 3-pointer (right cut, right
// maintenance, right stylist) is folded in below, per the comment on this
// row. HolisticApproach.tsx (Part J) is no longer rendered as its own
// section — its content lives here now, with the third point updated from
// "right styling" to "right stylist" to match the doc's wording.
//
// 24.09.2026: per user feedback — dropped the duplicate "Our Holistic
// Approach" h3 (the eyebrow above it already says "Our Approach", so the
// heading repeated itself); retitled "Right cut for your face" → "Right
// hairstyle for your face" and "Right maintenance for your life" → "Right
// maintenance for your hair".
//
// 24.09.2026 (later same day): per feedback, this section was meant to be
// a carousel (like Carousel.tsx below it) but was actually a static
// 2-per-row grid with no movement. Switched to the same seamless
// -50%-translate marquee technique Carousel.tsx uses: FEATURED is
// duplicated into two IDENTICAL halves (must stay pixel-for-pixel
// identical or the loop visibly jumps — same lesson learned there), cards
// are a fixed 560px wide (close to the effective width the old 2-per-row
// layout produced inside `wrap`), and the animation runs at ~65px/s — the
// same speed Carousel.tsx targets — so the two marquees on the page read
// as one consistent system rather than one looking faster/slower.

const FEATURED = [
  { name: "Aarav", style: "Textured Quiff — Low Taper" },
  { name: "Meera", style: "Curl Definition Crop" },
  { name: "Rohan", style: "Classic Crop — Mid Fade" },
];

const HOLISTIC_POINTS = [
  {
    title: "Right hairstyle for your face",
    body: "The AI match is built on your actual face shape and features — not a generic trend list.",
  },
  {
    title: "Right maintenance for your hair",
    body: "Wash and trim guidance so the style still looks right weeks after you leave the chair.",
  },
  {
    title: "Right stylist to bring it to life",
    body: "Style Match connects you with a salon whose stylists actually know how to deliver this exact cut.",
  },
];

function placeholderTile(label: string, tone: string) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div className={`flex aspect-[0.8/1] w-full items-center justify-center rounded-[10px] ${tone} text-[11px] font-semibold text-white/90`}>
        {label}
      </div>
      <span className="text-[10.5px] font-semibold text-ink-muted">{label}</span>
    </div>
  );
}

function buildFeaturedCard(f: (typeof FEATURED)[number], keyPrefix: string) {
  return (
    <div key={`${keyPrefix}-${f.name}`} className="card w-[560px] shrink-0">
      <div className="mb-4 flex gap-2">
        {placeholderTile("Before", "bg-ink-heading/70")}
        {placeholderTile("AI Preview", "bg-mint-deep/80")}
        {placeholderTile("After (Salon)", "bg-lilac/80")}
      </div>
      <p className="text-[14px] font-semibold text-ink-heading">{f.name}</p>
      <p className="text-[12.5px] text-ink-muted">{f.style}</p>
    </div>
  );
}

export default function BeforeAiAfter() {
  // Two IDENTICAL sets — see the comment at the top of this file and
  // Carousel.tsx's own version of this pattern for why they must match
  // exactly (the track translates by exactly -50%).
  const cards = [...FEATURED.map((f) => buildFeaturedCard(f, "a")), ...FEATURED.map((f) => buildFeaturedCard(f, "b"))];

  return (
    <section className="overflow-hidden py-16">
      <div className="wrap">
        <div className="section-head">
          <p className="eyebrow">Real Results</p>
          <h2>Before, AI, After</h2>
          <p>
            See a real customer&apos;s original photo, the AI preview Tressform generated for them, and the haircut
            their salon actually delivered — side by side.
          </p>
        </div>
      </div>

      <div
        className="w-full overflow-hidden"
        style={{ maskImage: "linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)" }}
      >
        <div className="flex w-max animate-[scroll-left_26s_linear_infinite] gap-5 hover:[animation-play-state:paused]">
          {cards}
        </div>
      </div>

      <div className="wrap">
        <p className="mt-8 text-center text-[13.5px] text-ink-muted">
          Share your own before/AI/after and earn <strong className="text-ink-heading">5 credits</strong> (1 credit =
          &#8377;1, usable at partner salons or toward more generations) once it&apos;s approved. Limit one upload
          per account per month — your consent is required before anything you share is used publicly.
        </p>

        <div className="mx-auto mt-14 max-w-[900px]">
          <div className="section-head">
            <p className="eyebrow">Our Approach</p>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            {HOLISTIC_POINTS.map((p) => (
              <div key={p.title} className="card">
                <h4 className="mb-1.5 text-[16px]">{p.title}</h4>
                <p className="text-[14px] leading-[1.55] text-ink-body">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
