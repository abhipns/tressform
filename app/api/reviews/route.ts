// /api/reviews — customer reviews (13.10.2026).
//
// GET   (public) the average for each section and the newest approved reviews,
//       for the home page.
// POST  (signed in) save the customer's review for one section. A customer
//       can rate the free list once they have uploaded a selfie, and the AI
//       hairstyles once they have bought a pack. Sending again changes their
//       review; a changed review waits for the owner's approval again.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import {
  REVIEW_SECTION_IDS,
  averageOf,
  mockReviews,
  readReview,
  shownName,
  type PublicReview,
  type ReviewSection,
  type ReviewSummary,
} from "@/lib/reviews";

export const dynamic = "force-dynamic";

const SHOW_LATEST = 12;

export async function GET() {
  const summary = {} as Record<ReviewSection, ReviewSummary>;
  let reviews: PublicReview[] = [];

  if (SUPABASE_MOCK_MODE) {
    for (const s of REVIEW_SECTION_IDS) {
      summary[s] = averageOf(mockReviews.filter((r) => r.section === s && r.status !== "hidden").map((r) => r.rating));
    }
    reviews = mockReviews
      .filter((r) => r.status === "approved")
      .slice(-SHOW_LATEST)
      .reverse()
      .map((r) => ({ id: r.id, section: r.section, rating: r.rating, comment: r.comment, name: shownName(r.displayName, null), date: r.createdAt }));
    return NextResponse.json({ summary, reviews });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const [{ data: all }, { data: approved }] = await Promise.all([
    db.from("reviews").select("section, rating").neq("status", "hidden").limit(10000),
    db
      .from("reviews")
      .select("id, section, rating, comment, display_name, created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(SHOW_LATEST),
  ]);
  for (const s of REVIEW_SECTION_IDS) {
    summary[s] = averageOf((all ?? []).filter((r) => r.section === s).map((r) => r.rating));
  }
  reviews = (approved ?? []).map((r) => ({
    id: r.id,
    section: r.section,
    rating: r.rating,
    comment: r.comment,
    name: r.display_name || "A Tressform customer",
    date: r.created_at,
  }));
  return NextResponse.json(
    { summary, reviews },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } }
  );
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const auth = await requireUser(req, typeof body.userId === "string" ? body.userId : null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const read = readReview(body);
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: 400 });
  const review = read.review;

  if (SUPABASE_MOCK_MODE) {
    const now = new Date().toISOString();
    const existing = mockReviews.find((r) => r.userId === auth.userId && r.section === review.section);
    if (existing) Object.assign(existing, review, { status: "pending" });
    else mockReviews.push({ ...review, id: crypto.randomUUID(), userId: auth.userId, status: "pending", createdAt: now });
    return NextResponse.json({ ok: true });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const { data: profile } = await db.from("profiles").select("role, full_name").eq("id", auth.userId).maybeSingle();
  const isOwner = profile?.role === "ADMIN";

  // Only someone who used that part can rate it.
  if (!isOwner) {
    if (review.section === "list") {
      const { count } = await db.from("photos").select("id", { count: "exact", head: true }).eq("user_id", auth.userId);
      if (!count) return NextResponse.json({ error: "Upload a selfie and see your list first." }, { status: 403 });
    } else {
      const { count } = await db
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", auth.userId)
        .eq("status", "PAID");
      if (!count) return NextResponse.json({ error: "You can rate the AI hairstyles once you've tried them." }, { status: 403 });
    }
  }

  const { error } = await db.from("reviews").upsert(
    {
      user_id: auth.userId,
      section: review.section,
      rating: review.rating,
      comment: review.comment,
      display_name: shownName(review.displayName, profile?.full_name ?? auth.name ?? null),
      status: "pending",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,section" }
  );
  if (error) return NextResponse.json({ error: "Your review couldn't be saved. Please try again." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
