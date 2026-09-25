// Blog content for the "Trivia / blog" section (Part J) and the /blog pages.
//
// HOW TO ADD A POST:
//   1. Copy the example post below (or any existing entry) as a template.
//   2. Give it a unique `slug` (used in the URL: /blog/your-slug-here).
//   3. Fill in title, excerpt, date, and paragraphs (each array entry is one
//      paragraph — write in plain text, no markdown needed).
//   4. Optional: drop a cover image into public/blog/ and set `coverImage`
//      to its path, e.g. "/blog/my-post-cover.jpg".
//   5. Save this file — the homepage teaser, /blog listing, and the post's
//      own page at /blog/[slug] all update automatically. No other code
//      changes needed.
//
// Posts are shown newest-first (by `date`) everywhere they're listed.

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  /** ISO date string, e.g. "2026-09-19". */
  date: string;
  /** Optional path under /public, e.g. "/blog/wash-frequency.jpg". */
  coverImage?: string;
  /** Each array entry renders as one paragraph. */
  paragraphs: string[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "how-often-should-you-wash-your-hair",
    title: "How Often Should You Actually Wash Your Hair?",
    excerpt:
      "Most textured and short styles look best washed every 2–3 days — here's why daily washing can work against you.",
    date: "2026-09-01",
    paragraphs: [
      "It's tempting to wash your hair every day, especially if you're used to a strict morning routine. But for most hair types — and especially textured or short styles — washing every 2–3 days strikes a better balance.",
      "Your scalp produces natural oils that condition both hair and skin. Washing daily strips those oils faster than your scalp can replace them, which can leave hair drier and, ironically, trigger it to produce even more oil to compensate.",
      "If you're working out often or have a very oily scalp, a gentle, sulphate-free shampoo every other day is a reasonable middle ground. Curly and coily textures can often stretch to 4–5 days between washes with the right conditioner routine.",
      "This is a placeholder starter post — replace it (or add more like it) in lib/content/blogPosts.ts.",
    ],
  },
];
