// /auth/update-password — where the "Forgot password?" email link lands
// (09.10.2026, real sign-in work). The link logs the customer in with a
// short-lived recovery session; this page lets them choose a new password.

"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SUPABASE_MOCK_MODE } from "@/lib/authClient";

type Status = "checking" | "ready" | "no-session" | "saving" | "done" | "error";

export default function UpdatePasswordPage() {
  const [status, setStatus] = useState<Status>("checking");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (SUPABASE_MOCK_MODE) {
      setStatus("no-session");
      return;
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setStatus(data.session ? "ready" : "no-session");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setErrorMsg("");
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrorMsg(error.message);
      setStatus("error");
      return;
    }
    setStatus("done");
  }

  return (
    <section className="wrap py-16">
      <div className="mx-auto max-w-[420px]">
        <p className="eyebrow">Account</p>
        <h1 className="mb-6 text-[clamp(26px,4vw,32px)]">Choose a new password</h1>

        {status === "checking" && <p className="text-[14px] text-ink-muted">One moment…</p>}

        {status === "no-session" && (
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-5 text-[14px] leading-[1.6] text-ink-muted">
              This reset link has expired or was already used. Request a new one from the log in page.
            </p>
            <a href="/login" className="btn-primary">
              Back to Log in
            </a>
          </div>
        )}

        {status === "done" && (
          <div className="rounded-lg2 border border-line bg-surface p-6 text-center">
            <p className="mb-5 text-[16px] font-semibold text-ink-heading">Password updated.</p>
            <a href="/#upload" className="btn-primary">
              Continue
            </a>
          </div>
        )}

        {(status === "ready" || status === "saving" || status === "error") && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label htmlFor="new-password" className="mb-1.5 block text-[13px] font-medium text-ink-heading">
                New password
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-md2 border border-line bg-surface px-3.5 py-2.5 text-[14px] text-ink-body outline-none focus:border-mint-deep"
              />
              <p className="mt-1.5 text-[12px] text-ink-muted">At least 8 characters.</p>
            </div>
            {status === "error" && <p className="text-[13px] font-medium text-danger">{errorMsg}</p>}
            <button type="submit" disabled={status === "saving"} className="btn-primary rounded-full !py-3 disabled:opacity-60">
              {status === "saving" ? "Saving…" : "Save new password"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
