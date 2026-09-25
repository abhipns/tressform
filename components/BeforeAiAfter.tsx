// Part G — "Before, AI, After" showcase (renamed from "Feature Yourself").
// Card structure: 3 images (Before / AI-generated / After-at-salon) per
// featured customer. Sharing one earns 5 credits (1 credit = 1 style unlock).

const FEATURED = [
  { name: "Aarav", style: "Textured Quiff — Low Taper" },
  { name: "Meera", style: "Curl Definition Crop" },
  { name: "Rohan", style: "Classic Crop — Mid Fade" },
];

function placeholderTile(label: string, tone: string) {
  return (
    <div className="flex flex-1 flex-col items-center gap-1.5">
      <div className={`flex aspect-[0.8/1] w-full items-center justify-center rounded-[10px] ${tone} text-[11px] font-semibold text-white/90`}>
        {label}
      </div>
      <span className="text-[10.5px] font-semibold text-ink-muted">{label}</span>
    </div>
  );
}

export default function BeforeAiAfter() {
  return (
    <section className="wrap py-16">
      <div className="section-head">
        <p className="eyebrow">Real Results</p>
        <h2>Before, AI, After</h2>
        <p>
          See a real customer&apos;s original photo, the AI preview Tressform generated for them, and the haircut their
          salon actually delivered — side by side.
        </p>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {FEATURED.map((f) => (
          <div key={f.name} className="card">
            <div className="mb-4 flex gap-2">
              {placeholderTile("Before", "bg-ink-heading/70")}
              {placeholderTile("AI Preview", "bg-mint-deep/80")}
              {placeholderTile("After (Salon)", "bg-lilac/80")}
            </div>
            <p className="text-[14px] font-semibold text-ink-heading">{f.name}</p>
            <p className="text-[12.5px] text-ink-muted">{f.style}</p>
          </div>
        ))}
      </div>
      <p className="mt-8 text-center text-[13.5px] text-ink-muted">
        Share your own before/AI/after and earn <strong className="text-ink-heading">5 credits</strong> (1 credit =
        &#8377;1, usable at partner salons or toward more generations) once it&apos;s approved. Limit one upload per
        account per month.
      </p>
    </section>
  );
}
