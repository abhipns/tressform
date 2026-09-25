// Part J — "How To Get Started": 1. Take the quiz (3 selfies) → 2. Get your
// matches → 3. Show your barber (or book at a partner salon).

const STEPS = [
  { title: "Take the quiz", body: "Upload 3 selfies — front, left, and right." },
  { title: "Get your matches", body: "See your AI-matched haircuts, previewed on your own face." },
  { title: "Show your barber", body: "Bring the preview and barber instructions in, or book at a partner salon." },
];

export default function GetStarted() {
  return (
    <section className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">Get Started</p>
        <h2>How To Get Started</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <div key={s.title} className="card text-center">
            <div className="mx-auto mb-3.5 flex h-[34px] w-[34px] items-center justify-center rounded-full bg-mint-pale text-[14px] font-bold text-mint-deep">
              {i + 1}
            </div>
            <h4 className="mb-1.5 text-[16px]">{s.title}</h4>
            <p className="text-[14px] leading-[1.55] text-ink-body">{s.body}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 text-center">
        <a href="#upload" className="btn-primary">
          Start Now
        </a>
      </div>
    </section>
  );
}
