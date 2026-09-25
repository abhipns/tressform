// Part B (revised sequence) — section 3, Hero / doc table row 6. Single CTA:
// "Try It Free" (primary), per the table's CTA cell — copy fixed from the
// previous "Find My Perfect Cut" mismatch. "Quick Checkout" stays removed
// (Open Conflict #3, confirmed everywhere).
//
// Visual: per the row's comment, this should ideally be a short looping
// video/GIF of the 3-selfie → AI preview transformation. What's playing now
// (public/hero-transformation.mp4 + its poster frame) is a built, abstract/
// illustrative motion graphic — line-art selfie icons feeding into a scan +
// hairstyle-silhouette reveal, same visual language as the face-shape icons
// in PossibleReasons.tsx — NOT a real customer's photos or a real product
// screen capture. It communicates the concept honestly (a stylised diagram
// of the flow) without claiming to be an actual before/after result, which
// would misrepresent what the product does. Swap in real captured footage
// of the actual upload → analysis → preview flow whenever that's ready —
// same file paths, no code change needed.
//
// 24.09.2026: swapped the sub-headline and the small tagline line per user
// feedback — "Personalized hairstyles • Barber-ready guidance • No
// guesswork" now reads first (right under the H1), and the longer selfie
// explainer now sits as the smaller line above the video.

export default function Hero() {
  return (
    <section id="hero" className="wrap py-14 pb-10 text-center">
      <h1 className="mx-auto max-w-[820px] text-[clamp(30px,5vw,50px)] leading-[1.08]">
        Find Your Perfect Cut Before You Cut
      </h1>
      <p className="mx-auto mt-[18px] max-w-[560px] text-[16.5px] leading-[1.6] text-ink-body">
        Personalized hairstyles &bull; Barber-ready guidance &bull; No guesswork
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
        <a href="#upload" className="btn-primary">
          Try It Free
        </a>
      </div>
      <p className="mt-4 text-[12.5px] font-medium text-ink-muted">
        Upload a few selfies and see exactly how new hairstyles will look on your real face — before you sit in the
        chair.
      </p>

      <div className="mx-auto mt-9 aspect-video w-full max-w-[720px] overflow-hidden rounded-lg2 bg-gradient-to-br from-mint-pale to-white shadow-card">
        <video
          className="h-full w-full object-cover"
          poster="/hero-transformation-poster.jpg"
          autoPlay
          muted
          loop
          playsInline
        >
          <source src="/hero-transformation.mp4" type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
