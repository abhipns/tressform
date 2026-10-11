// How it works — the second thing on the home page.
//
// 10.10.2026 design pass: this ONE section replaces five that all explained
// the same thing in different words — "Our approach", "Analyse. Discover.
// Visualise. Guide.", the four-box "How Tressform delivers your ideal cut",
// "Your 3-Step Confidence Journey" and "More than a preview". (Their files
// are still in components/ but no longer on the page.)
//
// It is three steps because the customer does three things. The photos are
// the three that were already on the site. The steps are numbered and drop
// down the page like a staircase because this really is a sequence.
//
// The wording only promises what the product does today: the analysis reads
// face shape (not hair texture or hairline yet), so that is all step 1 says.

import Image from "next/image";
import { Band, Rail } from "./Section";

const STEPS = [
  {
    title: "Take three selfies",
    body: "Front, left and right, on any phone. Tressform reads your face shape and your hair from them.",
    image: "/images/step-analyse-selfie.jpg",
    alt: "A man taking a selfie on his phone by a window.",
  },
  {
    title: "See the styles on your own face",
    body: "You get hairstyles matched to your face shape and your hair, shown on your own photo and not on a model.",
    image: "/images/step-choose-hairstyles.jpg",
    alt: "Hands holding a phone that shows a grid of hairstyle previews.",
  },
  {
    title: "Take the instructions to your barber",
    body: "Each style comes with the cut written out in a barber's words, with lengths, so your barber knows exactly what you are asking for.",
    image: "/images/step-show-barber.jpg",
    alt: "A customer showing a hairstyle on his phone to a barber.",
  },
];

const STAIR = ["", "lg:mt-14", "lg:mt-28"];

export default function HowItWorks() {
  return (
    <Band id="how" tone="cream">
      <Rail
        heading="From three selfies to a haircut your barber can follow."
        lead="No appointment, no app to install. It takes about a minute."
        aside={
          <a href="#upload" className="btn-primary mt-8 hidden lg:inline-flex">
            Try it free
          </a>
        }
      >
        {/* Phones: a small photo beside each step, so three steps fit in
            about one screen. From tablets up: three columns, each a little
            lower than the last. */}
        <ol className="grid gap-x-6 gap-y-8 sm:grid-cols-3 sm:gap-y-12">
          {STEPS.map((step, i) => (
            <li key={step.title} className={`grid grid-cols-[104px_1fr] items-start gap-x-4 sm:block ${STAIR[i]}`}>
              <div className="aspect-square overflow-hidden rounded-[16px] bg-mint-pale sm:aspect-[4/3] sm:rounded-[20px]">
                <Image src={step.image} alt={step.alt} width={640} height={480} className="h-full w-full object-cover" />
              </div>
              <div className="flex items-start gap-3 sm:mt-5 sm:gap-4">
                <span className="font-heading text-[34px] font-semibold leading-[0.9] text-mint sm:text-[46px]" aria-hidden="true">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-[18.5px] font-semibold leading-snug sm:text-[20px]">{step.title}</h3>
                  <p className="mt-1.5 text-[15.5px] leading-[1.55] sm:mt-2 sm:leading-[1.6]">{step.body}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Rail>
    </Band>
  );
}
