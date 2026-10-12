// Hero — the first screen of the home page.
//
// 10.10.2026 — redesign (first piece of the site-wide design pass).
//
// Before: a centred headline, a line of "A • B • C", a button and a small
// video card, all on the same cream as the rest of the page — the top of
// the site looked like every other section on it.
//
// Now the header and the hero are ONE dark green block, and the hero is
// built from the two things only Tressform has:
//   1. the footage of the face analysis actually running (the same two
//      clips as before, see HeroVideoShuffle) — shown large, and
//   2. the barber card — the written cutting instructions a customer takes
//      to the chair. It sits over the corner of the video like a slip of
//      paper, because that is what the customer ends up holding. Its
//      contents are an example (and say so); the real card is generated
//      per customer. Both live in HeroMedia.tsx, which keeps the card's
//      example cut in step with whoever is on screen.
// The headline keeps the agreed words ("Find your perfect cut before you
// cut"), set large and left-aligned. The two older supporting lines are one
// plain sentence now. One primary button (same name as everywhere else:
// "See my hairstyles"), one quiet link to "How it works".
//
// The button is the brand's amber on this dark band — the green button used
// elsewhere would sink into a green background.
//
// Layout: text left / picture right from 1024px; stacked on phones, with
// the button before the video so it is on the first screen.

import HeroMedia from "./HeroMedia";

export default function Hero() {
  return (
    <section id="hero" className="bg-gradient-to-b from-header-dark-2 to-[#16261C] text-white">
      <div className="mx-auto grid w-full max-w-[1760px] items-center gap-x-14 gap-y-10 px-5 pb-16 pt-10 sm:px-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:pb-24 lg:pt-14 xl:px-14">
        <div className="max-w-[640px]">
          <h1 className="text-[clamp(40px,5.6vw,84px)] font-semibold leading-[1] tracking-[-0.012em] text-white">
            Find your perfect cut before you cut.
          </h1>
          <p className="mt-6 max-w-[520px] text-[17px] leading-[1.6] text-white/75 lg:text-[18.5px]">
            Upload one selfie and see new hairstyles on your own face. Then hand your barber exact instructions, so
            nothing is left to guesswork.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-7 gap-y-4">
            <a
              href="#upload"
              className="inline-flex items-center justify-center rounded-full bg-lilac px-8 py-4 font-heading text-[17px] font-semibold text-header-dark shadow-[0_14px_30px_-12px_rgba(199,154,61,0.7)] transition hover:bg-[#D6AB52] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
            >
              See my hairstyles
            </a>
            <a
              href="#how"
              className="text-[16px] font-medium text-white/85 underline decoration-white/30 underline-offset-[6px] transition hover:text-white hover:decoration-white"
            >
              See how it works
            </a>
          </div>
          <p className="mt-5 text-[14px] text-white/55">Your hairstyle list is free. You pay only to see a style on your own photo.</p>
        </div>

        <HeroMedia />
      </div>
    </section>
  );
}
