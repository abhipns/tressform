// Part J — Google Rating / UGC results section. Resolved via comment: run a
// small beta with 10–20 real early users and show their real reviews. No
// fabricated reviews or star ratings — this section is intentionally empty
// of invented testimonials until real beta reviews exist.

export default function GoogleRating() {
  return (
    <section className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">What Early Users Say</p>
        <h2>Real Reviews, Coming Soon</h2>
        <p>
          We&apos;re running a small beta with real early users and will publish their real reviews here — no
          fabricated ratings or testimonials, ever.
        </p>
      </div>
      <div className="mx-auto max-w-[600px] rounded-md2 border border-line bg-surface p-6 text-center text-[13.5px] text-ink-muted">
        Beta reviews will appear here once collected from real users.
      </div>
    </section>
  );
}
