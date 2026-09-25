export default function Logo({ variant = "light" }: { variant?: "light" | "dark" }) {
  return (
    <a href="#top" aria-label="Tressform home" className="flex items-center gap-2.5">
      <svg viewBox="0 0 100 100" fill="none" className="h-[34px] w-[34px] shrink-0" xmlns="http://www.w3.org/2000/svg">
        <g transform="translate(50,50)">
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#FFFFFF" />
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#E9E4F5" transform="rotate(72)" />
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#8FE3C3" transform="rotate(144)" />
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#E9E4F5" transform="rotate(216)" />
          <ellipse cx="0" cy="-24" rx="11" ry="21" fill="#8FE3C3" transform="rotate(288)" />
          <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
        </g>
      </svg>
      <span className={`font-heading text-[20px] font-semibold ${variant === "light" ? "text-white" : "text-ink-heading"}`}>
        Tressform
      </span>
    </a>
  );
}
