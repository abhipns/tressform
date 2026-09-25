"use client";

// Header — per the Master Section Plan doc's Row 1, Open Conflict #2.
// Trimmed 23.09.2026 from the earlier 5-link version to 4 direct links
// (How It Works, Hairstyles, Salons, Pricing), per the strategy call in
// chat: a luxury, conversion-focused header should carry as few competing
// decisions as possible — one primary CTA ("Get Started"), not five nav
// items plus two app badges plus a hamburger all fighting for attention.
//
// Changes from the 5-link version:
//  - Hair Care dropped from direct links entirely (it's content-marketing
//    material, not a conversion path — lives on the blog instead).
//  - Salons kept as a direct link (not demoted to the ☰ menu) since it's
//    the site's second revenue stream (platform fee on salon bookings),
//    not a secondary feature.
//  - Refer & Earn and Blog stay in the ☰ menu — retention/growth actions,
//    not first-visit priorities.
//
// 24.09.2026: the Android download button moved back into the header's
// visible foreground, placed just before Log in (per your call) — same
// responsive treatment as Log in itself: visible at sm+, tucked into the
// ☰ menu on mobile instead of taking header space there. Apple stays
// ☰-menu-only since it's a "Coming soon" placeholder, not a real download
// yet, so it doesn't need header real estate.
//
// Quick Checkout is gone everywhere (Open Conflict #3, already confirmed)
// — replaced by "Get Started" as the header CTA, matching the Hero's
// "Try It Free" language elsewhere on the page.

import { useState } from "react";
import Logo from "./Logo";

const DIRECT_LINKS = [
  { href: "#how", label: "How It Works" },
  { href: "#browse", label: "Hairstyles" },
  { href: "#salons", label: "Salons" },
  { href: "#pricing", label: "Pricing" },
];

const MENU_LINKS = [
  { href: "/refer", label: "Refer & Earn" },
  { href: "/blog", label: "Blog" },
  { href: "#haircare", label: "Hair Care" },
];

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-gradient-to-b from-header-dark to-header-dark-2">
      <div className="wrap flex h-[72px] items-center justify-between gap-6">
        <Logo variant="light" />

        <nav className="hidden items-center gap-6 lg:flex">
          {DIRECT_LINKS.map((link) => (
            <a key={link.href} href={link.href} className="text-[14.5px] font-medium text-white/80 transition hover:text-white">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="#"
            aria-label="Get it on Google Play"
            className="hidden items-center gap-1.5 text-[14.5px] font-medium text-white/85 hover:text-white sm:inline-flex"
          >
            ▶ Android
          </a>

          <a href="/login" className="hidden text-[14.5px] font-medium text-white/85 hover:text-white sm:inline">
            Log in
          </a>

          <a href="#upload" className="btn-primary rounded-full !py-2.5 !px-5 text-[14.5px]">
            Get Started
          </a>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="More menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/85 hover:text-white"
            >
              ☰
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-[calc(100%+10px)] w-[220px] rounded-md2 border border-white/10 bg-header-dark-2 py-2 shadow-card"
                onMouseLeave={() => setMenuOpen(false)}
              >
                {MENU_LINKS.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="block px-4 py-2 text-[14px] text-white/80 hover:bg-white/5 hover:text-white"
                    onClick={() => setMenuOpen(false)}
                  >
                    {link.label}
                  </a>
                ))}

                <div className="my-1.5 h-px bg-white/10" />

                {/* sm:hidden — Android now has its own header link just before Log in at sm+;
                    this stays only for mobile, where the header hides it. */}
                <a
                  href="#"
                  className="flex items-center gap-1.5 px-4 py-2 text-[14px] text-white/80 hover:bg-white/5 hover:text-white sm:hidden"
                  aria-label="Get it on Google Play"
                  onClick={() => setMenuOpen(false)}
                >
                  ▶ Get it on Android
                </a>
                <span
                  className="flex cursor-default items-center gap-1.5 px-4 py-2 text-[14px] text-white/40"
                  aria-label="iOS app coming soon"
                >
                   Apple · Coming soon
                </span>

                <div className="my-1.5 h-px bg-white/10 sm:hidden" />
                <a href="/login" className="block px-4 py-2 text-[14px] text-white/80 hover:bg-white/5 hover:text-white sm:hidden">
                  Log in
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
