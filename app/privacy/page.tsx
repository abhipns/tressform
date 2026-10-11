// /privacy — the Privacy Policy.
//
// 10.10.2026: published (was labelled "Draft — pending legal review").
// Every statement here describes what the product actually does today:
//   - account details: the email address, plus the name on the Google
//     account for people who sign in with Google;
//   - photos live in private storage, readable only by their owner;
//   - face analysis is done by AWS Rekognition, previews by our
//     image-generation provider; age, gender and emotion are deliberately
//     not requested from the analysis service;
//   - card / UPI details go to the payment gateway, never to us.
// Who runs the site and how to reach them comes from lib/business.ts.
//
// NOT REVIEWED BY A LAWYER. The owner chose to publish this wording as it
// stands; it is a plain statement of practice, not a lawyer-drafted
// document. A review (DPDP Act 2023 in particular) is still worth doing.
//
// The "deleted automatically after 90 days" promise below (also made in
// Trust.tsx, Faq.tsx and /about) is kept by app/api/cron/cleanup, which
// runs once a day. "Still active" means the account was used in the last
// 90 days — see that file for the exact rule.

import BusinessContact from "@/components/BusinessContact";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Privacy Policy — Tressform" };

const SECTIONS = [
  {
    heading: "Who we are",
    body: `${BUSINESS.brand} (www.tressform.co.in) is operated by ${BUSINESS.operator}, who is responsible for the personal data described on this page. Contact details are at the end of this page.`,
  },
  {
    heading: "What we collect",
    body: "The photos you upload for face and hair analysis (three selfies — front, left and right), your account details (your email address, and your name if you sign in with Google), the hairstyle previews we create for you, and basic usage data needed to run the service, such as how many previews you have used.",
  },
  {
    heading: "How we use it",
    body: "Your photos are used only to analyse your face shape and to generate your own AI hairstyle previews and barber instructions. They are never used to train our AI models, never sold, and never shared with anyone for marketing.",
  },
  {
    heading: "Face analysis and consent",
    body: "Face analysis involves measurements of your face (its shape and proportions) taken from your photo. We do this only with your explicit consent, given through the photo-consent checkbox at upload, and use the result solely to produce your own previews. We do not ask the analysis service for, or keep, estimates of your age, gender or emotions.",
  },
  {
    heading: "Who processes your data for us",
    body: "We use a small number of service providers to run Tressform: a hosting and database provider that stores your account and photos, Amazon Web Services (Rekognition) for face analysis, and an AI image-generation provider that creates your previews. They process your data only on our instruction, to provide this service. Some of their servers are located outside India.",
  },
  {
    heading: "Payments",
    body: "Payments for paid plans are handled by a payment gateway. Your card, UPI and bank details go directly to the gateway — we do not see or store them. We keep a record of your order (the plan, the amount and the payment reference).",
  },
  {
    heading: "How long we keep it",
    body: "Uploaded photos are automatically deleted 90 days after upload, unless your account is still active and using them. Previews you have paid for are kept in your account until you ask us to delete them. You can ask us to delete your photos, your previews or your whole account at any time, and we will do so without waiting for the 90-day period.",
  },
  {
    heading: "Security",
    body: "Your photos are encrypted in transit and at rest, and are kept in private storage that only your own account can open. Links to your photos and previews are temporary and expire.",
  },
  {
    heading: "Your rights",
    body: "Under India's Digital Personal Data Protection Act, 2023 (DPDP Act), you can ask to see the personal data we hold about you, have it corrected, have it deleted, or withdraw your consent at any time. Write to us using the contact details below from the email address on your account. We aim to reply within 7 working days.",
  },
  {
    heading: "Children",
    body: "Tressform is for people aged 18 and over. Please don't create an account, or upload photos of anyone, under 18.",
  },
  {
    heading: "Changes to this policy",
    body: "If we change how we handle your data, we will update this page and the date below.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px]">
        <p className="eyebrow">Legal</p>
        <h1 className="mb-2 text-[clamp(26px,4vw,36px)]">Privacy Policy</h1>
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
          <BusinessContact heading="Contact and privacy requests" />
        </div>
      </div>
    </section>
  );
}
