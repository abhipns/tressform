const POINTS = [
  { title: "Never used for AI training.", body: "Your photos are only used to generate your own results — never to train our models." },
  { title: "Deleted automatically.", body: "Uploaded photos are removed from our servers after a set period." },
  { title: "Encrypted, always.", body: "Your photos are encrypted both in transit and at rest." },
  { title: "Delete anytime.", body: "You can request full deletion of your photos and data whenever you like." },
];

export default function Trust() {
  return (
    <section className="bg-bg-soft py-[60px]">
      <div className="wrap grid items-center gap-11 md:grid-cols-2">
        <div>
          <h2 className="mb-3.5 text-[clamp(24px,3.2vw,32px)]">Your Photos Stay Private. Always.</h2>
          <p className="mb-4.5 mb-[18px] text-[14.5px] leading-[1.6] text-ink-body">
            We built Tressform so you never have to think twice about uploading your face. Here&apos;s exactly what
            happens to your photos.
          </p>
          <ul className="flex flex-col gap-4">
            {POINTS.map((p) => (
              <li key={p.title} className="flex items-start gap-3">
                <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full bg-mint-pale text-mint-deep">
                  ✓
                </span>
                <span className="text-[14px] text-ink-body">
                  <strong className="text-ink-heading">{p.title}</strong> {p.body}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-5">
            <a href="#" className="font-semibold text-mint-deep">
              Read our Privacy Policy →
            </a>
          </p>
        </div>
        <div className="rounded-lg2 bg-gradient-to-br from-white to-mint-pale p-9 text-center shadow-card">
          <svg viewBox="0 0 200 200" fill="none" className="mx-auto w-full max-w-[240px]">
            <circle cx="100" cy="100" r="86" fill="#fff" />
            <path d="M100 46a54 54 0 0 1 54 54v18a54 54 0 0 1-108 0v-18a54 54 0 0 1 54-54Z" fill="#DDF3EA" />
            <path d="M76 96c0-14 10-24 24-24s24 10 24 24" stroke="#3AA486" strokeWidth="4" fill="none" strokeLinecap="round" />
            <rect x="80" y="98" width="40" height="30" rx="6" fill="#3B2760" />
            <circle cx="100" cy="112" r="4" fill="#8FE3C3" />
          </svg>
        </div>
      </div>
    </section>
  );
}
