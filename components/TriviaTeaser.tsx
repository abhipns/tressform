// Part J — Trivia / blog teaser: a lightweight, recurring content hook.
// Pulls the latest post from lib/content/blogPosts.ts — add a post there
// and it shows up here too. 15.10.2026: "Get Weekly Hair Tips" went
// nowhere; it is now the WhatsApp box (components/WhatsAppOptIn.tsx), which
// collects numbers for when sending is switched on (lib/whatsapp.ts).

import { BLOG_POSTS } from "@/lib/content/blogPosts";
import WhatsAppOptIn from "@/components/WhatsAppOptIn";

export default function TriviaTeaser() {
  const latest = [...BLOG_POSTS].sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  return (
    <section className="wrap py-16">
      <div className="rounded-lg2 bg-gradient-to-br from-header-dark to-header-dark-2 p-8 text-center text-white md:p-12">
        <p className="eyebrow mb-3 !text-mint">Hair Trivia</p>
        <h2 className="mb-3 text-[clamp(22px,3vw,28px)] text-white">
          {latest ? latest.title : "Did you know?"}
        </h2>
        <p className="mx-auto mb-6 max-w-[520px] text-[14.5px] leading-[1.6] text-white/75">
          {latest
            ? latest.excerpt
            : "A new hair-care fact or styling tip lands in our blog every week."}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a href="/blog" className="btn-secondary !border-white/25 !bg-transparent !text-white hover:!border-white">
            Read the blog
          </a>
        </div>
        <div className="mx-auto mt-6 max-w-[560px]">
          <WhatsAppOptIn
            source="trivia"
            dark
            title="Get hair tips on WhatsApp"
            blurb="New hairstyles, hair-care tips and products, sent to your WhatsApp now and then. No spam."
          />
        </div>
      </div>
    </section>
  );
}
