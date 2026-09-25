// Part J — "Our holistic approach": three pointers tying the AI match to a
// real-world outcome, not just a picture.

const POINTS = [
  {
    title: "Right cut for your face",
    body: "The AI match is built on your actual face shape and features — not a generic trend list.",
  },
  {
    title: "Right maintenance for your life",
    body: "Wash and trim guidance (see Part F) so the style still looks right weeks after you leave the chair.",
  },
  {
    title: "Right styling to finish it",
    body: "Product and technique tips tie the look together, from the cut through to how you style it day to day.",
  },
];

export default function HolisticApproach() {
  return (
    <section className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">Our Approach</p>
        <h2>Our Holistic Approach</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {POINTS.map((p) => (
          <div key={p.title} className="card">
            <h4 className="mb-1.5 text-[16px]">{p.title}</h4>
            <p className="text-[14px] leading-[1.55] text-ink-body">{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
