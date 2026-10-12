// Home page.
//
// 10.10.2026 — DESIGN PASS. The page went from 22 sections (about 28 phone
// screens, with the upload step seven screens down) to the 10 below. The
// owner approved cutting it down, merging the sections that repeated each
// other and hiding the ones that were placeholders.
//
// ON THE PAGE NOW, in order:
//    1. Hero
//    2. Examples                (Carousel)        id="examples"
//       Back on 11.10.2026 with real Tressform pictures: each person's
//       photo and five previews made from it. Second on the page because
//       it is the proof of the hero's promise, and — once the free preview
//       is switched off — the visitor's only look at what they are buying.
//    3. How it works            (HowItWorks)      id="how"
//    4. Try it — the upload     (UploadFlow)      id="upload"
//    5. What you get            (WhatYouGet)      id="what"
//    6. Why haircuts go wrong   (WhyItGoesWrong)  id="problem"
//    7. Pricing                 (Pricing)         id="pricing"
//    8. Salons, coming soon     (TressformSalons) id="salons"
//    9. What to expect + privacy (ExpectationsAndPrivacy) id="expectations", id="privacy"
//   10. Questions               (Faq)             id="faq"
//   11. Closing call            (FinalCta)
//  The sticky "See my hairstyles" pill (StickyCta) still appears once the hero
//  has scrolled away. Header and Footer come from app/layout.tsx.
//
// MERGED (every point they made is in the section named; their own files
// are still in components/, just not used here):
//   IntroduceTressform, GetStarted, "Our approach"  → How it works
//   HairProfile                                     → What you get
//   TheProblem, PossibleReasons, CostOfGettingItWrong, WhyPersonal
//                                                   → Why haircuts go wrong
//   HonestExpectations, Trust                       → What to expect + privacy
//
// HIDDEN UNTIL THERE IS REAL CONTENT (files kept; to bring one back, import
// it and place it in the list below):
//   BeforeAiAfter — said "a real customer's original photo" over coloured
//                   placeholder blocks with invented names. Needs real,
//                   consented before / preview / after photos first.
//   GoogleRating  — "Real results, real stories" with no stories yet.
//   HairCare      — a "Coming soon" notice for something not built.
//   TriviaTeaser  — a blog teaser; the blog is linked from the header and
//                   the footer.
//
// Row #11 of the Master Section Plan (Personalised Product Recommendations)
// was never a home page section — it belongs to the post-payment results
// screen (components/results/ProductRecommendations.tsx).

import Hero from "@/components/Hero";
import StickyCta from "@/components/StickyCta";
import Carousel from "@/components/Carousel";
import HowItWorks from "@/components/HowItWorks";
import UploadFlow from "@/components/UploadFlow";
import WhatYouGet from "@/components/WhatYouGet";
import WhyItGoesWrong from "@/components/WhyItGoesWrong";
import Pricing from "@/components/Pricing";
import TressformSalons from "@/components/TressformSalons";
import ExpectationsAndPrivacy from "@/components/ExpectationsAndPrivacy";
import Faq from "@/components/Faq";
import FinalCta from "@/components/FinalCta";

export default function Home() {
  return (
    <>
      <div id="top" />

      <Hero />
      <StickyCta />
      <Carousel />
      <HowItWorks />
      <UploadFlow />
      <WhatYouGet />
      <WhyItGoesWrong />
      <Pricing />
      <TressformSalons />
      <ExpectationsAndPrivacy />
      <Faq />
      <FinalCta />
    </>
  );
}
