// /refund — the Refund and Cancellation Policy.
//
// The refund rule itself is unchanged: it is the exact rule already shown
// in Faq.tsx and Footer.tsx (resolved via doc thread c15edd31-2524 on
// 23.09.2026).
//
// 10.10.2026: published (the "a lawyer hasn't reviewed the wording" box is
// gone) and three things a payment gateway review looks for were added:
// how to ask for a refund, how long the money takes to come back, and what
// "cancellation" means for a one-time digital purchase. The 5–7 working
// day figure is the usual time a gateway takes to return money to the
// original payment method — check it against the chosen gateway's own
// timeline once one is live.
//
// NOT REVIEWED BY A LAWYER — see the note at the top of app/privacy/page.tsx.

import BusinessContact from "@/components/BusinessContact";
import { BUSINESS } from "@/lib/business";

export const metadata = { title: "Refund and Cancellation Policy — Tressform" };

export default function RefundPolicyPage() {
  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px] text-justify hyphens-auto [&_h1]:text-left [&_h3]:text-left [&_dd]:text-left">
        <p className="eyebrow">Legal</p>
        <h1 className="mb-2 text-[clamp(26px,4vw,36px)]">Refund and Cancellation Policy</h1>
        <p className="mb-8 text-[12.5px] text-ink-muted">Last updated: {BUSINESS.legalLastUpdated}</p>

        <div className="mb-7">
          <h3 className="mb-2 text-[16px]">100% refund</h3>
          <p className="text-[14.5px] leading-[1.6] text-ink-body">
            If a technical glitch prevents the app from generating your images at all, even after multiple retries,
            you get a full refund — no questions asked.
          </p>
        </div>

        <div className="mb-7">
          <h3 className="mb-2 text-[16px]">No refund</h3>
          <p className="text-[14.5px] leading-[1.6] text-ink-body">
            Once the app successfully generates your images, there is no refund — including if you simply don&apos;t
            download them, or decide you don&apos;t like the result. AI hairstyles are a close, realistic guide based on
            your photos, not a guarantee of your final in-chair result — see our{" "}
            <a href="/#expectations" className="font-semibold text-mint-deep">
              Honest Expectations
            </a>{" "}
            section on the homepage for what an AI hairstyle can and can&apos;t predict.
          </p>
        </div>

        <div className="mb-7">
          <h3 className="mb-2 text-[16px]">How to ask for a refund</h3>
          <p className="text-[14.5px] leading-[1.6] text-ink-body">
            Email{" "}
            <a href={`mailto:${BUSINESS.supportEmail}`} className="font-semibold text-mint-deep">
              {BUSINESS.supportEmail}
            </a>{" "}
            from the email address on your account, with your order number and a short note on what went wrong. We
            check every request against our records. Approved refunds are sent back to your original payment method,
            and usually reach you within 5–7 working days.
          </p>
        </div>

        <div className="mb-7">
          <h3 className="mb-2 text-[16px]">Cancellations</h3>
          <p className="text-[14.5px] leading-[1.6] text-ink-body">
            Every pack is a one-time purchase of a digital service, delivered in your account on this website — there
            is no subscription to cancel and nothing is shipped. A purchase can&apos;t be cancelled once your images
            have been generated.
          </p>
        </div>

        <p className="mb-8 text-[13px] text-ink-muted">
          For the Money-Back Guarantee this policy backs, see our{" "}
          <a href="/money-back-guarantee" className="font-semibold text-mint-deep">
            Money-Back Guarantee
          </a>{" "}
          page.
        </p>

        <BusinessContact />
      </div>
    </section>
  );
}
