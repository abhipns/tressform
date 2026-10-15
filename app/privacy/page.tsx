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
    body: `${BUSINESS.brand} (www.tressform.co.in) is an online hairstyle service owned by ${BUSINESS.operator} (sole proprietor), who is responsible for the personal data described on this page. Contact details are at the end of this page.`,
  },
  {
    heading: "What we collect",
    body: "The photos you upload for face and hair analysis (one front-facing selfie), your account details (your email address, and your name if you sign in with Google), the hairstyles we create for you, basic usage data needed to run the service, such as how many hairstyles you have used, and your approximate city, which our hosting provider works out from your internet connection (not your exact location) so that we can later suggest salons near you.",
  },
  {
    heading: "How we use it",
    body: "Your photos are used only to analyse your face shape and to generate your own AI hairstyles and barber instructions. They are never used to train our AI models, never sold, and never shared with anyone for marketing.",
  },
  {
    heading: "Face analysis and consent",
    body: "Face analysis involves measurements of your face (its shape and proportions) taken from your photo. We do this only with your explicit consent, given through the photo-consent checkbox at upload, and use the result solely to produce your own hairstyles. We do not ask the analysis service for, or keep, estimates of your age, gender or emotions.",
  },
  {
    heading: "Who processes your data for us",
    body: "We use a small number of service providers to run Tressform: a hosting and database provider that stores your account and photos, Amazon Web Services (Rekognition) for face analysis, and an AI image-generation provider that creates your hairstyles. They process your data only on our instruction, to provide this service. Some of their servers are located outside India.",
  },
  {
    heading: "Payments",
    body: "Payments for paid plans are handled by our payment partner, PayU (PayU Payments Private Limited). You pay on PayU's own page: your card, UPI and bank details go directly to PayU — we do not see or store them. To start a payment we pass PayU your name, your email address and the mobile number you enter at checkout; we do not keep that mobile number ourselves. We keep a record of your order (the plan, the amount and the payment reference).",
  },
  {
    heading: "WhatsApp updates",
    body: "If you choose to, by ticking the box next to it, you can give us your WhatsApp number to receive new hairstyles, hair products and blog posts from us. We keep your number, the words you agreed to and when, where on the site you gave it, and, if you give it on your results, your face shape and whether the hairstyles were men's or women's, so the updates suit you. We send these messages through a WhatsApp messaging provider. We never sell or share your number for anyone else's marketing. You can stop the messages at any time by replying STOP or by contacting us, and we will stop and mark your number as unsubscribed.",
  },
  {
    heading: "Product links",
    body: "When you tap a product link, we record which product was tapped and on which page, but not who tapped it, so we can see which suggestions are useful. You then go to the shop's own website, where the shop's privacy policy applies.",
  },
  {
    heading: "Visits and reviews",
    body: "To count visits, your browser keeps a random number that it makes up itself and sends it, with the page you opened and the website you came from, when you open a page. We use no cookies for this and it does not identify you. If you rate Tressform, we keep your stars and comment with your account; comments, with the name you choose to show, appear on our website only after we check them, and you can change or remove your review at any time by contacting us.",
  },
  {
    heading: "How long we keep it",
    body: "Uploaded photos are automatically deleted 90 days after upload, unless your account is still active and using them. Hairstyles you have paid for are kept in your account until you ask us to delete them. You can ask us to delete your photos, your hairstyles or your whole account at any time, and we will do so without waiting for the 90-day period.",
  },
  {
    heading: "Security",
    body: "Your photos are encrypted in transit and at rest, and are kept in private storage that only your own account can open. Links to your photos and hairstyles are temporary and expire.",
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
    body: "We may change this policy at any time, without prior notice. The updated policy applies from the date shown at the top of this page, so please check it from time to time.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px] text-justify hyphens-auto [&_h1]:text-left [&_h3]:text-left [&_dd]:text-left">
        <p className="eyebrow">Legal</p>
        <h1 className="mb-2 text-[clamp(26px,4vw,36px)]">Privacy Policy</h1>
        <p className="mb-8 text-[12.5px] text-ink-muted">Last updated: 15 October 2026</p>

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
