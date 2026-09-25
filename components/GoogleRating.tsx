// Master Section Plan doc, row 20 "Real Results + Customer Stories" —
// expanded per that row's core content beyond a single star-rating
// placeholder: each story should show a before/AI/after triad + the
// customer's own feedback + the haircut outcome, with a punchline above the
// section. Resolved via an earlier comment: only real beta reviews from
// 10–20 real early users, never fabricated ones — BETA_STORIES stays an
// empty array (not filled with invented placeholder people/quotes) until
// real stories exist; the empty state below explains what will appear here
// instead of silently rendering nothing.

interface CustomerStory {
  name: string; // first name / initial only, with the customer's permission — same consent bar as the carousel
  beforeSrc: string;
  aiSrc: string;
  afterSrc: string;
  feedback: string;
  haircutOutcome: string; // e.g. "Textured crop, done at a partner salon in Bangalore"
}

const BETA_STORIES: CustomerStory[] = [];

export default function GoogleRating() {
  return (
    <section className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">What Early Users Say</p>
        <p className="mb-1 text-[15px] font-semibold text-mint-deep">Real people. Real haircuts. No stock photos.</p>
        <h2>Real Results, Real Stories</h2>
        <p>
          Each story here is a real before/AI-preview/after set from an actual early user, plus their own feedback on
          how the haircut turned out — no fabricated ratings or testimonials, ever.
        </p>
      </div>

      {BETA_STORIES.length === 0 ? (
        <div className="mx-auto max-w-[600px] rounded-md2 border border-line bg-surface p-6 text-center text-[13.5px] text-ink-muted">
          We&apos;re running a small beta with 10–20 real early users. Once their before/AI/after sets and feedback come
          in, they&apos;ll replace this note — nothing invented in the meantime.
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {BETA_STORIES.map((story) => (
            <div key={story.name} className="rounded-lg2 border border-line bg-surface p-4">
              <div className="mb-3 grid grid-cols-3 gap-1.5">
                {[story.beforeSrc, story.aiSrc, story.afterSrc].map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={i} src={src} alt="" className="aspect-square rounded-sm2 object-cover" />
                ))}
              </div>
              <p className="mb-1 text-[12px] font-semibold text-ink-heading">{story.name}</p>
              <p className="mb-2 text-[13px] leading-[1.5] text-ink-body">&ldquo;{story.feedback}&rdquo;</p>
              <p className="text-[11.5px] text-ink-muted">{story.haircutOutcome}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
