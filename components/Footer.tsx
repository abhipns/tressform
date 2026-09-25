// Part B footer additions: Disclaimers (ties to Honest Expectations),
// Money-Back Guarantee (ties to Part K refund policy), and a "Catch Us On"
// social row — icons only, per doc thread f3588221-19c8: no backend/stack
// badges (Vercel/Supabase/etc. are implementation details, not something a
// customer needs to see) and no platform names next to the social links.
//
// Social hrefs are still "#" placeholders — swap in the real profile URLs
// (per platform, even "coming soon" ones) whenever they're ready; no other
// change needed.

import Logo from "./Logo";

const SOCIALS = [
  {
    name: "Facebook",
    href: "#",
    icon: (
      <path d="M13.5 21v-7.5h2.5l.5-3H13.5V8.5c0-.87.24-1.5 1.53-1.5H16.6V4.32C16.3 4.28 15.3 4.2 14.13 4.2c-2.44 0-4.13 1.49-4.13 4.22V10.5H7.5v3H10V21h3.5Z" />
    ),
  },
  {
    name: "Instagram",
    href: "#",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="4.5" />
        <circle cx="12" cy="12" r="3.4" />
        <circle cx="16.6" cy="7.4" r="0.9" fill="currentColor" stroke="none" />
      </>
    ),
  },
  {
    name: "X",
    href: "#",
    icon: <path d="M5 4.5 10.6 12 5 19.5h1.9L11.5 13l3.8 6.5H19l-5.9-8L18.4 4.5h-1.9L12.3 10.7 8.9 4.5H5Z" fill="currentColor" stroke="none" />,
  },
  {
    name: "LinkedIn",
    href: "#",
    icon: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="2.5" />
        <path d="M8.2 10.2v6" />
        <circle cx="8.2" cy="7.6" r="0.15" fill="currentColor" stroke="currentColor" strokeWidth="1.6" />
        <path d="M11.4 16.2v-3.3c0-1.3.9-2.1 2.05-2.1 1.15 0 1.75.8 1.75 2.1v3.3" />
      </>
    ),
  },
  {
    name: "YouTube",
    href: "#",
    icon: (
      <>
        <rect x="3.5" y="6.5" width="17" height="11" rx="3" />
        <path d="M10.3 9.8v4.4l3.9-2.2-3.9-2.2Z" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

export default function Footer() {
  return (
    <footer className="bg-gradient-to-b from-header-dark-2 to-header-dark py-[54px] pb-[26px] text-white/75">
      <div className="wrap">
        <div className="grid gap-8 border-b border-white/10 pb-9 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <Logo variant="light" />
            <p className="mt-3 max-w-[280px] text-[13.5px] leading-[1.6] text-white/60">
              See your next haircut before you commit — powered by AI face analysis built for real hair, real faces.
            </p>
            <div className="mt-5">
              <h5 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[.04em] text-white">Catch Us On</h5>
              <div className="flex flex-wrap gap-2.5">
                {SOCIALS.map((s) => (
                  <a
                    key={s.name}
                    href={s.href}
                    aria-label={s.name}
                    title={s.name}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 hover:border-white/40 hover:text-white"
                  >
                    <svg viewBox="0 0 24 24" className="h-[17px] w-[17px]" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      {s.icon}
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div>
            <h5 className="mb-3.5 text-[13px] font-semibold uppercase tracking-[.04em] text-white">Product</h5>
            <a href="#browse" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Hairstyles
            </a>
            <a href="#how" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              How It Works
            </a>
            <a href="#pricing" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Pricing
            </a>
            <a href="#salons" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              For Salons (soon)
            </a>
            <a href="#haircare" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Hair Care
            </a>
            <a href="/blog" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Blog
            </a>
          </div>

          <div>
            <h5 className="mb-3.5 text-[13px] font-semibold uppercase tracking-[.04em] text-white">Company</h5>
            <a href="/about" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              About
            </a>
            <a href="/contact" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Contact
            </a>
            <a href="/careers" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Careers
            </a>
          </div>

          <div>
            <h5 className="mb-3.5 text-[13px] font-semibold uppercase tracking-[.04em] text-white">Legal</h5>
            <a href="/privacy" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Privacy Policy
            </a>
            <a href="/terms" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Terms of Service
            </a>
            <a href="/refund" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Refund Policy
            </a>
            <a href="/money-back-guarantee" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Money-Back Guarantee
            </a>
          </div>
        </div>

        <div className="pt-5 text-[12px] leading-[1.6] text-white/45">
          <p className="mb-3 max-w-[820px]">
            <strong className="text-white/65">Disclaimer:</strong> AI-generated hairstyle previews are guidance to help
            you and your barber, not a guarantee of the final result — see Honest Expectations above.{" "}
            <strong className="text-white/65">Money-Back Guarantee:</strong> you get a 100% refund if a technical
            glitch prevents image generation entirely, even after multiple attempts — see our Refund Policy for full
            terms.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2.5 text-[12.5px]">
            <span>Tressform. All rights reserved. © 2026</span>
            <span>Made with care, for better haircuts.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
