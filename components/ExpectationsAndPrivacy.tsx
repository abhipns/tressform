// What to expect, and what happens to your photos — the two reassurances.
//
// 10.10.2026 design pass: merges "Honest expectations" (HonestExpectations.tsx)
// and "Your photos stay private" (Trust.tsx) into one lighter band, one
// after the other.
//   - Expectations is a side-by-side comparison, so it is set as one: each
//     row pairs what the preview shows with what real hair does. The old
//     layout listed the two sides in separate boxes under two empty picture
//     frames.
//   - Privacy is four plain commitments. The padlock drawing is gone; the
//     words do the work.
// The wording of every point is unchanged. Each half keeps its own anchor
// (#expectations is linked from the Refund and Money-Back pages).

import { Rail } from "./Section";

const PAIRS = [
  {
    shows: "The exact haircut shape, length, and silhouette on your face",
    reality: "Real hair has its own texture and growth pattern, so the finished look softens slightly in person",
  },
  {
    shows: "How the style looks on you from the front",
    reality: "Your barber's hand and technique add small, natural differences the preview can't capture",
  },
  {
    shows: "A confident, realistic guide to help you and your barber agree on direction",
    reality: "It's a very close sneak peek, not a lab-exact guarantee of the final result",
  },
];

const PRIVACY = [
  { title: "Never used for AI training.", body: "Your photos are only used to generate your own results — never to train our models." },
  {
    title: "Deleted automatically after 90 days.",
    body: "Uploaded photos are auto-deleted 90 days after upload, unless your account is still active and using them — then they're kept only as long as you keep using them. Previews you have paid for stay in your account.",
  },
  { title: "Encrypted, always.", body: "Your photos are encrypted both in transit and at rest." },
  {
    title: "Delete anytime.",
    body: "You can request full deletion of your photos and data whenever you like — it doesn't have to wait for the 90-day auto-delete.",
  },
];

export default function ExpectationsAndPrivacy() {
  return (
    <div className="bg-bg-soft text-ink-body">
      <section id="expectations" className="frame pb-14 pt-16 sm:pt-20 lg:pb-20 lg:pt-28">
        <Rail
          heading="A close, realistic preview. Not a promise."
          lead="Think of your preview as a very confident sneak peek, not a guarantee."
        >
          <div className="hidden grid-cols-2 gap-x-10 border-b border-line pb-3 sm:grid">
            <p className="font-heading text-[18px] font-semibold text-ink-heading">What the preview shows</p>
            <p className="font-heading text-[18px] font-semibold text-ink-heading">What real hair does</p>
          </div>
          <ul>
            {PAIRS.map((p) => (
              <li key={p.shows} className="grid gap-x-10 gap-y-3 border-b border-line py-5 sm:grid-cols-2">
                <p className="text-[16px] leading-[1.55] text-ink-heading">
                  <span className="mb-1 block text-[13.5px] font-semibold text-mint-deep sm:hidden">The preview shows</span>
                  {p.shows}
                </p>
                <p className="text-[16px] leading-[1.55]">
                  <span className="mb-1 block text-[13.5px] font-semibold text-ink-muted sm:hidden">Real hair</span>
                  {p.reality}
                </p>
              </li>
            ))}
          </ul>
        </Rail>
      </section>

      <section id="privacy" className="frame pb-16 pt-14 sm:pb-20 lg:pb-28 lg:pt-20">
        <div className="border-t border-line pt-14 lg:pt-20">
          <Rail
            heading="Your photos stay private. Always."
            lead="We built Tressform so you never have to think twice about uploading your face. Here's exactly what happens to your photos."
            aside={
              <p className="mt-6">
                <a
                  href="/privacy"
                  className="text-[16px] font-semibold text-mint-deep underline decoration-mint/40 underline-offset-[6px] hover:decoration-mint-deep"
                >
                  Read our Privacy Policy
                </a>
              </p>
            }
          >
            <dl className="border-t border-line">
              {PRIVACY.map((p) => (
                <div key={p.title} className="grid gap-x-8 gap-y-1 border-b border-line py-5 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <dt className="font-heading text-[19px] font-semibold leading-snug text-ink-heading">{p.title}</dt>
                  <dd className="text-[15.5px] leading-[1.6]">{p.body}</dd>
                </div>
              ))}
            </dl>
          </Rail>
        </div>
      </section>
    </div>
  );
}
