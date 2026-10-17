"use client";

// 17.10.2026 (owner): a phone showed the hairstyles screen from before the
// 14 October update, although the live site was newer. The site's code is
// loaded once per tab; moving between pages, pressing Back, or coming back
// to a tab Chrome kept in the background does not load it again.
//
// This asks /api/version which upload is live:
//   - when the browser brings a page back from its memory (Back button),
//   - when the tab comes back to the screen,
//   - when the customer moves to another page,
// and reloads the page when the live version is newer than this one. The
// customer's result screen, photo and chosen pack come back after the reload
// (they are remembered for the tab; see UploadFlow and checkout).
//
// It never reloads while the customer is in the middle of something that a
// reload would lose (a selfie not yet sent, the analysis running, waiting
// for a payment on another phone): those places call setReloadBlocked().

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

const MINE = process.env.NEXT_PUBLIC_TF_BUILD || "dev";
const MIN_GAP_MS = 30_000;

let blocked = false;

/** True while a reload would lose the customer's work. The next check after it is cleared reloads. */
export function setReloadBlocked(value: boolean) {
  blocked = value;
}

async function liveBuild(): Promise<string | null> {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { build?: unknown };
    return typeof data.build === "string" ? data.build : null;
  } catch {
    return null;
  }
}

export default function VersionWatch() {
  const pathname = usePathname();
  const lastCheck = useRef(0);

  useEffect(() => {
    if (MINE === "dev") return;
    const check = async (force = false) => {
      const now = Date.now();
      if (!force && now - lastCheck.current < MIN_GAP_MS) return;
      lastCheck.current = now;
      const live = await liveBuild();
      if (!live || live === "dev" || live === MINE) return;
      if (!blocked) window.location.reload();
    };
    const onShow = (e: PageTransitionEvent) => {
      if (e.persisted) void check(true);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    window.addEventListener("pageshow", onShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pageshow", onShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Moving to another page inside the site.
  useEffect(() => {
    if (MINE === "dev") return;
    const now = Date.now();
    if (now - lastCheck.current < MIN_GAP_MS) return;
    lastCheck.current = now;
    void liveBuild().then((live) => {
      if (!live || live === "dev" || live === MINE) return;
      if (!blocked) window.location.reload();
    });
  }, [pathname]);

  return null;
}
