// /api/referral/visit — someone opened the site through a customer's
// referral link (26.10.2026, owner's request). Sent by the page itself
// (components/ReferralBeacon.tsx), so visitors without JavaScript — most
// robots — are never counted. The counting rules and the ₹10 credit for
// every 10 visitors are in lib/linkVisits.ts.
//
// Body: { code, visitor } — the code from ?ref= and the anonymous visitor id
// kept on this device. If the visitor is signed in, their login token comes
// too, so the code's owner opening their own link is never counted.
// Nothing personal is kept: only the code, the visitor id and when.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { normalizeReferralCode } from "@/lib/referral";
import { databaseLinkStore, mockLinkStore, recordLinkVisit } from "@/lib/linkVisits";
import { looksLikeRobot } from "@/lib/stats";
import { mockStore } from "@/lib/mockStore";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (looksLikeRobot(req.headers.get("user-agent"))) return NextResponse.json({ counted: false });
  const body = (await req.json().catch(() => ({}))) as { code?: unknown; visitor?: unknown; userId?: unknown };
  const code = normalizeReferralCode(body.code);
  const visitor = typeof body.visitor === "string" ? body.visitor : null;

  // Signed in? Then it may be the code's owner. Not signed in is fine.
  const hasToken = Boolean(req.headers.get("authorization"));
  const mockUser = SUPABASE_MOCK_MODE && typeof body.userId === "string" ? body.userId : null;
  const auth = hasToken || mockUser ? await requireUser(req, mockUser) : null;
  const signedInUserId = auth?.ok ? auth.userId : null;

  try {
    const store = SUPABASE_MOCK_MODE
      ? mockLinkStore(mockStore)
      : databaseLinkStore((await import("@/lib/supabaseClient")).getSupabaseAdmin());
    const result = await recordLinkVisit(store, { code, visitor, signedInUserId });
    return NextResponse.json({ counted: result.counted });
  } catch (err) {
    // Never in the visitor's way — but the owner should know if it isn't working.
    console.error("[Tressform] link visit not counted:", (err as Error).message);
    return NextResponse.json({ counted: false });
  }
}
