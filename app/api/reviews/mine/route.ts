// /api/reviews/mine — the signed-in customer's own reviews (13.10.2026), so
// the rating box can show "You rated this 4 stars" instead of asking again.
// POST so the demo (no database) can send its demo user id.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { mockReviews } from "@/lib/reviews";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const auth = await requireUser(req, typeof body.userId === "string" ? body.userId : null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (SUPABASE_MOCK_MODE) {
    const mine = mockReviews
      .filter((r) => r.userId === auth.userId)
      .map((r) => ({ section: r.section, rating: r.rating, comment: r.comment }));
    return NextResponse.json({ reviews: mine });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { data } = await getSupabaseAdmin()
    .from("reviews")
    .select("section, rating, comment")
    .eq("user_id", auth.userId);
  return NextResponse.json({ reviews: data ?? [] });
}
