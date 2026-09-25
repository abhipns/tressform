// Thin bar above the header (Part B: "New: announcement strip"). Ratings and
// download counts are launch aspirations, not measured stats — labeled
// plainly as goals, never presented as real numbers.

export default function AnnouncementStrip() {
  return (
    <div className="bg-lilac text-white">
      <div className="wrap flex flex-wrap items-center justify-center gap-x-3 gap-y-1 py-2 text-center text-[12.5px] font-medium">
        <span>Personalized Hairstyles &amp; AI Try-On</span>
        <span className="opacity-60">|</span>
        <span>4.8★ Rating (goal)</span>
        <span className="opacity-60">|</span>
        <span>10M+ Downloads (goal)</span>
        <span className="ml-2 inline-flex items-center gap-2">
          <a
            href="#"
            className="rounded-full bg-white/15 px-3 py-1 text-[11.5px] font-semibold hover:bg-white/25"
          >
            Get it on Android
          </a>
          <span className="rounded-full border border-white/25 px-3 py-1 text-[11.5px] font-semibold opacity-70">
            Apple — Coming soon
          </span>
        </span>
      </div>
    </div>
  );
}
