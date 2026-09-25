// /privacy — built per the "Build all of them" decision on the placeholder
// nav-link pages (Footer's "Privacy Policy" link, currently href="#").
//
// IMPORTANT: I'm not a lawyer, and this isn't legal advice. The facts below
// are pulled straight from decisions already made elsewhere in this project
// (the Master Section Plan doc's "Technical & compliance requirements"
// section, Trust.tsx, and the FAQ) — real policy commitments, not invented
// ones. But turning "here's what we actually do" into a legally binding
// Privacy Policy is a different job than building a website section, so
// this is clearly labeled a draft. Have an actual lawyer review it —
// especially the DPDP Act 2023 compliance language — before treating it as
// final and removing the draft notice below.

const SECTIONS = [
  {
    heading: "What we collect",
    body: "Photos you upload for face and hair analysis (typically three selfies — front, left, right), basic account details (name, phone or email), and usage data needed to run the service.",
  },
  {
    heading: "How we use it",
    body: "Your photos are used only to generate your own AI hairstyle previews and barber instructions. They are never used to train our AI models, and never shared with anyone else for marketing or any other purpose.",
  },
  {
    heading: "How long we keep it",
    body: "Uploaded photos and low-resolution previews are automatically deleted 90 days after upload, unless your account is still active and using them. You can request full deletion of your photos and data at any time, which we'll action without waiting for the 90-day period.",
  },
  {
    heading: "Security",
    body: "Photos are encrypted both in transit and at rest. Analysis is performed via AWS Rekognition and our hairstyle-generation provider under standard processor agreements — they process your data on our instruction, not their own.",
  },
  {
    heading: "Your rights",
    body: "Under India's Digital Personal Data Protection Act, 2023 (DPDP Act), you can request access to, correction of, or deletion of your personal data at any time. Contact us (see our Contact page) to exercise these rights.",
  },
  {
    heading: "Biometric-adjacent data",
    body: "Face and hair analysis involves biometric-adjacent measurements (face shape, proportions). We collect this only with your explicit consent, captured via the photo-consent checkbox at upload, and use it solely to generate your own results.",
  },
];

export default function PrivacyPolicyPage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px]">
        <p className="eyebrow">Legal</p>
        <h1 className="mb-2 text-[clamp(26px,4vw,36px)]">Privacy Policy</h1>
        <div className="mb-8 rounded-md2 border border-line bg-bg-soft p-4 text-[13px] leading-[1.6] text-ink-muted">
          <strong className="text-ink-heading">Draft — pending legal review.</strong> This page states our actual
          data-handling practices as implemented in the product, but hasn't been reviewed by a lawyer yet. Don't treat
          it as final legal terms until that review is done.
        </div>

        <div className="flex flex-col gap-7">
          {SECTIONS.map((s) => (
            <div key={s.heading}>
              <h3 className="mb-2 text-[16px]">{s.heading}</h3>
              <p className="text-[14.5px] leading-[1.6] text-ink-body">{s.body}</p>
            </div>
          ))}
        </div>

        <p className="mt-9 text-[12.5px] text-ink-muted">Last updated: draft, not yet published.</p>
      </div>
    </section>
  );
}
