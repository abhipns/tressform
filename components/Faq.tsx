import { Band, Rail } from "./Section";

// The three questions below (Master Section Plan doc, row 22) were added to
// close out that row — the doc names these by wording, so they're added
// verbatim as questions with answers consistent with the rest of the FAQ
// (Honest Expectations framing, Guided Haircut / barber-instruction card,
// and the "no fabricated results, 2 free previews" rules already
// established elsewhere on the page).
const FAQS = [
  {
    q: "Will it actually look like me?",
    a: "Yes — your preview is generated from your own photo, not a generic model. It reads your actual face shape, hair texture, and proportions, so the result is recognizably you wearing the new style. It's a very close, realistic guide — not a lab-exact promise, since real hair and your barber's hand always add small differences.",
  },
  {
    q: "Will my barber understand what I want?",
    a: "That's what the barber instructions are for. Every style on your list comes with the cut written out in words a barber uses: the lengths in centimetres and how the sides and back are cut. Show that on your phone together with your preview picture, and there is very little left to guess.",
  },
  {
    q: "What if I don't like any of the styles?",
    // 10.10.2026: no longer mentions "different questions in the assessment
    // step" — those option buttons were removed from the upload step.
    a: "Your list of matched hairstyles is free, so you see what we suggest before paying anything. You buy a pack only if there are styles on it you want to see on your own photo, and you choose which ones.",
  },
  {
    q: "How accurate is the face-shape detection?",
    a: "Your selfie is read twice, separately, comparing your forehead, cheekbones, jaw and face length; if the two readings disagree, the measurements decide. It's very good at spotting your shape and proportions — but it's a starting point for a great haircut conversation, not a lab measurement. You can also change the face shape yourself on your results.",
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
    q: "What is free, and what do I pay for?",
    a: "Having your photo read and seeing your own list of matched hairstyles are free. Seeing a style on your own photo is paid: the Starter Pack gives you 4 previews and the Style Pack 10, and you pick which styles to use them on. Each preview comes with the words to give your barber.",
  },
  {
    // 10.10.2026: was "Are the prices GST-inclusive?". Tressform isn't
    // GST-registered yet, so it can't say prices include GST. Restore the
    // GST wording here when GST_REGISTERED (lib/pricing.ts) becomes true.
    q: "Is anything added to the price at checkout?",
    a: "No — the price shown for each plan (Starter Pack, Style Pack, Full Explore, and the My Assets add-on) is the full amount you pay. It's a one-time payment, not a subscription, and nothing is added at checkout.",
  },
  {
    q: "What is Early Bird pricing?",
    a: "₹199 (Starter Pack) and ₹399 (Style Pack) are limited launch prices, available until 31 December 2026. From 1 January 2027, new purchases are charged the regular price — ₹249 and ₹499. If you've already bought a pack at the Early Bird price, your purchase keeps its original price and photo count — the change only affects new purchases made after the cutoff.",
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

// 10.10.2026 design pass: questions are a plain list divided by hairlines
// (was 14 separate white boxes), with larger text, and the heading sits on
// the left with a way to ask something that isn't listed.
export default function Faq() {
  return (
    <Band id="faq" tone="cream">
      <Rail
        heading="Questions, answered."
        aside={
          <p className="mt-5 max-w-[40ch] text-[16.5px] leading-[1.6]">
            Something else on your mind?{" "}
            <a
              href="/contact"
              className="font-semibold text-mint-deep underline decoration-mint/40 underline-offset-[6px] hover:decoration-mint-deep"
            >
              Ask us
            </a>
            .
          </p>
        }
      >
        <div className="border-t border-line">
          {FAQS.map((item) => (
            <details key={item.q} className="group border-b border-line [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-start justify-between gap-5 py-5 font-heading text-[18.5px] font-semibold leading-snug text-ink-heading focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-deep">
                {item.q}
                <span
                  className="relative mt-1 h-[18px] w-[18px] shrink-0 text-mint-deep before:absolute before:left-0 before:top-1/2 before:h-[2px] before:w-full before:-translate-y-1/2 before:rounded-full before:bg-current after:absolute after:left-1/2 after:top-0 after:h-full after:w-[2px] after:-translate-x-1/2 after:rounded-full after:bg-current after:transition-transform group-open:after:scale-y-0"
                  aria-hidden="true"
                />
              </summary>
              <p className="max-w-[68ch] pb-6 text-[16px] leading-[1.65]">{item.a}</p>
            </details>
          ))}
        </div>
      </Rail>
    </Band>
  );
}
