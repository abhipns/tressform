// Master Section Plan doc, row 23 "Final Confidence CTA". Closing repeat of
// the hero's CTA — copy changed per that row's core content: was "Find My
// Perfect Cut" repeated verbatim from the Hero, now "See What Actually
// Suits You" so the closing CTA doesn't just parrot the opening one.
// "Quick Checkout" removed per the Master Section Plan doc's Open Conflict
// #3 — confirmed removed everywhere.

export default function FinalCta() {
  return (
    <section className="wrap py-16 text-center">
      <h2 className="mx-auto max-w-[640px] text-[clamp(24px,3.6vw,36px)]">Ready to see what actually suits you?</h2>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3.5">
        <a href="#upload" className="btn-primary">
          See What Actually Suits You
        </a>
      </div>
    </section>
  );
}
