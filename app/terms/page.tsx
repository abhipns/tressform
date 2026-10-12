// /terms — the Terms of Service.
//
// 10.10.2026: published (was labelled "Draft — pending legal review"), with
// three additions a payment gateway review looks for: who operates the
// site, how the service is delivered (it's digital — nothing is shipped),
// and how to get in touch. GST wording follows GST_REGISTERED in
// lib/pricing.ts.
//
// NOT REVIEWED BY A LAWYER — see the note at the top of app/privacy/page.tsx.

import BusinessContact from "@/components/BusinessContact";
import { BUSINESS } from "@/lib/business";
import { GST_REGISTERED } from "@/lib/pricing";

export const metadata = { title: "Terms of Service — Tressform" };

const SECTIONS = [
  {
    heading: "Who we are",
    body: `${BUSINESS.brand} (www.tressform.co.in) is operated by ${BUSINESS.operator}. By using the site you agree to these terms.`,
  },
  {
    heading: "The service",
    body: "Tressform generates AI hairstyle previews from photos you upload, plus barber-ready cutting instructions. Previews are a close, realistic guide based on your photos — not a guarantee of your final result, since real hair texture, growth pattern, and your barber's technique will always add small differences.",
  },
  {
    heading: "Your account and your photos",
    body: "You need an account to use Tressform, and you must be 18 or older. Please upload only photos of yourself, or of someone who has clearly agreed to it, and keep your login details to yourself. You retain ownership of the photos you upload. We use them only to generate your own results — see our Privacy Policy for how they're stored, secured, and deleted.",
  },
  {
    heading: "What is free and what is paid",
    body: "Creating an account, having your photo read and seeing your list of matched hairstyles are free. Hairstyle previews on your own photo are sold in packs; each preview you make uses one preview from your pack.",
  },
  {
    heading: "Paid plans and pricing",
    body: `Starter Pack, Style Pack, and Full Explore are priced in Indian rupees as shown on the Pricing section${
      GST_REGISTERED ? ", GST-inclusive" : "; the price shown is the full amount you pay"
    }. Each pack is a one-time purchase, not a subscription. Early Bird pricing is a genuine, time-bound launch discount available until 31 December 2026, 23:59 IST — purchases made before that date keep their price and photo count even after the discount ends; new purchases after that date are charged the regular price.`,
  },
  {
    heading: "Delivery",
    body: "Tressform is a digital service. Nothing is shipped. Your results appear in your account on this website as soon as they are generated, usually within a minute or two of your request.",
  },
  {
    heading: "Refunds and cancellations",
    body: "See our Refund and Cancellation Policy for full terms. In short: a 100% refund applies only if a technical glitch prevents image generation entirely, even after multiple retries. Once images successfully generate, no refund applies.",
  },
  {
    heading: "Refer & Earn",
    body: "Referral rewards are flat, non-withdrawable Tressform credits (not cash), earned once per referred customer on their first qualifying purchase, capped at ₹15,000 per referrer per financial year. Full mechanics are on the Refer & Earn page and in our FAQ.",
  },
  {
    heading: "Fair use",
    body: "Please don't misuse the service: no photos of other people without their consent, no unlawful or offensive content, no attempts to obtain previews without paying for them, and no automated use of the site. We may suspend accounts that do.",
  },
  {
    heading: "Governing law",
    body: "These terms are governed by the laws of India.",
  },
  {
    heading: "Changes to these terms",
    body: "We may update these terms as the product evolves. Changes will be shown on this page with a new date below.",
  },
];

export default function TermsOfServicePage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px]">
        <p className="eyebrow">Legal</p>
        <h1 className="mb-2 text-[clamp(26px,4vw,36px)]">Terms of Service</h1>
        <p className="mb-8 text-[12.5px] text-ink-muted">Last updated: {BUSINESS.legalLastUpdated}</p>

        <div className="flex flex-col gap-7">
          {SECTIONS.map((s) => (
            <div key={s.heading}>
              <h3 className="mb-2 text-[16px]">{s.heading}</h3>
              <p className="text-[14.5px] leading-[1.6] text-ink-body">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-9">
          <BusinessContact />
        </div>
      </div>
    </section>
  );
}
