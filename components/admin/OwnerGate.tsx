"use client";

// The owner-only wrapper for the newer admin pages (13.10.2026): waits for
// the login, asks the owner to log in, or says the page is owner-only. Also
// shows the links between the admin pages.

import { useEffect, useState, type ReactNode } from "react";
import { SUPABASE_MOCK_MODE, loginUrl, useSession } from "@/lib/authClient";
import { supabase } from "@/lib/supabaseClient";

const ADMIN_LINKS = [
  { href: "/admin/stats", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/contacts", label: "WhatsApp" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/studio", label: "Studio" },
  { href: "/admin/carousel", label: "Carousel" },
];

export function AdminLinks({ current }: { current: string }) {
  return (
    <nav aria-label="Admin pages" className="mb-6 flex flex-wrap gap-2">
      {ADMIN_LINKS.map((l) => (
        <a
          key={l.href}
          href={l.href}
          aria-current={l.href === current ? "page" : undefined}
          className={`rounded-full px-4 py-1.5 text-[14px] font-semibold transition ${
            l.href === current ? "bg-header-dark text-white" : "bg-bg-soft text-ink-heading hover:bg-mint-pale"
          }`}
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}

export default function OwnerGate({ title, path, children }: { title: string; path: string; children: ReactNode }) {
  const { session, loading } = useSession();
  const userId = session?.user.id ?? null;
  const [isOwner, setIsOwner] = useState<boolean | null>(SUPABASE_MOCK_MODE ? true : null);

  useEffect(() => {
    if (SUPABASE_MOCK_MODE || !userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsOwner(data?.role === "ADMIN");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  if (!SUPABASE_MOCK_MODE && (loading || (userId && isOwner === null))) {
    return (
      <section className="frame flex min-h-[50vh] items-center justify-center py-20">
        <div className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
      </section>
    );
  }
  if (!SUPABASE_MOCK_MODE && !userId) {
    return (
      <section className="frame py-20">
        <h1 className="h-display">{title}</h1>
        <p className="lead mt-4">Log in with the owner&apos;s account to use this page.</p>
        <a href={loginUrl(path)} className="btn-primary mt-7">
          Log in
        </a>
      </section>
    );
  }
  if (isOwner === false) {
    return (
      <section className="frame py-20">
        <h1 className="h-display">{title}</h1>
        <p className="lead mt-4">This page is for the site owner only.</p>
      </section>
    );
  }
  return (
    <section className="frame py-10 lg:py-14">
      <AdminLinks current={path} />
      {children}
    </section>
  );
}
