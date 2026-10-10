// `size="lg"` is the header's version (10.10.2026): a little larger so the
// brand holds its own in the wider header. The footer keeps the default.
export default function Logo({ variant = "light", size = "md" }: { variant?: "light" | "dark"; size?: "md" | "lg" }) {
  const mark = size === "lg" ? "h-[34px] w-[34px] lg:h-[40px] lg:w-[40px]" : "h-[34px] w-[34px]";
  const word = size === "lg" ? "text-[20px] lg:text-[23px]" : "text-[20px]";
  return (
    <a href="#top" aria-label="Tressform home" className="flex items-center gap-2.5">
      <svg viewBox="0 0 100 100" fill="none" className={`${mark} shrink-0`} xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(50,50)">
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#FFFFFF" />
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#E9E4F5" transform="rotate(72)" />
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#8FE3C3" transform="rotate(144)" />
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#E9E4F5" transform="rotate(216)" />
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#8FE3C3" transform="rotate(288)" />
          <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
        </g>
      </svg>
      <span className={`font-heading ${word} font-semibold tracking-[-0.01em] ${variant === "light" ? "text-white" : "text-ink-heading"}`}>
        Tressform
      </span>
    </a>
  );
}
