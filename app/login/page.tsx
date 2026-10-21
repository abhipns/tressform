// /login — built per the "Build all of them" decision on the placeholder
// nav-link pages (Header's "Log in" link).
//
// 09.10.2026: real sign-in. Two ways in, per the launch decision ("Both"):
//   - Email + password (signInWithPassword / signUp, plus "Forgot password?")
//   - Continue with Google (signInWithOAuth)
// After a successful login the customer is sent to ?next=… (default: the
// upload section), so the upload flow and checkout can bounce people here
// and get them back where they were.
//
// Mock mode (no Supabase env vars) is unchanged: the form labels itself as a
// preview and simulates success rather than calling a backend that isn't
// there.

"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { SUPABASE_MOCK_MODE, safeNext, useSession } from "@/lib/authClient";
import InAppBrowserNotice, { useInApp } from "@/components/InAppBrowserNotice";

type Mode = "login" | "signup" | "forgot";
type Status = "idle" | "loading" | "done" | "check-email" | "reset-sent" | "error";

const INPUT_CLASS =
  "w-full rounded-md2 border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink-body outline-none focus:border-mint-deep";

function friendlyError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "That email and password don't match. Please try again.";
  if (m.includes("email not confirmed")) return "Please confirm your email first — check your inbox for our link.";
  if (m.includes("rate limit")) return "Too many attempts just now. Please wait a minute and try again.";
  if (m.includes("already registered")) return "An account with that email already exists — log in instead.";
  return message;
}

function LoginContent() {
  const searchParams = useSearchParams();
  const next = safeNext(searchParams.get("next"));
  const { session, loading: sessionLoading } = useSession();
  // 21.10.2026: inside the Instagram / Facebook app, Google sign-in is refused.
  const inApp = useInApp();

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setStatus("idle");
    setErrorMsg("");
  }

  function callbackUrl(): string {
    return `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    if (SUPABASE_MOCK_MODE) {
      // Mock mode: no real Supabase project is connected. Simulate a
      // successful round-trip rather than leaving the form a dead end.
      await new Promise((r) => setTimeout(r, 400));
      setStatus("done");
      return;
    }

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) {
        setErrorMsg(friendlyError(error.message));
        setStatus("error");
      } else {
        setStatus("reset-sent");
      }
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(friendlyError(error.message));
        setStatus("error");
        return;
      }
      window.location.assign(next);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: callbackUrl() },
    });
    if (error) {
      setErrorMsg(friendlyError(error.message));
      setStatus("error");
      return;
    }
    if (data.session) {
      // Email confirmation is switched off in Supabase — already logged in.
      window.location.assign(next);
      return;
    }
    setStatus("check-email");
  }

  async function handleGoogle() {
    setErrorMsg("");
    if (SUPABASE_MOCK_MODE) {
      setStatus("done");
      return;
    }
    setStatus("loading");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl() },
    });
    if (error) {
      setErrorMsg(friendlyError(error.message));
      setStatus("error");
    }
    // On success the browser leaves for Google, then returns to /auth/callback.
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    setStatus("idle");
  }

  const heading = mode === "login" ? "Log in" : mode === "signup" ? "Create your account" : "Reset your password";

  // Already logged in (real mode): don't show the form again.
  if (!SUPABASE_MOCK_MODE && !sessionLoading && session && status !== "loading") {
    return (
      <section className="wrap py-16">
        <div className="mx-auto max-w-[420px]">
          <p className="eyebrow">Account</p>
          <h1 className="mb-6 text-[clamp(26px,4vw,32px)]">You&apos;re logged in</h1>
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-5 break-all text-[14px] text-ink-muted">{session.user.email}</p>
            <a href={next} className="btn-primary w-full rounded-full !py-3">
              Continue
            </a>
            <button type="button" onClick={handleLogout} className="mt-4 text-[13.5px] font-semibold text-mint-deep">
              Log out
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[420px]">
        <p className="eyebrow">Account</p>
        <h1 className="mb-2 text-[clamp(26px,4vw,32px)]">{heading}</h1>
        {inApp && <InAppBrowserNotice inApp={inApp} />}

        {SUPABASE_MOCK_MODE && (
          <div className="mb-6 rounded-md2 border border-line bg-bg-soft p-3.5 text-[12.5px] leading-[1.6] text-ink-muted">
            Preview mode — no live account backend is connected yet, so this form simulates success rather than
            creating a real session.
          </div>
        )}

        {status === "done" && (
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-1 text-[16px] font-semibold text-ink-heading">
              {mode === "signup" ? "Account created." : "Logged in."}
            </p>
            <p className="text-[14px] text-ink-muted">(Simulated — preview mode.)</p>
          </div>
        )}

        {status === "check-email" && (
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-1 text-[16px] font-semibold text-ink-heading">Check your email</p>
            <p className="text-[14px] leading-[1.6] text-ink-muted">
              We&apos;ve sent a confirmation link to <strong className="text-ink-heading">{email}</strong>. Open it on
              this device to finish creating your account.
            </p>
          </div>
        )}

        {status === "reset-sent" && (
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-1 text-[16px] font-semibold text-ink-heading">Check your email</p>
            <p className="text-[14px] leading-[1.6] text-ink-muted">
              If an account exists for <strong className="text-ink-heading">{email}</strong>, a link to set a new
              password is on its way.
            </p>
          </div>
        )}

        {(status === "idle" || status === "loading" || status === "error") && (
          <>
            {mode !== "forgot" && (
              <>
                <button
                  type="button"
                  onClick={handleGoogle}
                  disabled={status === "loading" || Boolean(inApp)}
                  className="btn-secondary mt-4 w-full rounded-full !py-3 disabled:opacity-60"
                >
                  Continue with Google
                </button>
                {inApp && (
                  <p className="mt-2 text-center text-[12.5px] text-ink-muted">Google sign-in works once you open Tressform in your browser.</p>
                )}
                <div className="my-5 flex items-center gap-3 text-[12px] font-semibold uppercase tracking-[.08em] text-ink-muted">
                  <span className="h-px flex-1 bg-line" />
                  or
                  <span className="h-px flex-1 bg-line" />
                </div>
              </>
            )}

            <form onSubmit={handleSubmit} className={`flex flex-col gap-4 ${mode === "forgot" ? "mt-4" : ""}`}>
              {mode === "forgot" && (
                <p className="text-[13.5px] leading-[1.6] text-ink-muted">
                  Enter the email you signed up with and we&apos;ll send you a link to set a new password.
                </p>
              )}
              <div>
                <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink-heading">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT_CLASS}
                />
              </div>

              {mode !== "forgot" && (
                <div>
                  <div className="mb-1.5 flex items-baseline justify-between">
                    <label htmlFor="password" className="block text-[13px] font-medium text-ink-heading">
                      Password
                    </label>
                    {mode === "login" && (
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        className="text-[12.5px] font-semibold text-mint-deep"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={INPUT_CLASS}
                  />
                  {mode === "signup" && (
                    <p className="mt-1.5 text-[12px] text-ink-muted">At least 8 characters.</p>
                  )}
                </div>
              )}

              {status === "error" && <p className="text-[13px] font-medium text-danger">{errorMsg}</p>}

              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-primary rounded-full !py-3 disabled:opacity-60"
              >
                {status === "loading"
                  ? "Please wait…"
                  : mode === "login"
                    ? "Log in"
                    : mode === "signup"
                      ? "Sign up"
                      : "Send reset link"}
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-[13.5px] text-ink-muted">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => switchMode("signup")} className="font-semibold text-mint-deep">
                Create an account
              </button>
            </>
          ) : (
            <>
              {mode === "signup" ? "Already have an account?" : "Remembered it?"}{" "}
              <button type="button" onClick={() => switchMode("login")} className="font-semibold text-mint-deep">
                Log in
              </button>
            </>
          )}
        </p>

        {mode === "signup" && (
          <p className="mt-3 text-center text-[12px] leading-[1.6] text-ink-muted">
            By creating an account you agree to our{" "}
            <a href="/terms" className="font-semibold text-mint-deep">
              Terms
            </a>{" "}
            and{" "}
            <a href="/privacy" className="font-semibold text-mint-deep">
              Privacy Policy
            </a>
            .
          </p>
        )}
      </div>
    </section>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
