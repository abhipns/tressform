// The closing call — the last thing before the footer.
//
// 10.10.2026 design pass: a dark band that runs straight into the footer,
// so the page ends the way it opens. Same question as before, larger; the
// button carries the one name used for this action everywhere ("Try it
// free") instead of repeating the headline.

export default function FinalCta() {
  return (
    <section className="bg-[#16261C] text-white/75">
      <div className="frame py-20 lg:py-32">
        <h2 className="max-w-[18ch] font-heading text-[clamp(36px,5vw,76px)] font-semibold leading-[1] tracking-[-0.012em] text-white">
          Ready to see what actually suits you?
        </h2>
        <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4">
          <a href="#upload" className="btn-amber">
            Try it free
          </a>
          <p className="text-[15px] text-white/60">Your first preview is free. No card needed.</p>
        </div>
      </div>
    </section>
  );
}
