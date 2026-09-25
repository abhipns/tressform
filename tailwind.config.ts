import type { Config } from "tailwindcss";

// Theme resolved 23.09.2026 (doc Open Conflict #1, thread af046b7e-9389):
// "Deep Botanical" — a genuinely new, moodier palette, NOT the "Soft Lilac"
// light-polish-of-the-existing-brand direction from Build Prompt v2 Section
// 0. Every token below is a new hex value; the token NAMES (mint, lilac,
// header-dark, ink-*, etc.) are kept as-is on purpose — ~20 components
// already reference them (bg-mint, text-ink-heading, from-lilac/40, ...),
// and renaming every class across the codebase would be a large, purely
// mechanical refactor that wasn't asked for. If you'd rather the class
// names themselves read as "botanical" (e.g. mint -> forest, lilac ->
// amber), say so and I'll do that pass separately.
//
// Palette logic: deep forest green as the primary accent/heading color
// (replaces the old purple-based "Soft Lilac" direction entirely), a warm
// amber/gold as the secondary accent (replaces the old lilac purple — sits
// well against green, "sunlight through leaves"), and a near-black
// botanical green for the header instead of the old dark purple. Background
// stays a warm, light parchment so body text stays readable — "deep" here
// describes the accent/heading palette, not a full dark-mode site.
//
// NOTE: this file didn't exist in the project folder before this pass — the
// component code has always referenced these token names, but no
// tailwind.config.ts shipped with the files under this project directory.
// Restored here with the design tokens the components already assume
// (borderRadius/fontFamily/maxWidth/boxShadow unchanged from what every
// component's className values expect), with only the `colors` block
// updated for Deep Botanical.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#F4F1E4",
        "bg-soft": "#FBF9F0",
        surface: "#FFFFFF",
        "ink-heading": "#1F3324", // deep forest green, was deep purple #3B2760
        "ink-heading-2": "#2A4530", // was #4E3480
        "ink-body": "#3E4A3F", // muted deep green-gray, was #4A4750
        "ink-muted": "#748575", // was #7A7686
        mint: "#2F6B4F", // primary accent: deep forest green, was #4FBE9C
        "mint-deep": "#204F39", // was #3AA486
        "mint-pale": "#DCEBD9", // was #DDF3EA
        lilac: "#C79A3D", // secondary accent: warm amber/gold, was purple #8F6FC9
        "header-dark": "#111C15", // near-black botanical green, was #241A38
        "header-dark-2": "#1B2B20", // was #2E2148
        line: "#DED9C5", // was #E7E2D3
        danger: "#C4584A", // unchanged — still reads correctly against the new palette
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
        card: "0 10px 30px -14px rgba(31,51,36,0.25)", // shadow tint follows the new heading green, was rgba(59,39,96,...)
      },
    },
  },
  plugins: [],
};
export default config;
