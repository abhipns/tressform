// 10.10.2026: the two typefaces are now served from the site itself (the
// @fontsource packages) instead of being fetched from Google Fonts on every
// visit — one less outside request, no flash of a substitute font, and the
// site looks the same if Google's font server is slow or blocked.
import "@fontsource-variable/bricolage-grotesque/opsz.css";
import "@fontsource-variable/figtree";
import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import VisitBeacon from "@/components/VisitBeacon";
// 14.10.2026: picks up ?ref= referral links on any page (lib/referral.ts).
import ReferralBeacon from "@/components/ReferralBeacon";
import VersionWatch from "@/components/VersionWatch";
// 21.10.2026: Meta ads — the Pixel (lib/metaPixel.ts) and ad-campaign tags (lib/campaign.ts).
import MetaPixel from "@/components/MetaPixel";

// 21.10.2026: Meta's domain check (Business settings → Domains → Meta-tag):
// the code goes in NEXT_PUBLIC_META_DOMAIN_VERIFICATION in Vercel.
const META_DOMAIN_CODE = (process.env.NEXT_PUBLIC_META_DOMAIN_VERIFICATION || "").replace(/[^A-Za-z0-9]/g, "");

export const metadata: Metadata = {
  title: "Tressform",
  description:
    "Find your perfect haircut before you cut, using AI face analysis and AI hairstyles.",
  ...(META_DOMAIN_CODE ? { other: { "facebook-domain-verification": META_DOMAIN_CODE } } : {}),
};

// Header/Footer moved here from app/page.tsx so every route (the new
// /login, /blog, /refer, /about, /contact, /careers, /privacy, /terms,
// /refund, /money-back-guarantee pages — built per the nav-links decision:
// "Build all of them") gets consistent site chrome, not just the homepage.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
      </head>
      <body>
        <Header />
        {children}
        <Footer />
        <VisitBeacon />
        <ReferralBeacon />
        <VersionWatch />
        <MetaPixel />
      </body>
    </html>
  );
}
