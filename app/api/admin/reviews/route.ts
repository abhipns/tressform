// /api/admin/reviews — every review, for the owner to approve or hide
// (13.10.2026). OWNER ONLY. Approved comments show on the home page; hidden
// ones are left out of the average too, so hide only spam or abuse.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { mockReviews, shownName } from "@/lib/reviews";

export const dynamic = "force-dynamic";

async function guard(req: NextRequest) {
  const auth = await requireAdmin(req, SUPABASE_MOCK_MODE ? "demo-owner" : null);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function GET(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  if (SUPABASE_MOCK_MODE) {
    return NextResponse.json({
      reviews: [...mockReviews].reverse().map((r) => ({
        id: r.id,
        section: r.section,
        rating: r.rating,
        comment: r.comment,
        display_name: shownName(r.displayName, null),
        status: r.status,
        created_at: r.createdAt,
        email: null,
      })),
    });
  }
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("reviews")
    .select("id, user_id, section, rating, comment, display_name, status, created_at, updated_at")
    .order("updated_at", { ascending: false })
    .limit(500);
  if (error) return NextResponse.json({ error: "Couldn't load the reviews." }, { status: 500 });
  const ids = [...new Set((data ?? []).map((r) => r.user_id))];
  const { data: people } = ids.length
    ? await db.from("profiles").select("id, email").in("id", ids)
    : { data: [] as { id: string; email: string | null }[] };
  const emailOf = new Map((people ?? []).map((p) => [p.id, p.email]));
  return NextResponse.json({
    reviews: (data ?? []).map(({ user_id, ...r }) => ({ ...r, email: emailOf.get(user_id) ?? null })),
  });
}

export async function PATCH(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { id?: unknown; status?: unknown };
  const id = typeof body.id === "string" ? body.id.slice(0, 60) : "";
  const status = body.status;
  if (!id || (status !== "approved" && status !== "hidden" && status !== "pending")) {
    return NextResponse.json({ error: "Which review, and approve or hide?" }, { status: 400 });
  }
  if (SUPABASE_MOCK_MODE) {
    const row = mockReviews.find((r) => r.id === id);
    if (row) row.status = status;
    return NextResponse.json({ ok: true });
  }
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { error } = await getSupabaseAdmin().from("reviews").update({ status }).eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't save that." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
