// Header — per the revised landing-page sequence (Part B "Update"), the nav
// is now: How It Works / Hairstyles / Salons / Hair Care / FAQ, with Quick
// Checkout + Get Started as the two right-side CTAs. "Browse Styles" and
// "Hairstyles" are the same link, renamed, per the doc's own flagged
// resolution. Salons and Hair Care point at their new homepage sections
// (still front-end stubs until Part M's backend / Part J's affiliate table
// exist — see those sections' own components).

import Logo from "./Logo";

const NAV_LINKS = [
  { href: "#how", label: "How It Works" },
  { href: "#browse", label: "Hairstyles" },
  { href: "#salons", label: "Salons" },
  { href: "#haircare", label: "Hair Care" },
  { href: "#faq", label: "FAQ" },
];

export default function Header() {
  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-gradient-to-b from-header-dark to-header-dark-2">
      <div className="wrap flex h-[72px] items-center justify-between gap-6">
        <Logo variant="light" />
        <nav className="hidden items-center gap-[26px] md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-[14.5px] font-medium text-white/80 transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a href="#pricing" className="hidden text-[14.5px] font-medium text-white/85 hover:text-white sm:inline">
            Quick Checkout
          </a>
          <a href="#upload" className="btn-primary rounded-full !py-2.5 !px-5 text-[14.5px]">
            Get Started
          </a>
        </div>
      </div>
    </header>
  );
}
