"use client";

// Counts page visits for the owner's dashboard (13.10.2026). See
// app/api/visit/route.ts: a random id made on this device, no cookies.
// Each page is counted once per browser tab, not on every re-render.

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { currentCampaign, rememberCampaign } from "@/lib/campaign";

const ID_KEY = "tf_visitor";
let memoryId: string | null = null;

function visitorId(): string {
  try {
    const saved = window.localStorage.getItem(ID_KEY);
    if (saved && /^[A-Za-z0-9-]{8,64}$/.test(saved)) return saved;
    const made = crypto.randomUUID();
    window.localStorage.setItem(ID_KEY, made);
    return made;
  } catch {
    // Storage blocked (private browsing): one id for this page load.
    memoryId ??= Math.random().toString(36).slice(2) + Date.now().toString(36);
    return memoryId;
  }
}

function countedAlready(path: string): boolean {
  try {
    const key = `tf_seen:${path}`;
    if (window.sessionStorage.getItem(key)) return true;
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Not remembered: may count a page twice in a tab, which is harmless.
  }
  return false;
}

export default function VisitBeacon() {
  const pathname = usePathname();
  useEffect(() => {
    // 21.10.2026: note which ad (if any) brought this visitor (lib/campaign.ts).
    rememberCampaign();
    if (!pathname || pathname.startsWith("/admin") || countedAlready(pathname)) return;
    let ref = "";
    try {
      ref = document.referrer ? new URL(document.referrer).hostname : "";
    } catch {
      ref = "";
    }
    fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor: visitorId(), path: pathname, ref, campaign: currentCampaign() }),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);
  return null;
}
