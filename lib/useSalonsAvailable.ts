"use client";

// Whether any salon has been approved yet (21.10.2026). The "Find a salon"
// button on the homepage and "Get this look at a salon" on the results page
// appear only once there is at least one, so no customer lands on an empty
// list. Asked once per page load (/api/salons/search?summary=1).

import { useEffect, useState } from "react";

let asked: Promise<number> | null = null;

export function useSalonsAvailable(): boolean {
  const [yes, setYes] = useState(false);
  useEffect(() => {
    let cancelled = false;
    asked ??= fetch("/api/salons/search?summary=1")
      .then((r) => (r.ok ? r.json() : { total: 0 }))
      .then((d) => (typeof d.total === "number" ? d.total : 0))
      .catch(() => 0);
    asked.then((n) => {
      if (!cancelled) setYes(n > 0);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return yes;
}
