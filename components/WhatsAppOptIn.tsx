"use client";

// The "get it on WhatsApp" box (15.10.2026): a number and an unticked yes.
// Used on the results screen, the blog and the trivia box; the checkout has
// its own tick next to the mobile number it already asks for. Saves through
// /api/whatsapp/subscribe (see lib/whatsapp.ts). Once a number is saved the
// box says thanks, and on this device it isn't shown again.

import { useEffect, useState } from "react";
import { SUPABASE_MOCK_MODE, authHeaders } from "@/lib/authClient";
import { trackMeta } from "@/lib/metaPixel";
import { WHATSAPP_CONSENT, cleanIndianMobile, type WhatsAppSource } from "@/lib/whatsapp";

const DONE_KEY = "tf_whatsapp_done";

export async function saveWhatsAppNumber(input: {
  phone: string;
  source: WhatsAppSource;
  gender?: string | null;
  faceShape?: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/whatsapp/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify({ ...input, consent: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.error ?? "Couldn't save your number. Please try again." };
    try {
      window.localStorage.setItem(DONE_KEY, "1");
    } catch {
      /* fine */
    }
    trackMeta("Contact");
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't save your number. Please check your connection." };
  }
}

export default function WhatsAppOptIn({
  source,
  title,
  blurb,
  gender = null,
  faceShape = null,
  dark = false,
}: {
  source: WhatsAppSource;
  title: string;
  blurb: string;
  gender?: string | null;
  faceShape?: string | null;
  /** On a dark background (the trivia box). */
  dark?: boolean;
}) {
  const [hidden, setHidden] = useState(true);
  const [phone, setPhone] = useState("");
  const [yes, setYes] = useState(false);
  const [website, setWebsite] = useState("");
  const [state, setState] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  // Hidden until we know this person hasn't already given a number.
  useEffect(() => {
    let cancelled = false;
    let done = false;
    try {
      done = window.localStorage.getItem(DONE_KEY) === "1";
    } catch {
      /* fine */
    }
    if (done) return;
    if (SUPABASE_MOCK_MODE) {
      setHidden(false);
      return;
    }
    (async () => {
      const headers = await authHeaders();
      if (!headers.Authorization) {
        if (!cancelled) setHidden(false);
        return;
      }
      const res = await fetch("/api/whatsapp/subscribe", { headers }).catch(() => null);
      const data = res?.ok ? await res.json().catch(() => ({})) : {};
      if (!cancelled) setHidden(Boolean(data.subscribed));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (hidden) return null;

  async function save() {
    if (!cleanIndianMobile(phone)) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    if (!yes) {
      setError("Please tick the box to say yes.");
      return;
    }
    if (website) {
      setState("done");
      return;
    }
    setState("saving");
    setError(null);
    const result = await saveWhatsAppNumber({ phone, source, gender, faceShape });
    if (result.ok) setState("done");
    else {
      setState("idle");
      setError(result.error);
    }
  }

  const text = dark ? "text-white" : "text-ink-heading";
  const muted = dark ? "text-white/75" : "text-ink-muted";

  if (state === "done") {
    return (
      <div className={`rounded-[16px] px-5 py-4 ${dark ? "bg-white/10" : "bg-mint-pale"}`} role="status">
        <p className={`text-[15px] font-semibold ${text}`}>Thanks! You're on the list.</p>
        <p className={`mt-0.5 text-[13.5px] ${muted}`}>We'll send new hairstyles, products and blog posts to your WhatsApp. You can stop them any time.</p>
      </div>
    );
  }

  return (
    <div className={`relative rounded-[16px] px-5 py-5 text-left ${dark ? "bg-white/10" : "bg-surface shadow-card"}`}>
      <p className={`text-[16px] font-semibold ${text}`}>{title}</p>
      <p className={`mt-1 text-[14px] leading-[1.5] ${muted}`}>{blurb}</p>
      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <input
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="10-digit WhatsApp number"
          aria-label="WhatsApp number"
          value={phone}
          onChange={(e) => {
            setPhone(e.target.value);
            setError(null);
          }}
          className="w-full rounded-sm2 border border-line bg-surface px-4 py-3 text-[15px] text-ink-heading outline-none focus:border-mint-deep sm:flex-1"
        />
        <button type="button" className="btn-primary shrink-0" disabled={state === "saving"} onClick={save}>
          {state === "saving" ? "Saving…" : "Keep me posted"}
        </button>
      </div>
      {/* For robots only: people never see this box. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      <label className={`mt-3 flex items-start gap-2.5 text-[13px] leading-[1.45] ${muted}`}>
        <input
          type="checkbox"
          checked={yes}
          onChange={(e) => {
            setYes(e.target.checked);
            setError(null);
          }}
          className="mt-0.5 h-4 w-4 shrink-0 accent-mint-deep"
        />
        <span>{WHATSAPP_CONSENT}</span>
      </label>
      {error && <p className="mt-2 text-[13px] font-medium text-danger">{error}</p>}
    </div>
  );
}
