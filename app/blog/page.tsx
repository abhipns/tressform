// Blog listing — reads straight from lib/content/blogPosts.ts. Add a post
// there and it appears here automatically, newest first.

import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BLOG_POSTS } from "@/lib/content/blogPosts";

export const metadata = {
  title: "Blog — Tressform",
  description: "Hair-care facts and styling tips from Tressform.",
};

export default function BlogIndex() {
  const posts = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1));

  return (
    <>
      <Header />
      <section className="wrap py-16">
        <div className="section-head">
          <p className="eyebrow">Blog</p>
          <h2>Hair Trivia &amp; Tips</h2>
        </div>

        {posts.length === 0 ? (
          <p className="text-center text-[14.5px] text-ink-muted">
            No posts yet — add one in lib/content/blogPosts.ts.
          </p>
        ) : (
          <div className="mx-auto flex max-w-[760px] flex-col gap-5">
            {posts.map((post) => (
              <Link key={post.slug} href={`/blog/${post.slug}`} className="card block transition hover:-translate-y-0.5 hover:shadow-card">
                {post.coverImage && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.coverImage} alt={post.title} className="mb-4 w-full rounded-sm2 object-cover" />
                )}
                <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[.04em] text-mint-deep">
                  {new Date(post.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                </p>
                <h3 className="mb-1.5 text-[19px] text-ink-heading">{post.title}</h3>
                <p className="text-[14px] leading-[1.55] text-ink-body">{post.excerpt}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
      <Footer />
    </>
  );
}
