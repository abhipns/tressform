// Part B (revised sequence) — section 8, "What You Get". CTA: "Get My
// Hairstyles", leading straight to plan selection/checkout per the doc.

const ITEMS = [
  { title: "Hairstyles Matched to You", body: "Recommendations tailored to your face shape and hair type." },
  { title: "Four-Side Preview", body: "Front, left, right, and back views of your selected hairstyle." },
  {
    title: "Barber-Ready Instructions",
    body: "Exact lengths, cutting technique, and styling guidance to help your barber recreate the look.",
  },
];

export default function WhatYouGet() {
  return (
    <section className="wrap py-16 text-center">
      <div className="section-head">
        <p className="eyebrow">What You Get</p>
        <h2>More than a preview</h2>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {ITEMS.map((item) => (
          <div key={item.title} className="card text-left">
            <h4 className="mb-1.5 text-[16px]">{item.title}</h4>
            <p className="text-[14px] leading-[1.55] text-ink-body">{item.body}</p>
          </div>
        ))}
      </div>
      <a href="#pricing" className="btn-primary mt-8 inline-flex">
        Get My Hairstyles
      </a>
    </section>
  );
}
