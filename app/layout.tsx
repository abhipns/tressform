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

export const metadata: Metadata = {
  title: "Tressform",
  description:
    "Find your perfect haircut before you cut, using AI face analysis and style previews.",
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
      </body>
    </html>
  );
}
