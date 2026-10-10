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
//
// 09.10.2026: "Log in" now reflects the real session — once a customer is
// signed in it becomes "Log out" (same two places: the sm+ header link and
// the mobile ☰ menu). Mock mode has no sessions, so it always shows Log in.

//
// 10.10.2026 — layout pass ("it looks very close… expand it like a
// professional website"). On a wide screen everything sat squeezed into the
// 1180px page column with 24px between links. Now:
//   - the header has its own, wider column (up to 1440px) with more side
//     padding, and is a little taller on desktop (72 → 84px);
//   - three zones — logo, links, actions — spread evenly across that
//     column, and nothing is allowed to wrap onto a second line;
//   - links are spaced further apart and get a thin underline on hover;
//   - a hairline separates the text links (Android, Log in) from the button;
//   - the "▶" character is a drawn icon, so it looks the same on every device.
// Phones and tablets keep the compact two-zone bar. Nothing about what the
// header contains or where the links go has changed.

import { useState } from "react";
import Logo from "./Logo";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/lib/authClient";

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
  const { session } = useSession();

  async function handleLogout() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  return (
    <header className="sticky top-0 z-[100] border-b border-white/[0.06] bg-gradient-to-b from-header-dark to-header-dark-2">
      <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-5 whitespace-nowrap px-5 sm:px-8 lg:h-[84px] xl:px-12">
        <Logo variant="light" size="lg" />

        <nav className="hidden items-center gap-7 lg:flex xl:gap-11">
          {DIRECT_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="group relative py-2 text-[14.5px] font-medium tracking-[0.01em] text-white/75 transition hover:text-white xl:text-[15px]"
            >
              {link.label}
              <span className="absolute inset-x-0 -bottom-0.5 h-[2px] origin-left scale-x-0 rounded-full bg-mint transition-transform duration-200 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3 sm:gap-4 xl:gap-6">
          <a
            href="#"
            aria-label="Get it on Google Play"
            className="hidden items-center gap-2 text-[15px] font-medium text-white/75 transition hover:text-white sm:inline-flex"
          >
            <svg viewBox="0 0 12 12" className="h-[11px] w-[11px]" fill="currentColor" aria-hidden="true">
              <path d="M2 1.1v9.8c0 .5.5.8.9.5l7.7-4.9a.6.6 0 0 0 0-1L2.9.6C2.500.3 2 .6 2 1.1Z" />
            </svg>
            Android
          </a>

          {session ? (
            <button
              type="button"
              onClick={handleLogout}
              title={session.user.email ?? undefined}
              className="hidden text-[15px] font-medium text-white/75 transition hover:text-white sm:inline"
            >
              Log out
            </button>
          ) : (
            <a href="/login" className="hidden text-[15px] font-medium text-white/75 transition hover:text-white sm:inline">
              Log in
            </a>
          )}

          <span className="hidden h-6 w-px bg-white/15 sm:block" aria-hidden="true" />

          <a href="#upload" className="btn-primary rounded-full !px-5 !py-2.5 text-[14.5px] xl:!px-7 xl:!py-3 xl:text-[15px]">
            Get Started
          </a>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              aria-label="More menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/85 transition hover:border-white/40 hover:text-white xl:h-11 xl:w-11"
            >
              <svg viewBox="0 0 18 18" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                <path d="M3 5h12M3 9h12M3 13h12" />
              </svg>
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
                {session ? (
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-[14px] text-white/80 hover:bg-white/5 hover:text-white sm:hidden"
                  >
                    Log out
                  </button>
                ) : (
                  <a href="/login" className="block px-4 py-2 text-[14px] text-white/80 hover:bg-white/5 hover:text-white sm:hidden">
                    Log in
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
