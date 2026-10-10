// Why haircuts go wrong — the problem Tressform exists to solve.
//
// 10.10.2026 design pass: one section in place of four that sat one after
// another near the bottom of the page — "We've all had these moments…"
// (TheProblem.tsx), "The possible reasons" (PossibleReasons.tsx), "What does
// a wrong haircut actually cost you?" (CostOfGettingItWrong.tsx) and "Your
// haircut should be personal" (WhyPersonal.tsx). All the questions, reasons
// and costs from those are still here; only the repetition went.
//
// It is the one dark band in the middle of the page: the five salon photos
// are the best pictures on the site and they stand out against dark green.
// Desktop shows them as a set (two large, three smaller); on a phone they
// are a row you swipe, so five photos don't cost five screens of scrolling.

import Image from "next/image";

const MOMENTS = [
  {
    text: "Why does a hairstyle look great on them, but not on you?",
    image: "/problem-q1.jpg",
    alt: "Two men comparing hairstyles in a barbershop mirror — the same cut looking sharp on one and merely average on the other.",
  },
  {
    text: "What hairstyle would you wear to your cousin's wedding?",
    image: "/problem-q2.jpg",
    alt: "A woman in wedding attire browsing a wedding hairstyles magazine while a stylist works on her hair in a salon.",
  },
  {
    text: "Ever had to compromise with your hairstyle because you couldn't explain exactly what you wanted?",
    image: "/problem-q3.jpg",
    alt: "A barbershop customer gesturing with his hands, trying to describe a hairstyle to a puzzled barber.",
  },
  {
    text: "Ever shown a reference photo and still got a different haircut?",
    image: "/problem-q4.jpg",
    alt: "A customer after his haircut, comparing the result to a reference photo in a magazine with a disappointed expression.",
  },
  {
    text: "Ever wished you could see a hairstyle on yourself before getting the haircut?",
    image: "/problem-q5.jpg",
    alt: "A person holding a hairstyle magazine up to their reflection, imagining a new look before committing to it.",
  },
];

const FACE_SHAPES: { label: string; d: string }[] = [
  { label: "Oval", d: "M50 8c16 0 26 16 26 34s-10 40-26 40-26-22-26-40S34 8 50 8Z" },
  { label: "Square", d: "M50 8c20 0 30 10 30 30v18c0 20-14 26-30 26s-30-6-30-26V38c0-20 10-30 30-30Z" },
  { label: "Round", d: "M50 10c22 0 32 16 32 34s-14 32-32 32-32-14-32-32S28 10 50 10Z" },
  { label: "Heart", d: "M50 10c18 0 30 10 30 26 0 22-16 36-30 46-14-10-30-24-30-46 0-16 12-26 30-26Z" },
];

const COSTS = [
  "3–6 weeks waiting for hair to grow back",
  "Money spent on a haircut you dislike",
  "Looking bad in photos",
  "Avoiding social events",
  "Having to wear caps or hats",
  "Trying to explain the problem to the barber",
  "Another haircut to correct it",
];

// Desktop: the first two photos span three of six columns, the other three span two.
const SPAN = ["lg:col-span-3", "lg:col-span-3", "lg:col-span-2", "lg:col-span-2", "lg:col-span-2"];

export default function WhyItGoesWrong() {
  return (
    <section id="problem" className="bg-[#16261C] text-white/75">
      <div className="frame py-16 sm:py-20 lg:py-28">
        <div className="max-w-[900px]">
          <h2 className="h-display text-white">We&apos;ve all had these moments.</h2>
          <p className="lead mt-5 max-w-[52ch]">
            A haircut is hard to describe, impossible to try on, and takes weeks to undo.
          </p>
        </div>

        <ul className="-mx-5 mt-10 flex snap-x snap-mandatory scroll-px-5 gap-4 overflow-x-auto px-5 pb-4 sm:-mx-8 sm:scroll-px-8 sm:px-8 lg:mx-0 lg:mt-14 lg:grid lg:grid-cols-6 lg:gap-x-6 lg:gap-y-12 lg:overflow-visible lg:px-0 lg:pb-0">
          {MOMENTS.map((m, i) => (
            <li key={m.text} className={`w-[78vw] max-w-[360px] shrink-0 snap-start lg:w-auto lg:max-w-none ${SPAN[i]}`}>
              <div className="aspect-[4/3] overflow-hidden rounded-[20px] bg-white/5">
                <Image
                  src={m.image}
                  alt={m.alt}
                  width={i < 2 ? 1100 : 720}
                  height={i < 2 ? 825 : 540}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className={`mt-4 font-heading font-semibold leading-[1.25] text-white ${i < 2 ? "text-[20px] lg:text-[26px]" : "text-[20px]"}`}>
                {m.text}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-16 grid gap-x-16 gap-y-14 border-t border-white/10 pt-14 lg:mt-24 lg:grid-cols-2 lg:pt-20 xl:gap-x-24">
          <div>
            <h3 className="text-[clamp(24px,2.3vw,34px)] font-semibold leading-[1.15] text-white">
              Your face shape isn&apos;t their face shape.
            </h3>
            <p className="mt-4 max-w-[52ch] text-[16.5px] leading-[1.65]">
              Face shape, hair texture, density, hairline and proportions all change how the same cut sits. So does
              how much upkeep you&apos;ll put up with, and whether your barber was given clear instructions.
            </p>
            <ul className="mt-8 grid max-w-[520px] grid-cols-4 gap-4">
              {FACE_SHAPES.map((shape) => (
                <li key={shape.label} className="flex flex-col items-center gap-2.5">
                  <svg viewBox="0 0 100 100" fill="none" className="h-[72px] w-[72px] sm:h-[88px] sm:w-[88px]" aria-hidden="true">
                    <path d={shape.d} stroke="#B9DFCB" strokeWidth="2.5" strokeLinejoin="round" />
                  </svg>
                  <span className="text-[15px] font-medium text-white/85">{shape.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[clamp(24px,2.3vw,34px)] font-semibold leading-[1.15] text-white">
              What a wrong haircut actually costs you.
            </h3>
            <ul className="mt-5 border-t border-white/10">
              {COSTS.map((c) => (
                <li key={c} className="border-b border-white/10 py-3 text-[16.5px] text-white/85">
                  {c}
                </li>
              ))}
            </ul>
            <p className="mt-6 font-heading text-[20px] font-semibold leading-[1.3] text-white">
              And the worst part? You have to live with it until it grows out.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
