// /login — built per the "Build all of them" decision on the placeholder
// nav-link pages (Header's "Log in" link, currently href="#login").
//
// Real Supabase Auth UI, mock-mode aware per the existing lib/supabaseClient.ts
// pattern (SUPABASE_MOCK_MODE): when real Supabase env vars are set, this
// calls the actual supabase-js auth methods (signInWithPassword / signUp).
// When they're not (today), it doesn't pretend to hit a live backend — the
// client points at a placeholder URL that would just network-error — so it
// clearly labels itself as a mock-mode preview and simulates success against
// mockStore instead, matching how the rest of the project (carousel,
// referrals, etc.) handles mock mode.

"use client";

import { useState } from "react";
import { supabase, SUPABASE_MOCK_MODE } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    if (SUPABASE_MOCK_MODE) {
      // Mock mode: no real Supabase project is connected yet. Simulate a
      // successful auth round-trip rather than either faking a real backend
      // call or leaving the form a dead end.
      await new Promise((r) => setTimeout(r, 400));
      setStatus("done");
      return;
    }

    const { error } =
      mode === "login"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });

    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
    } else {
      setStatus("done");
    }
  }

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[420px]">
        <p className="eyebrow">Account</p>
        <h1 className="mb-2 text-[clamp(26px,4vw,32px)]">{mode === "login" ? "Log in" : "Create your account"}</h1>

        {SUPABASE_MOCK_MODE && (
          <div className="mb-6 rounded-md2 border border-line bg-bg-soft p-3.5 text-[12.5px] leading-[1.6] text-ink-muted">
            Preview mode — no live account backend is connected yet, so this form simulates success rather than
            creating a real session.
          </div>
        )}

        {status === "done" ? (
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-1 text-[16px] font-semibold text-ink-heading">
              {mode === "login" ? "Logged in." : "Account created."}
            </p>
            <p className="text-[14px] text-ink-muted">
              {SUPABASE_MOCK_MODE
                ? "(Simulated — preview mode.)"
                : "You're all set."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-[13px] font-medium text-ink-heading">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md2 border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink-body outline-none focus:border-mint-deep"
              />
            </div>
            <div>
              <label htmlFor="password" className="mb-1.5 block text-[13px] font-medium text-ink-heading">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md2 border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink-body outline-none focus:border-mint-deep"
              />
            </div>

            {status === "error" && <p className="text-[13px] text-red-600">{errorMsg}</p>}

            <button type="submit" disabled={status === "loading"} className="btn-primary rounded-full !py-3 disabled:opacity-60">
              {status === "loading" ? "Please wait…" : mode === "login" ? "Log in" : "Sign up"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-[13.5px] text-ink-muted">
          {mode === "login" ? (
            <>
              New here?{" "}
              <button type="button" onClick={() => { setMode("signup"); setStatus("idle"); }} className="font-semibold text-mint-deep">
                Create an account
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button type="button" onClick={() => { setMode("login"); setStatus("idle"); }} className="font-semibold text-mint-deep">
                Log in
              </button>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
