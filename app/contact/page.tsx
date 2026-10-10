// /contact — who runs Tressform, how to reach them, and a message form.
//
// 10.10.2026: real contact details added (lib/business.ts), and the form
// now actually goes somewhere. It used to show "Thanks — got it" without
// sending anything. There is still no email-sending service on the server,
// so the form opens the visitor's own email app with their message already
// written and addressed to the support inbox; they press Send there. The
// confirmation says exactly that, and gives the address in case no email
// app opens. When a sending service is added (e.g. Resend from an
// app/api/contact route), swap the mailto step for a real submit.

"use client";

import { useState } from "react";
import BusinessContact from "@/components/BusinessContact";
import { BUSINESS } from "@/lib/business";

export default function ContactPage() {
  const [opened, setOpened] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `Tressform enquiry from ${name.trim()}`;
    const body = `${message.trim()}\n\n${name.trim()}\n${email.trim()}`;
    window.location.href = `mailto:${BUSINESS.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpened(true);
  }

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[560px]">
        <p className="eyebrow">Contact</p>
        <h1 className="mb-4 text-[clamp(26px,4vw,36px)]">Get in touch</h1>
        <p className="mb-8 text-[15px] leading-[1.6] text-ink-body">
          Questions, feedback, or something not working? Email or call us, or write your message below.
        </p>

        <div className="mb-8">
          <BusinessContact heading="Reach us directly" />
        </div>

        {opened ? (
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-1 text-[16px] font-semibold text-ink-heading">Almost done — press Send in your email app.</p>
            <p className="text-[14px] leading-[1.6] text-ink-muted">
              Your message is ready there, addressed to us. If no email app opened, write to{" "}
              <a href={`mailto:${BUSINESS.supportEmail}`} className="font-semibold text-mint-deep">
                {BUSINESS.supportEmail}
              </a>{" "}
              directly.
            </p>
            <button type="button" onClick={() => setOpened(false)} className="mt-4 text-[13px] font-semibold text-mint-deep">
              Back to the form
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-[13px] font-medium text-ink-heading">
                Name
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md2 border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink-body outline-none focus:border-mint-deep"
              />
            </div>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink-heading">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md2 border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink-body outline-none focus:border-mint-deep"
              />
            </div>
            <div>
              <label htmlFor="message" className="mb-1.5 block text-[13px] font-medium text-ink-heading">
                Message
              </label>
              <textarea
                id="message"
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full resize-none rounded-md2 border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink-body outline-none focus:border-mint-deep"
              />
            </div>
            <button type="submit" className="btn-primary rounded-full !py-3">
              Write this as an email
            </button>
            <p className="text-center text-[12.5px] text-ink-muted">
              This opens your email app with the message ready to send to {BUSINESS.supportEmail}.
            </p>
          </form>
        )}

        <p className="mt-8 text-[13px] text-ink-muted">
          Refund or Money-Back Guarantee question? Check our{" "}
          <a href="/refund" className="font-semibold text-mint-deep">
            Refund and Cancellation Policy
          </a>{" "}
          first — most answers are there.
        </p>
      </div>
    </section>
  );
}
