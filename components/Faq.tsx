// The three questions below (Master Section Plan doc, row 22) were added to
// close out that row — the doc names these by wording, so they're added
// verbatim as questions with answers consistent with the rest of the FAQ
// (Honest Expectations framing, Guided Haircut / barber-instruction card,
// and the "no fabricated results, 2 free previews" rules already
// established elsewhere on the page).
const FAQS = [
  {
    q: "Will it actually look like me?",
    a: "Yes — your preview is generated from your own three photos, not a generic model. It reads your actual face shape, hair texture, and proportions, so the result is recognizably you wearing the new style. It's a very close, realistic guide — not a lab-exact promise, since real hair and your barber's hand always add small differences.",
  },
  {
    q: "Will my barber understand what I want?",
    a: "That's the point of the barber-instruction card — it doesn't just show a picture, it spells out the cut in inches and centimetres, names the cutting technique, and notes what to watch for with your hair type. Bring that card in (or show it on your phone) and there's no guesswork for your barber either.",
  },
  {
    q: "What if I don't like any of the styles?",
    a: "You keep your 2 free previews either way — they're yours to keep exploring with. If none of your matches feel right, you can try different questions in the assessment step (occasion, maintenance preference, desired look) to get a different set of matches before deciding on a paid pack.",
  },
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
    a: "Your 2 free previews are a one-time, lifetime allowance per account — they don't refresh, even once you buy a paid pack. Both stay visible at low resolution in your history until then. The moment you buy any pack, those same 2 free previews become available in full, high-resolution quality — along with full barber-ready instructions.",
  },
  {
    q: "Are the prices GST-inclusive?",
    a: "Yes — every price shown (Starter Pack, Style Pack, Full Explore, and the My Assets add-on) already includes 18% GST. There's nothing added at checkout.",
  },
  {
    q: "What is Early Bird pricing?",
    a: "₹199 (Starter Pack) and ₹399 (Style Pack) are limited launch prices, available until 31 October 2026. From 1 November 2026, new purchases are charged the regular price — ₹249 and ₹499. If you've already bought a pack at the Early Bird price, your purchase keeps its original price and photo count — the change only affects new purchases made after the cutoff.",
  },
  {
    q: "What's your refund policy?",
    a: "You get a 100% refund if a technical glitch prevents the app from generating your images at all, even after multiple attempts. Once the app successfully generates your images, there is no refund — including if you simply don't download them.",
  },
  {
    q: "What does \"Coming Soon\" on Full Explore mean?",
    a: "Full Explore — hairstyle, beard, glasses, and hair colour together, for up to 15 generations — is a plan we're actively building. You can see the price now, but it isn't purchasable yet. (Background and outfit swaps are separate My Assets add-ons, priced per photo.)",
  },
  {
    q: "How does Refer & Earn work?",
    a: "Share your referral link or code. When someone you referred makes their very first purchase, you earn flat Tressform credits — 20 credits for Starter Pack, 40 for Style Pack, or 100 for Full Explore (1 credit = ₹1) — but only if that first purchase is one of those packs (a My Assets-only first purchase doesn't qualify). Credits aren't cash — spend them at partner salons or on more generations. Later purchases by the same customer don't earn credits again — the reward applies once, per referred customer. Credits earned are capped at ₹15,000 per financial year per account.",
  },
  {
    q: "Does this work well for all hair types?",
    a: "Tressform is trained to work across straight, wavy, curly, and coily hair types. If a result ever looks off for your hair type, let us know — it helps us keep improving.",
  },
  {
    q: "How long do you keep my photos?",
    a: "Photos are kept only as long as needed to generate and store your results, then automatically deleted after 90 days. You can also request immediate deletion at any time.",
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
