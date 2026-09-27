// Part B (revised sequence) — section 3, Hero / doc table row 6. Single CTA:
// "Try It Free" (primary), per the table's CTA cell — copy fixed from the
// previous "Find My Perfect Cut" mismatch. "Quick Checkout" stays removed
// (Open Conflict #3, confirmed everywhere).
//
// 24.09.2026: swapped the sub-headline and the small tagline line per user
// feedback — "Personalized hairstyles • Barber-ready guidance • No
// guesswork" now reads first (right under the H1), and the longer selfie
// explainer now sits as the smaller line above the video.
//
// 27.09.2026: replaced the abstract motion-graphic placeholder with real
// captured footage of the AI face-analysis flow (a man and a woman, each
// generated separately). The two clips now play one after another in
// randomized order via HeroVideoShuffle (client component) — see that file
// for the shuffle/no-repeat logic. Both source files ship with no audio
// track; the <video> element is muted regardless.
//
// 27.09.2026 (later same day): tightened vertical spacing and shrank the
// video card (720px -> 600px max width) so the full hero — headline through
// the bottom of the video — fits within a typical laptop browser viewport
// at 100% zoom, without the video's bottom edge being cut off below the
// fold. Previously the section ran ~900px tall against a nav bar that eats
// the first ~64px, which forced users to scroll or zoom out to ~80% to see
// the whole video.

import HeroVideoShuffle from "./HeroVideoShuffle";

export default function Hero() {
  return (
    <section id="hero" className="wrap py-8 pb-6 text-center">
      <h1 className="mx-auto max-w-[760px] text-[clamp(26px,4.2vw,42px)] leading-[1.1]">
        Find Your Perfect Cut Before You Cut
      </h1>
      <p className="mx-auto mt-3 max-w-[560px] text-[16.5px] leading-[1.6] text-ink-body">
        Personalized hairstyles &bull; Barber-ready guidance &bull; No guesswork
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3.5">
        <a href="#upload" className="btn-primary">
          Try It Free
        </a>
      </div>
      <p className="mt-3 text-[12.5px] font-medium text-ink-muted">
        Upload a few selfies and see exactly how new hairstyles will look on your real face — before you sit in the
        chair.
      </p>

      <div className="mx-auto mt-6 aspect-video w-full max-w-[600px] overflow-hidden rounded-lg2 bg-gradient-to-br from-mint-pale to-white shadow-card">
        <HeroVideoShuffle />
      </div>
    </section>
  );
}
