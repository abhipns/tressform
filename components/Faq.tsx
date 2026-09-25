const FAQS = [
  {
    q: "How accurate is the face-shape detection?",
    a: "We combine measurements from all three of your photos, so the read on your face shape is far more reliable than a single selfie. It's very good at spotting your shape and proportions — but it's a starting point for a great haircut conversation, not a lab measurement.",
  },
  {
    q: "Is the preview a guarantee of how I'll look?",
    a: "No. Your preview is a close, realistic guide based on your photos — but real hair texture, growth pattern, and your barber's hand will always add small differences. Think of it as a very confident sneak peek, not a promise.",
  },
  {
    q: "Are my photos safe?",
    a: "Yes. Your photos are encrypted, only used to generate your own results, never used to train our AI, and deleted after a set period. You can request deletion at any time — see our Privacy Policy for details.",
  },
  {
    q: "What happens after I use my 2 free previews?",
    a: "Your 2 free previews are a one-time, lifetime allowance per account — they don't refresh, even once you buy a paid pack. Both stay visible at low resolution in your history. To unlock full-resolution results and instructions, choose a paid plan.",
  },
  {
    q: "Are the prices GST-inclusive?",
    a: "Yes — every price shown (Starter Pack, Style Pack, Complete Pack, Full Explore, and the My Assets add-on) already includes 18% GST. There's nothing added at checkout.",
  },
  {
    q: "What's your refund policy?",
    a: "Refunds only apply if a technical glitch prevents the app from generating your images at all, even after multiple attempts. Once the app successfully generates your images, there is no refund — including if you simply don't download them.",
  },
  {
    q: "What does \"Coming Soon\" on Full Explore mean?",
    a: "Full Explore — hairstyle, beard, glasses, and hair colour together, for up to 15 generations — is a plan we're actively building. You can see the price now, but it isn't purchasable yet. (Background and outfit swaps are separate My Assets add-ons, priced per photo.)",
  },
  {
    q: "How does Refer & Earn work?",
    a: "Share your referral link or code. When someone you referred makes their very first purchase (any pack), you earn 10% of our profit on that order. Later purchases by the same customer don't pay out again — the reward applies once, per referred customer.",
  },
  {
    q: "Does this work well for all hair types?",
    a: "Tressform is trained to work across straight, wavy, curly, and coily hair types. If a result ever looks off for your hair type, let us know — it helps us keep improving.",
  },
  {
    q: "How long do you keep my photos?",
    a: "Photos are kept only as long as needed to generate and store your results, then automatically deleted after a set period. You can also request immediate deletion at any time.",
  },
];

export default function Faq() {
  return (
    <section id="faq" className="wrap py-[70px]">
      <div className="section-head">
        <p className="eyebrow">FAQ</p>
        <h2>Questions, Answered</h2>
      </div>
      <div className="mx-auto flex max-w-[760px] flex-col gap-2.5">
        {FAQS.map((item) => (
          <details key={item.q} className="rounded-sm2 border border-line bg-surface p-4 px-5 [&_summary::-webkit-details-marker]:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3.5 text-[15px] font-semibold text-ink-heading">
              {item.q}
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-mint-pale text-[14px] font-bold text-mint-deep">
                +
              </span>
            </summary>
            <p className="mt-3 text-[13.5px] leading-[1.6] text-ink-body">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
