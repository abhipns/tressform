"use client";

// Header — the bar at the top of every page.
//
// WHAT'S IN IT (decisions carried over from earlier passes):
//  - four direct links (How it works, What you get, Pricing, Salons — see
//    the note above DIRECT_LINKS for how these changed)
//    (Master Section Plan row 1, trimmed 23.09.2026 — few competing choices);
//  - Refer & Earn, Blog and Hair Care are secondary, under "More";
//  - one primary button, "Try it free" (Quick Checkout is gone everywhere);
//  - the Android app link sat beside the account link (24.09.2026). It
//    went nowhere (there is no app yet), so on 11.10.2026 it was taken out;
//    the menu says both apps are coming soon instead;
//  - the account link reflects the real session (09.10.2026).
//
// 10.10.2026 — REDESIGN. The first layout pass the same day only widened the
// old bar; it still read as a narrow strip of small grey text with the links
// off-centre. This is a proper rebuild of the layout (not of what the header
// contains):
//   - edge to edge: logo at the far left, actions at the far right, and the
//     links centred on the PAGE, so they line up with the centred headings
//     below. Capped at 1760px so it doesn't fly apart on very large monitors.
//   - links are bigger and brighter, with a soft pill highlight on hover
//     instead of bare text.
//   - desktop no longer shows a "☰" button next to the main button — the
//     secondary links are a "More" dropdown in the row of links. The ☰ menu
//     is for phones and tablets only.
//   - signed in, the account shows as a round initial with a small menu
//     (email + Log out) rather than a bare "Log out" word.
//   - the bar gains a shadow and tightens slightly once the page scrolls.
// Also fixed while here:
//   - links were "#pricing"-style, which only works ON the home page; from
//     /contact, /privacy etc. they did nothing. They are "/#pricing" now.
//   - on phones the four main links weren't reachable at all (the row is
//     hidden there and the ☰ menu didn't list them). The ☰ menu now has
//     everything.
//   - menus close on a click outside or the Esc key.

import { useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { supabase } from "@/lib/supabaseClient";
import { useSession } from "@/lib/authClient";

// 10.10.2026 (design pass, later the same day): the home page was cut to ten
// sections. "Hairstyles" pointed at the cartoon-head carousel and "Hair
// Care" at a "coming soon" notice — both are off the page until there is
// real content — so "Hairstyles" became "What you get" and "Hair Care" left
// the More menu. The button is "Try it free", the one name this action has
// everywhere on the site now (it was "Get Started" here only).
const DIRECT_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#what", label: "What you get" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#salons", label: "Salons" },
];

const MENU_LINKS = [
  { href: "/refer", label: "Refer & Earn", note: "Credits for every friend who buys" },
  { href: "/blog", label: "Blog", note: "Hair advice, plainly written" },
];

type OpenMenu = null | "more" | "account" | "mobile";

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

const NAV_LINK =
  "rounded-full px-3 py-2 text-[14.5px] font-medium text-white/85 transition-colors hover:bg-white/[0.09] hover:text-white xl:px-4 xl:text-[15.5px]";
const PANEL =
  "absolute top-[calc(100%+12px)] rounded-2xl border border-white/10 bg-header-dark-2 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)]";
const PANEL_ITEM = "block rounded-xl px-3.5 py-2.5 text-[14.5px] text-white/85 transition-colors hover:bg-white/[0.07] hover:text-white";

export default function Header() {
  const [open, setOpen] = useState<OpenMenu>(null);
  const [scrolled, setScrolled] = useState(false);
  const { session } = useSession();
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (bar.current && !bar.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggle = (menu: Exclude<OpenMenu, null>) => setOpen((cur) => (cur === menu ? null : menu));
  const close = () => setOpen(null);

  async function handleLogout() {
    close();
    await supabase.auth.signOut();
    window.location.assign("/");
  }

  const email = session?.user.email ?? "";
  const initial = (email[0] ?? "•").toUpperCase();

  return (
    <header
      ref={bar}
      className={`sticky top-0 z-[100] border-b border-white/[0.07] bg-gradient-to-b from-header-dark to-header-dark-2 transition-shadow duration-300 ${
        scrolled ? "shadow-[0_10px_30px_rgba(8,16,11,0.35)]" : ""
      }`}
    >
      <div
        className={`relative mx-auto flex w-full max-w-[1760px] items-center justify-between gap-4 whitespace-nowrap px-5 transition-[height] duration-300 sm:px-8 xl:px-14 ${
          scrolled ? "h-[64px] lg:h-[72px]" : "h-[68px] lg:h-[84px]"
        }`}
      >
        <Logo variant="light" size="lg" href="/" />

        {/* Desktop links. On wide screens (1280px+) they are centred on the page
            itself; on smaller laptops there isn't room for that without
            touching the buttons on the right, so they sit evenly between. */}
        <nav className="hidden items-center gap-0.5 lg:flex xl:absolute xl:left-1/2 xl:-translate-x-1/2 xl:gap-2" aria-label="Main">
          {DIRECT_LINKS.map((link) => (
            <a key={link.href} href={link.href} className={NAV_LINK}>
              {link.label}
            </a>
          ))}
          <div className="relative">
            <button
              type="button"
              onClick={() => toggle("more")}
              aria-expanded={open === "more"}
              className={`${NAV_LINK} inline-flex items-center gap-1.5 ${open === "more" ? "bg-white/[0.09] text-white" : ""}`}
            >
              More
              <Chevron open={open === "more"} />
            </button>
            {open === "more" && (
              <div className={`${PANEL} left-1/2 w-[300px] -translate-x-1/2`}>
                {MENU_LINKS.map((link) => (
                  <a key={link.label} href={link.href} onClick={close} className={PANEL_ITEM}>
                    <span className="block font-medium text-white">{link.label}</span>
                    <span className="block text-[12.5px] text-white/55">{link.note}</span>
                  </a>
                ))}
                <div className="mx-2 my-1.5 h-px bg-white/10" />
                <span className="block px-3.5 py-2 text-[13.5px] text-white/40">Android and Apple apps · Coming soon</span>
              </div>
            )}
          </div>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3 xl:gap-4">
          {session ? (
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => toggle("account")}
                aria-expanded={open === "account"}
                aria-label="Your account"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.12] font-heading text-[15px] font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20"
              >
                {initial}
              </button>
              {open === "account" && (
                <div className={`${PANEL} right-0 w-[260px]`}>
                  <div className="px-3.5 pb-2 pt-1.5">
                    <span className="block text-[12px] text-white/50">Signed in as</span>
                    <span className="block truncate text-[14px] font-medium text-white">{email}</span>
                  </div>
                  <div className="mx-2 my-1 h-px bg-white/10" />
                  <button type="button" onClick={handleLogout} className={`${PANEL_ITEM} w-full text-left`}>
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <a href="/login" className={`${NAV_LINK} hidden sm:inline-block`}>
              Log in
            </a>
          )}

          <a
            href="/#upload"
            className="btn-primary group rounded-full !px-5 !py-2.5 text-[14.5px] lg:!px-6 lg:!py-3 lg:text-[15.5px]"
          >
            Try it free
            <svg
              viewBox="0 0 14 14"
              className="ml-2 hidden h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5 sm:block"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 7h10M8 3l4 4-4 4" />
            </svg>
          </a>

          {/* Phones and tablets: everything lives in this one menu. */}
          <div className="relative lg:hidden">
            <button
              type="button"
              onClick={() => toggle("mobile")}
              aria-expanded={open === "mobile"}
              aria-label="Menu"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 text-white/90 transition hover:border-white/40 hover:text-white"
            >
              <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
                {open === "mobile" ? <path d="M4 4l10 10M14 4 4 14" /> : <path d="M3 5h12M3 9h12M3 13h12" />}
              </svg>
            </button>
            {open === "mobile" && (
              <div className={`${PANEL} right-0 w-[min(300px,calc(100vw-40px))]`}>
                {DIRECT_LINKS.map((link) => (
                  <a key={link.href} href={link.href} onClick={close} className={`${PANEL_ITEM} font-medium text-white`}>
                    {link.label}
                  </a>
                ))}
                <div className="mx-2 my-1.5 h-px bg-white/10" />
                {MENU_LINKS.map((link) => (
                  <a key={link.label} href={link.href} onClick={close} className={PANEL_ITEM}>
                    {link.label}
                  </a>
                ))}
                <div className="mx-2 my-1.5 h-px bg-white/10" />
                <span className="block px-3.5 py-2 text-[13.5px] text-white/40">Android and Apple apps · Coming soon</span>
                <div className="mx-2 my-1.5 h-px bg-white/10 sm:hidden" />
                {session ? (
                  <div className="sm:hidden">
                    <span className="block truncate px-3.5 pt-1.5 text-[12.5px] text-white/50">{email}</span>
                    <button type="button" onClick={handleLogout} className={`${PANEL_ITEM} w-full text-left`}>
                      Log out
                    </button>
                  </div>
                ) : (
                  <a href="/login" onClick={close} className={`${PANEL_ITEM} sm:hidden`}>
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
