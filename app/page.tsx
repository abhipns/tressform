// Homepage — physically resequenced 24.09.2026 to match the Master Section
// Plan doc's finalized 1–20 order (the doc's own "#" column was resequenced
// on 23.09.2026 but the actual component order here was deliberately left
// untouched at the time — see that doc's changelog). Numbered comments below
// match the doc's new numbering exactly.
//
// Row #11 (Personalised Product Recommendations) is NOT rendered here by
// design — it's a transactional post-payment screen
// (components/results/ProductRecommendations.tsx), not a homepage section;
// it belongs in the checkout/results flow once that's built. So the numbered
// sequence below has an intentional gap between #10 and #12.
//
// Sections outside the doc's 20-row table, and what happened to each in this
// pass (all per your 24.09.2026 call):
//   - Announcement Strip — REMOVED. Doc: "Needs removal — still live."
//   - Cost of Getting It Wrong — KEPT, unnumbered. Placed right after
//     Possible Reasons, its natural pairing (both are Problem-side content).
//   - "3-Step Confidence Journey" (components/GetStarted.tsx) — KEPT,
//     unnumbered. Placed right after How Tressform Diagnoses Your Look
//     (#3), since both walk through how the product works.
//   - IntroduceTressform — KEPT. Placed right before #3, as the short lead-in
//     that CTAs into it. (Checked for the duplicate id="how" bug flagged in
//     the doc's gap list: only HowItWorks.tsx actually has id="how" in the
//     DOM — IntroduceTressform.tsx only links to #how in a comment/CTA, it
//     doesn't render a second id="how" element. No code fix needed there.)
//   - Hair Care — KEPT (Part J, content-marketing). Placed near Salons, same
//     relative spot as before.
//   - Trivia Teaser — KEPT (Part J). Stays as the closing content hook right
//     before the footer.
//
// Header (row 1) and Footer (row 20) live in app/layout.tsx so every route
// gets them, not just this homepage — see that file's comment.

import Hero from "@/components/Hero"; // 1
import StickyCta from "@/components/StickyCta"; // global — persistent "Try It Free" pill, hidden over the Hero, appears once it scrolls out
import BeforeAiAfter from "@/components/BeforeAiAfter"; // 2 "Before → AI → Real Result" — folds in the Holistic Approach 3-pointer (Part J)
import IntroduceTressform from "@/components/IntroduceTressform"; // unnumbered — short lead-in, CTAs into #3 below
import HowItWorks from "@/components/HowItWorks"; // 3 "How Tressform Diagnoses Your Look"
import GetStarted from "@/components/GetStarted"; // unnumbered — "3-Step Confidence Journey," kept per your call, placed next to #3
import Carousel from "@/components/Carousel"; // 4
import UploadFlow from "@/components/UploadFlow"; // 5 "Personal Hair & Style Assessment"
import HairProfile from "@/components/HairProfile"; // 6+7 "Your Personal Hair Profile" merged with "Guided Haircut" — see that file's header comment; GuidedHaircut.tsx's own section is no longer rendered here
import WhatYouGet from "@/components/WhatYouGet"; // 8 "Maintain + Recreate Your Look"
import TressformSalons from "@/components/TressformSalons"; // 9 "Get Your Tressform Look at a Matching Salon"
import HairCare from "@/components/HairCare"; // unnumbered — Part J, content-marketing, kept
import Pricing from "@/components/Pricing"; // 10 "Unlock Your Top Matches + Pricing"
// 11 Personalised Product Recommendations — deliberately not rendered here, see file header
import GoogleRating from "@/components/GoogleRating"; // 12 "Real Results + Customer Stories"
import TheProblem from "@/components/TheProblem"; // 13
import PossibleReasons from "@/components/PossibleReasons"; // 14 "The Possible Reasons"
import CostOfGettingItWrong from "@/components/CostOfGettingItWrong"; // unnumbered — kept per your call, placed right after Possible Reasons
import WhyPersonal from "@/components/WhyPersonal"; // 15 "Your Haircut Should Be Personal"
import HonestExpectations from "@/components/HonestExpectations"; // 16 "What Tressform Can — and Can't — Predict"
import Trust from "@/components/Trust"; // 17 "Privacy + Trust + AI Transparency"
import Faq from "@/components/Faq"; // 18 "FAQ + Objection Handling"
import FinalCta from "@/components/FinalCta"; // 19 "Final Confidence CTA"
import TriviaTeaser from "@/components/TriviaTeaser"; // unnumbered — Part J, closing content hook before the footer

export default function Home() {
  return (
    <>
      <div id="top" />

      <Hero />
      <StickyCta />
      <BeforeAiAfter />
      <IntroduceTressform />
      <HowItWorks />
      <GetStarted />
      <Carousel />
      <UploadFlow />
      <HairProfile />
      <WhatYouGet />
      <TressformSalons />
      <HairCare />

      <Pricing />
      <GoogleRating />

      <TheProblem />
      <PossibleReasons />
      <CostOfGettingItWrong />
      <WhyPersonal />
      <HonestExpectations />

      <Trust />
      <Faq />
      <FinalCta />
      <TriviaTeaser />
    </>
  );
}
