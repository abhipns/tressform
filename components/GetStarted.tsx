// Master Section Plan doc, row 9 "3-Step Confidence Journey" — reworked
// per that row's own core content: "Analyse → Choose → Show Your Barber, 3
// step cards with real/staged photography," replacing this section's old
// icon-circle treatment and "How To Get Started" copy.
//
// Photography: the doc explicitly asks for real or realistic staged photos
// per step, not icons — same honesty rule applied to the Hero video (see
// that file's comment): no fabricated photography is inserted here.
//
// 24.09.2026: image slots filled with AI-generated illustrative lifestyle
// photography (public/images/step-*.jpg) — generic staged scenes, not real
// customers or real before/after results, so this doesn't cross the
// no-fabricated-results line that applies to Real Results/Customer Stories.
// Selfie step image intentionally shows a man from behind, face not
// identifiable, matching the "Show Your Barber" step's subject.

import Image from "next/image";

const STEPS = [
  {
    title: "Analyse",
    body: "Upload 3 selfies — front, left, and right — and Tressform reads your face shape, hair texture, and hairline.",
    image: "/images/step-analyse-selfie.jpg",
  },
  {
    title: "Choose",
    body: "Browse your AI-matched haircuts, previewed on your own face, and pick the one you want.",
    image: "/images/step-choose-hairstyles.jpg",
  },
  {
    title: "Show Your Barber",
    body: "Bring the preview and barber instructions in, or book directly at a partner salon.",
    image: "/images/step-show-barber.jpg",
  },
];

export default function GetStarted() {
  return (
    <section className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">Get Started</p>
        <h2>Your 3-Step Confidence Journey</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card text-center">
            <div className="mb-4 aspect-[4/3] w-full overflow-hidden rounded-md2 bg-gradient-to-br from-mint-pale to-white">
              <Image
                src={s.image}
                alt=""
                width={480}
                height={360}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="mx-auto mb-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-mint-pale text-[14px] font-bold text-mint-deep">
              {i + 1}
            </div>
            <h4 className="mb-1.5 text-[16px]">{s.title}</h4>
            <p className="text-[14px] leading-[1.55] text-ink-body">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <a href="#upload" className="btn-primary">
          Start Now
        </a>
      </div>
    </section>
  );
}
