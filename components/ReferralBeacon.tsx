"use client";

// Referral links (14.10.2026). See lib/referral.ts for the whole flow.
//
// On any page: if the address has ?ref=<code>, keep the code on this device
// (and tidy it out of the address bar). Whenever the visitor is signed in
// and a code is kept, ask /api/referral/claim to link them to that friend.
// The code is forgotten once the link is made or can never be made (their
// own code, already linked, already paid before); it's kept if they simply
// aren't signed in yet, so it works whenever they sign up — even days later
// on the same device.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { SUPABASE_MOCK_MODE, authHeaders, getMockUserId, useSession } from "@/lib/authClient";

const KEY = "tf_ref";
let sending = false;

function readKept(): string | null {
  try {
    return window.localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

function keep(code: string) {
  try {
    window.localStorage.setItem(KEY, code);
  } catch {
    /* storage blocked — the code only lives for this page load */
  }
}

function forget() {
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    /* nothing to do */
  }
}

/** Take ?ref= from the address, keep it, and remove it from the address bar. */
function captureFromAddress(): string | null {
  const url = new URL(window.location.href);
  const raw = url.searchParams.get("ref");
  if (!raw) return null;
  const code = raw.trim().toLowerCase().slice(0, 24);
  keep(code);
  url.searchParams.delete("ref");
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  return code;
}

export default function ReferralBeacon() {
  const pathname = usePathname();
  const { session, loading } = useSession();
  const userId = session?.user.id ?? null;

  useEffect(() => {
    const code = captureFromAddress() ?? readKept();
    if (!code || sending) return;
    if (!SUPABASE_MOCK_MODE && (loading || !userId)) return; // wait until signed in

    sending = true;
    (async () => {
      try {
        const res = await fetch("/api/referral/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ code, userId: SUPABASE_MOCK_MODE ? getMockUserId() : undefined }),
        });
        const data = (await res.json().catch(() => ({}))) as { linked?: boolean; final?: boolean };
        if (data.linked || data.final) forget();
      } catch {
        // Network trouble: keep the code and try again on the next page.
      } finally {
        sending = false;
      }
    })();
  }, [pathname, userId, loading]);

  return null;
}
