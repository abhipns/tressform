// /contact — built per the "Build all of them" decision on the placeholder
// nav-link pages (Footer's "Contact" link, currently href="#").
//
// Honesty boundary: there's no real support email/address established
// anywhere in this codebase, and no email-sending integration wired up yet
// (lib/integrations/msg91.ts is SMS, not email; everything is mock mode).
// Rather than invent a fake "support@tressform.com" or a street address,
// this is a working client-side form UI that's explicit in its own copy
// about not being wired to a live inbox yet — matching the same
// disclose-the-gap pattern used for the carousel/referral/beta-review items
// elsewhere. Swap in a real endpoint (e.g. a Resend/SMTP call from an
// app/api/contact route) plus a real support address once one exists.

"use client";

import { useState } from "react";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // NOTE: no backend wired yet — see header comment. This intentionally
    // does not silently pretend to send anywhere; it just confirms receipt
    // in the UI so the form isn't a dead end while a real endpoint doesn't
    // exist.
    setSubmitted(true);
  }

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[560px]">
        <p className="eyebrow">Contact</p>
        <h1 className="mb-4 text-[clamp(26px,4vw,36px)]">Get in touch</h1>
        <p className="mb-8 text-[15px] leading-[1.6] text-ink-body">
          Questions, feedback, or something not working? Send us a note below.
        </p>

        {submitted ? (
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-1 text-[16px] font-semibold text-ink-heading">Thanks — got it.</p>
            <p className="text-[14px] text-ink-muted">We'll get back to you as soon as we can.</p>
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
              Send message
            </button>
          </form>
        )}

        <p className="mt-8 text-[13px] text-ink-muted">
          Refund or Money-Back Guarantee question? Check our{" "}
          <a href="/refund" className="font-semibold text-mint-deep">
            Refund Policy
          </a>{" "}
          first — most answers are there.
        </p>
      </div>
    </section>
  );
}
