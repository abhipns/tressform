"use client";

// "Create your account" on the checkout page (23.10.2026).
//
// Visitors from the ads upload their selfie and see their hairstyle list
// before signing in, under an anonymous Supabase account (see
// lib/authClient.ts ensureSession). Paying needs a real account, so this box
// turns that same anonymous account into a real one: email + password
// (works inside the Instagram / Facebook app), or Google when the page is
// open in a normal browser. Because it is the same account, the photo and
// hairstyle list made so far stay with the customer.
//
// Someone who already has a Tressform account is offered "Log in instead";
// they keep everything in that account, but this visit's photo stays with
// the anonymous one, so they are told they'll add their selfie again.
//
// 27.10.2026: no longer in front of the Pay button (customers left there).
// It now shows AFTER paying, on the results page, as "Save your looks to
// your account" — the wording comes from that page (title, blurb, button).

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { loginUrl } from "@/lib/authClient";
import { trackMeta } from "@/lib/metaPixel";
import { useInApp } from "@/components/InAppBrowserNotice";

const INPUT_CLASS =
  "w-full rounded-md2 border border-line bg-surface px-3.5 py-2.5 text-[15px] text-ink-body outline-none focus:border-mint-deep";

export function accountError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already") && (m.includes("registered") || m.includes("exists") || m.includes("use")))
    return "An account with this email already exists. Log in to it below, or use a different email.";
  if (m.includes("password") && (m.includes("short") || m.includes("least") || m.includes("characters")))
    return "Please choose a password of at least 8 characters.";
  if (m.includes("invalid") && m.includes("email")) return "Please check your email address.";
  if (m.includes("manual linking") || m.includes("linking is disabled"))
    return "Google sign-up isn't available here right now. Please use your email instead.";
  return "We couldn't create your account just now. Please try again.";
}

export default function SaveAccount({
  next,
  title = "Create your account to continue",
  blurb = "Your photo and hairstyle list are saved to it, so your hairstyles are always there to open again.",
  submitLabel = "Create account and continue",
  defaultEmail = "",
  children,
}: {
  next: string;
  title?: string;
  blurb?: string;
  submitLabel?: string;
  defaultEmail?: string;
  /** 27.10.2026: e.g. "Skip for now", under the box. */
  children?: React.ReactNode;
}) {
  const inApp = useInApp();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("Please choose a password of at least 8 characters.");
      return;
    }
    setBusy(true);
    setError(null);
    let { data, error: err } = await supabase.auth.updateUser({ email: email.trim(), password });
    // Some setups only allow the password once the email is set: do it in two steps.
    if (err && err.message.toLowerCase().includes("password")) {
      const first = await supabase.auth.updateUser({ email: email.trim() });
      err = first.error;
      data = first.data;
      if (!err && first.data.user?.email) {
        const second = await supabase.auth.updateUser({ password });
        err = second.error;
        if (!err) data = second.data;
      }
    }
    setBusy(false);
    if (err) {
      setError(accountError(err.message));
      return;
    }
    if (data.user?.email) {
      // The page re-renders as a signed-in customer (useSession hears USER_UPDATED).
      trackMeta("CompleteRegistration");
      await supabase.auth.refreshSession().catch(() => undefined);
      return;
    }
    // Email confirmation is switched on in Supabase: the address waits for its link.
    setCheckEmail(true);
  }

  async function google() {
    setError(null);
    setBusy(true);
    const { error: err } = await supabase.auth.linkIdentity({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    setBusy(false);
    if (err) setError(accountError(err.message));
    // On success the browser leaves for Google, then returns to /auth/callback.
  }

  if (checkEmail) {
    return (
      <div className="mb-5 rounded-md2 border border-line bg-bg-soft px-4 py-4 text-[14px] leading-[1.6] text-ink">
        <p className="mb-1 font-semibold text-ink-heading">Check your email</p>
        We&apos;ve sent a link to <strong>{email}</strong>. Open it to finish saving your account.
      </div>
    );
  }

  return (
    <div className="mb-5 rounded-md2 border border-line bg-bg-soft px-4 py-5">
      <p className="text-[17px] font-semibold text-ink-heading">{title}</p>
      <p className="mb-4 mt-1 text-[13.5px] leading-[1.55] text-ink-muted">{blurb}</p>

      {!inApp && (
        <>
          <button type="button" onClick={google} disabled={busy} className="btn-secondary w-full rounded-full !py-3 disabled:opacity-60">
            Continue with Google
          </button>
          <div className="my-4 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[.08em] text-ink-muted">
            <span className="h-px flex-1 bg-line" />
            or
            <span className="h-px flex-1 bg-line" />
          </div>
        </>
      )}

      <form onSubmit={create} className="flex flex-col gap-3.5">
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-heading">Email</span>
          <input type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium text-ink-heading">Choose a password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_CLASS}
          />
          <span className="mt-1.5 block text-[12px] text-ink-muted">At least 8 characters.</span>
        </label>
        {error && <p className="text-[13px] font-medium text-danger">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full rounded-full !py-3 disabled:opacity-60">
          {busy ? "Please wait…" : submitLabel}
        </button>
      </form>

      <p className="mt-4 text-center text-[13px] text-ink-muted">
        Already have a Tressform account?{" "}
        <a href={loginUrl(next)} className="font-semibold text-mint-deep">
          Log in
        </a>
        <span className="mt-1 block text-[12px]">You&apos;ll add your selfie again in that account.</span>
      </p>
      {children}
    </div>
  );
}
