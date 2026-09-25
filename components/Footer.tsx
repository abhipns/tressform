// Part B footer additions: Disclaimers (ties to Honest Expectations),
// Money-Back Guarantee (ties to Part K refund policy), and a "Catch Us On"
// social row (Facebook, Instagram, X, LinkedIn, YouTube).

import Logo from "./Logo";

const SOCIALS = ["Facebook", "Instagram", "X", "LinkedIn", "YouTube"];

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
            <div className="mt-3.5 flex flex-wrap gap-2">
              {["Vercel", "Supabase", "Android", "AWS Rekognition"].map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-[11px] py-1.5 text-[11.5px] font-semibold text-white/75"
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  {c}
                </span>
              ))}
            </div>
            <div className="mt-5">
              <h5 className="mb-2.5 text-[13px] font-semibold uppercase tracking-[.04em] text-white">Catch Us On</h5>
              <div className="flex flex-wrap gap-2">
                {SOCIALS.map((s) => (
                  <a
                    key={s}
                    href="#"
                    className="rounded-full border border-white/20 px-3 py-1.5 text-[12px] font-medium text-white/70 hover:text-white"
                  >
                    {s}
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
            <a href="#" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              About
            </a>
            <a href="#" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Contact
            </a>
            <a href="#" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Careers
            </a>
          </div>

          <div>
            <h5 className="mb-3.5 text-[13px] font-semibold uppercase tracking-[.04em] text-white">Legal</h5>
            <a href="#" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Privacy Policy
            </a>
            <a href="#" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Terms of Service
            </a>
            <a href="#" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Refund Policy
            </a>
            <a href="#" className="mb-2.5 block text-[13.5px] text-white/65 hover:text-white">
              Money-Back Guarantee
            </a>
          </div>
        </div>

        <div className="pt-5 text-[12px] leading-[1.6] text-white/45">
          <p className="mb-3 max-w-[820px]">
            <strong className="text-white/65">Disclaimer:</strong> AI-generated hairstyle previews are guidance to help
            you and your barber, not a guarantee of the final result — see Honest Expectations above.{" "}
            <strong className="text-white/65">Money-Back Guarantee:</strong> refunds apply only if a technical glitch
            prevents image generation entirely, even after multiple attempts — see our Refund Policy for full terms.
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
