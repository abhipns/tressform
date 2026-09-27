// Part B (revised sequence) — section 4, "The Problem" / doc table row 2.
// Warm opener + the 5 exact rhetorical questions supplied via comment on the
// Master Section Plan doc, each paired with a photo/illustration slot,
// alternating left/right per the table's "Image/asset needed" column.
// Deliberately no CTA, per the doc.
//
// 27.09.2026: swapped the empty gradient placeholders for the 5 real
// photos (public/problem-q1.jpg .. problem-q5.jpg) — each generated as a
// photorealistic (not illustrated/cartoon) scene with Indian characters,
// shot with real-camera framing, in a premium salon/barbershop/home
// setting, matching its question.

import Image from "next/image";

const QUESTIONS = [
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

export default function TheProblem() {
  return (
    <section id="problem" className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">The Problem</p>
        <h2>We&apos;ve all had these moments&hellip;</h2>
      </div>

      <div className="mx-auto flex max-w-[860px] flex-col gap-12">
        {QUESTIONS.map((q, i) => {
          const imageFirst = i % 2 === 0;
          return (
            <div
              key={q.text}
              className={`flex flex-col items-center gap-6 md:flex-row ${imageFirst ? "" : "md:flex-row-reverse"}`}
            >
              <div className="aspect-[4/3] w-full max-w-[320px] shrink-0 overflow-hidden rounded-lg2 bg-gradient-to-br from-mint-pale to-white shadow-card">
                <Image
                  src={q.image}
                  alt={q.alt}
                  width={480}
                  height={360}
                  className="h-full w-full object-cover"
                />
              </div>
              <p className="text-center text-[19px] font-semibold leading-[1.4] text-ink-heading md:text-left">
                {q.text}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
