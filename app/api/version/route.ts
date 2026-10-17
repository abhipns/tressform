// GET /api/version — which upload of the site is live right now (17.10.2026).
//
// components/VersionWatch.tsx compares this with the version the open page
// was built from. A phone can keep a tab open for days, and pressing Back
// can bring back a copy saved before an update; when the two differ, the
// page reloads itself so customers never use an old version of the site.

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { build: process.env.VERCEL_GIT_COMMIT_SHA || process.env.NEXT_PUBLIC_TF_BUILD || "dev" },
    { headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
