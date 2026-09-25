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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Poppins:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Header />
        {children}
        <Footer />
      </body>
    </html>
  );
}
