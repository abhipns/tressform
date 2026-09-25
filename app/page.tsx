// Homepage — rebuilt per Part B's "Update — revised landing page sequence &
// CTA structure," which supersedes the original 19-section order. Numbered
// comments below match the doc's 23-row table exactly, so drift is easy to
// spot on the next spec revision.
//
// Two rows from that table are NOT rendered here by design:
//   #17 Post-Payment Bump Offer — a transactional upsell screen shown after
//        payment, before results are ready. Not a homepage section — belongs
//        in the checkout/payment flow once that's built.
// Everything else, in order, with its section's own CTA(s) per the table.
//
// A few sections beyond the 23 (HolisticApproach, TriviaTeaser) come from
// Part J and aren't in the revised table — the doc only reorders/fixes CTAs
// for the 23 listed rows, it doesn't say to drop other Part J content, so
// they're kept, slotted in where they fit thematically.

import AnnouncementStrip from "@/components/AnnouncementStrip"; // 1
import Header from "@/components/Header"; // 2
import Hero from "@/components/Hero"; // 3
import Carousel from "@/components/Carousel"; // Part C, id="browse" — not its own row in the 23-row table, but the header's "Hairstyles" nav link and the footer's "Hairstyles" link both point here, so it stays rendered
import TheProblem from "@/components/TheProblem"; // 4
import IntroduceTressform from "@/components/IntroduceTressform"; // 5
import HowItWorks from "@/components/HowItWorks"; // 6
import UploadFlow from "@/components/UploadFlow"; // 7 "Try Tressform"
import WhatYouGet from "@/components/WhatYouGet"; // 8
import GuidedHaircut from "@/components/GuidedHaircut"; // 9
import PlanSelection from "@/components/PlanSelection"; // 10
import GetStarted from "@/components/GetStarted"; // 11 "How To Get Started"
import WhyPersonal from "@/components/WhyPersonal"; // 12
import BeforeAiAfter from "@/components/BeforeAiAfter"; // 13 "Results showcase"
import HolisticApproach from "@/components/HolisticApproach"; // Part J, not in the 23-row table — kept near the other trust content
import HonestExpectations from "@/components/HonestExpectations"; // 14
import TressformSalons from "@/components/TressformSalons"; // 15
import HairCare from "@/components/HairCare"; // 16
// 17 Post-Payment Bump Offer — deliberately not rendered here, see file header
import GoogleRating from "@/components/GoogleRating"; // 18 "Reviews / Social proof"
import Pricing from "@/components/Pricing"; // 19
import Trust from "@/components/Trust"; // 20 "Privacy / Trust"
import Faq from "@/components/Faq"; // 21
import FinalCta from "@/components/FinalCta"; // 22
import TriviaTeaser from "@/components/TriviaTeaser"; // Part J, not in the 23-row table — kept as a closing content hook before the footer
import Footer from "@/components/Footer"; // 23

export default function Home() {
  return (
    <>
      <AnnouncementStrip />
      <Header />
      <div id="top" />

      <Hero />
      <Carousel />
      <TheProblem />
      <IntroduceTressform />
      <HowItWorks />
      <UploadFlow />
      <WhatYouGet />
      <GuidedHaircut />
      <PlanSelection />
      <GetStarted />
      <WhyPersonal />

      <BeforeAiAfter />
      <HolisticApproach />
      <HonestExpectations />
      <TressformSalons />
      <HairCare />

      <GoogleRating />
      <Pricing />
      <Trust />
      <Faq />
      <FinalCta />
      <TriviaTeaser />

      <Footer />
    </>
  );
}
