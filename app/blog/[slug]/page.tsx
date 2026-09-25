// /blog/[slug] — built per the "Build all of them" decision on the
// placeholder nav-link pages. Renders a single post from the real
// lib/content/blogPosts.ts data (per that file's own "no other code changes
// needed" instructions for adding posts) — generateStaticParams keeps new
// posts auto-discovered without touching this file again.

import { notFound } from "next/navigation";
import Link from "next/link";
import { BLOG_POSTS } from "@/lib/content/blogPosts";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) return notFound();

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[680px]">
        <Link href="/blog" className="mb-6 inline-block text-[13.5px] font-medium text-mint-deep">
          ← Back to Blog
        </Link>

        <p className="mb-1.5 text-[12px] font-medium uppercase tracking-[.03em] text-ink-muted">
          {new Date(post.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
        </p>
        <h1 className="mb-6 text-[clamp(24px,4vw,34px)]">{post.title}</h1>

        {post.coverImage && (
          <img src={post.coverImage} alt="" className="mb-6 w-full rounded-lg2 object-cover" />
        )}

        <div className="flex flex-col gap-4">
          {post.paragraphs.map((p, i) => (
            <p key={i} className="text-[15px] leading-[1.7] text-ink-body">
              {p}
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
