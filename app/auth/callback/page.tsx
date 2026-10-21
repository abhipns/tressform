// /auth/callback — where Google sign-in and the "confirm your email" link
// land (09.10.2026, real sign-in work). Supabase sends the customer back
// here with their session in the URL; the browser client in
// lib/supabaseClient.ts picks that up automatically, and this page then
// forwards them to ?next=… (default: the upload section).

"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SUPABASE_MOCK_MODE, safeNext } from "@/lib/authClient";
import { trackMeta } from "@/lib/metaPixel";

function readUrlError(): string | null {
  if (typeof window === "undefined") return null;
  const fromHash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const fromQuery = new URLSearchParams(window.location.search);
  return fromHash.get("error_description") || fromQuery.get("error_description");
}

function CallbackContent() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (SUPABASE_MOCK_MODE) {
      window.location.replace(next);
      return;
    }

    // Read any error out of the URL first — the client clears the hash once
    // it has processed it.
    const urlError = readUrlError();
    let cancelled = false;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        // 21.10.2026: a brand-new account (made in the last 10 minutes) → Meta's CompleteRegistration.
        const made = Date.parse(data.session.user.created_at ?? "");
        if (Number.isFinite(made) && Date.now() - made < 10 * 60 * 1000) {
          trackMeta("CompleteRegistration", undefined, `reg-${data.session.user.id}`);
          await new Promise((r) => setTimeout(r, 400)); // let it send before leaving the page
        }
        window.location.replace(next);
        return;
      }
      setError(urlError || "That sign-in link has expired or was already used.");
    })();

    return () => {
      cancelled = true;
    };
  }, [next]);

  if (error) {
    return (
      <section className="wrap py-16">
        <div className="mx-auto max-w-[420px] text-center">
          <h1 className="mb-3 text-[24px]">We couldn&apos;t sign you in</h1>
          <p className="mb-6 text-[14.5px] leading-[1.6] text-ink-muted">{error}</p>
          <a href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary">
            Back to Log in
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap py-16 text-center">
      <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
      <p className="text-[14px] text-ink-muted">Signing you in…</p>
    </section>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackContent />
    </Suspense>
  );
}
