// Individual blog post page — reads from lib/content/blogPosts.ts by slug.

import Link from "next/link";
import { notFound } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { BLOG_POSTS } from "@/lib/content/blogPosts";

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) return { title: "Post not found — Tressform" };
  return { title: `${post.title} — Tressform`, description: post.excerpt };
}

export default function BlogPostPage({ params }: { params: { slug: string } }) {
  const post = BLOG_POSTS.find((p) => p.slug === params.slug);
  if (!post) notFound();

  return (
    <>
      <Header />
      <article className="wrap py-16">
        <div className="mx-auto max-w-[720px]">
          <Link href="/blog" className="mb-6 inline-block text-[13.5px] font-semibold text-mint-deep">
            ← Back to blog
          </Link>
          <p className="mb-2 text-[12px] font-semibold uppercase tracking-[.04em] text-mint-deep">
            {new Date(post.date).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
          </p>
          <h1 className="mb-6 text-[clamp(26px,4vw,38px)]">{post.title}</h1>
          {post.coverImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.coverImage} alt={post.title} className="mb-8 w-full rounded-lg2 object-cover" />
          )}
          <div className="flex flex-col gap-4">
            {post.paragraphs.map((p, i) => (
              <p key={i} className="text-[15.5px] leading-[1.75] text-ink-body">
                {p}
              </p>
            ))}
          </div>
        </div>
      </article>
      <Footer />
    </>
  );
}
