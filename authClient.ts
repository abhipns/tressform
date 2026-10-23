"use client";

// Tressform — browser-side sign-in helpers (09.10.2026, real sign-in work).
//
//   useSession()      — the current Supabase session, kept up to date
//   authHeaders()     — the Authorization header API routes expect in real
//                       mode (see lib/serverAuth.ts); empty in mock mode
//   getMockUserId()   — the per-browser demo id the mock-mode flow has
//                       always used (moved here from UploadFlow/checkout so
//                       there is one copy, not two)
//   loginUrl(next)    — /login link that returns the customer to `next`
//   ensureSession()   — 23.10.2026: the current session, or a new anonymous
//                       one, so visitors can upload before signing in
//   isAnonymousSession(s) — true for those not-yet-signed-in sessions
//   safeNext(value)   — guards the ?next= parameter against open redirects

import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase, SUPABASE_MOCK_MODE } from "@/lib/supabaseClient";

export { SUPABASE_MOCK_MODE };

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(!SUPABASE_MOCK_MODE);

  useEffect(() => {
    if (SUPABASE_MOCK_MODE) return;
    let cancelled = false;

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      if (cancelled) return;
      setSession(next);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export async function authHeaders(): Promise<Record<string, string>> {
  if (SUPABASE_MOCK_MODE) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getMockUserId(): string {
  if (typeof window === "undefined") return "ssr-user";
  const existing = window.localStorage?.getItem("tressform_mock_user_id");
  if (existing) return existing;
  const id = `demo_${Math.random().toString(36).slice(2, 10)}`;
  try {
    window.localStorage?.setItem("tressform_mock_user_id", id);
  } catch {
    /* private browsing / storage blocked — fine, just not persisted */
  }
  return id;
}

/** Only same-site paths are allowed as a post-login destination. */
export function safeNext(value: string | null | undefined, fallback = "/#upload"): string {
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}

export function loginUrl(next: string): string {
  return `/login?next=${encodeURIComponent(next)}`;
}

/** 23.10.2026: true for a visitor who uploaded before signing in (Supabase anonymous account). */
export function isAnonymousSession(session: Session | null | undefined): boolean {
  return Boolean((session?.user as { is_anonymous?: boolean } | undefined)?.is_anonymous);
}

/**
 * The visitor's session, starting an anonymous one if there is none, so the
 * upload and hairstyle list work before signing in. Sign-in is asked for at
 * checkout (components/SaveAccount.tsx), which turns the same account into a
 * real one, so nothing made so far is lost. Returns null if anonymous
 * sign-ins are switched off in Supabase — callers then send the visitor to
 * /login as before.
 */
export async function ensureSession(): Promise<Session | null> {
  if (SUPABASE_MOCK_MODE) return null;
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session;
  const { data: created, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.error("[Tressform] anonymous sign-in failed:", error.message);
    return null;
  }
  return created.session ?? null;
}
