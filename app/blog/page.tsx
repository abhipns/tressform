// /blog — built per the "Build all of them" decision on the placeholder
// nav-link pages (Header menu's "Blog" link → already pointed at /blog, but
// the route didn't exist). Reads real posts from lib/content/blogPosts.ts —
// no invented articles here, just whatever's actually in that file (one
// starter post as of writing, per its own header comment).

import Link from "next/link";
import { BLOG_POSTS } from "@/lib/content/blogPosts";

export default function BlogIndexPage() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[720px]">
        <p className="eyebrow">Blog</p>
        <h1 className="mb-9 text-[clamp(26px,4vw,36px)]">Hair care, style, and how-to</h1>

        {posts.length === 0 ? (
          <p className="text-[14.5px] text-ink-muted">No posts yet — check back soon.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {posts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="block rounded-lg2 border border-line bg-surface p-6 transition hover:border-mint-deep"
              >
                <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[.03em] text-ink-muted">
                  {new Date(post.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                </p>
                <h2 className="mb-2 text-[19px] font-semibold text-ink-heading">{post.title}</h2>
                <p className="text-[14.5px] leading-[1.6] text-ink-body">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
