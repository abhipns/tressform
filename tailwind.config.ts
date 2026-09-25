import type { Config } from "tailwindcss";

// Design tokens ported 1:1 from the original static prototype (index.html)
// so the Next.js rebuild matches the approved visual design exactly.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F3F1E6",
        "bg-soft": "#FAF8F0",
        surface: "#FFFFFF",
        "ink-heading": "#3B2760",
        "ink-heading-2": "#4E3480",
        "ink-body": "#4A4750",
        "ink-muted": "#7A7686",
        mint: "#4FBE9C",
        "mint-deep": "#3AA486",
        "mint-pale": "#DDF3EA",
        lilac: "#8F6FC9",
        "header-dark": "#241A38",
        "header-dark-2": "#2E2148",
        line: "#E7E2D3",
        danger: "#C4584A",
      },
      borderRadius: {
        lg2: "28px",
        md2: "18px",
        sm2: "12px",
      },
      fontFamily: {
        heading: ["Poppins", "Inter", "sans-serif"],
        body: ["Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      maxWidth: {
        wrap: "1180px",
      },
      boxShadow: {
        card: "0 10px 30px -14px rgba(59,39,96,0.25)",
      },
    },
  },
  plugins: [],
};
export default config;
