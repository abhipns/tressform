"use client";

// The signed-in customer's own referral link on /refer (14.10.2026):
// copy it, share it on WhatsApp, and see what it has earned. Shows nothing
// to visitors who aren't signed in — the page's own "Log in to get your
// referral link" line covers them.

import { useEffect, useState } from "react";
import { SUPABASE_MOCK_MODE, authHeaders, getMockUserId, useSession } from "@/lib/authClient";
import { referralLink } from "@/lib/referral";

interface Mine {
  code: string;
  balancePaise: number;
  joined: number;
  bought: number;
  earnedPaise: number;
}

/** The "Log in to get your referral link" line — only for visitors who aren't signed in. */
export function LoginForLink({ children }: { children: React.ReactNode }) {
  const { session, loading } = useSession();
  if (SUPABASE_MOCK_MODE || loading || session) return null;
  return <>{children}</>;
}

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

export default function MyReferral() {
  const { session, loading } = useSession();
  const userId = session?.user.id ?? null;
  const [mine, setMine] = useState<Mine | null>(null);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!SUPABASE_MOCK_MODE && (loading || !userId)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/referral/me", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ userId: SUPABASE_MOCK_MODE ? getMockUserId() : undefined }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Mine;
        if (!cancelled) setMine(data);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, loading]);

  if (!SUPABASE_MOCK_MODE && !userId) return null;
  if (failed) {
    return (
      <p className="mb-9 rounded-md2 border border-line bg-bg-soft p-4 text-[14px] text-ink-muted">
        Your referral link couldn&apos;t be loaded just now. Please refresh the page.
      </p>
    );
  }
  if (!mine) {
    return <div className="mb-9 h-[150px] animate-pulse rounded-lg2 border border-line bg-surface" aria-hidden />;
  }

  const link = referralLink(mine.code, typeof window !== "undefined" ? window.location.origin : undefined);
  const message = `I used Tressform to find haircuts that suit my face shape. Try it here: ${link}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy your link:", link);
    }
  }

  return (
    <div className="mb-9 rounded-lg2 border border-line bg-surface p-5 shadow-card">
      <p className="mb-2 text-[13px] font-bold uppercase tracking-[.03em] text-ink-muted">Your referral link</p>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Your referral link"
          className="min-w-0 flex-1 rounded-md2 border border-line bg-bg-soft px-3.5 py-2.5 text-[14.5px] text-ink-heading"
        />
        <button type="button" onClick={copy} className="btn-primary !py-2.5">
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(message)}`}
          target="_blank"
          rel="noreferrer"
          className="btn-secondary !py-2.5 text-center"
        >
          Share on WhatsApp
        </a>
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-md2 bg-bg-soft p-3">
          <dt className="text-[12.5px] text-ink-muted">Friends joined</dt>
          <dd className="text-[20px] font-bold text-ink-heading">{mine.joined}</dd>
        </div>
        <div className="rounded-md2 bg-bg-soft p-3">
          <dt className="text-[12.5px] text-ink-muted">Friends who bought</dt>
          <dd className="text-[20px] font-bold text-ink-heading">{mine.bought}</dd>
        </div>
        <div className="rounded-md2 bg-bg-soft p-3">
          <dt className="text-[12.5px] text-ink-muted">Your credit</dt>
          <dd className="text-[20px] font-bold text-mint-deep">{rupees(mine.balancePaise)}</dd>
        </div>
      </dl>
      <p className="mt-3 text-[13px] text-ink-muted">
        A friend counts when they open your link and sign up, as long as they haven&apos;t bought from Tressform
        before. You earn credit when they make their first purchase.
      </p>
    </div>
  );
}
