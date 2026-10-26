// /api/admin/orders — paid and refunded orders, and "Mark as refunded"
// (14.10.2026). OWNER ONLY. The refund rules are in lib/refunds.ts.
//
// GET   the latest 200 paid or refunded orders, newest first, with the
//       buyer's email and PayU's transaction id (to find it in PayU).
// POST  { orderId } — mark that order as refunded.
//
// 26.10.2026 (single pictures): picture orders show which hairstyle and
// views were bought, and each picture that failed 3 times or was paid for
// twice — for the owner to refund that one picture in PayU. POST
// { orderId, view } then marks just that picture as refunded.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { refundOrder } from "@/lib/refunds";
import { mockStore } from "@/lib/mockStore";
import { hairstyleById } from "@/lib/content/hairstyles";
import { PICTURE_VIEWS } from "@/lib/pricing";

type Problem = { view: string; status: "REFUND_DUE" | "DUPLICATE" | "REFUNDED"; failures: number };
const PROBLEMS = ["REFUND_DUE", "DUPLICATE", "REFUNDED"];

export const dynamic = "force-dynamic";

async function guard(req: NextRequest) {
  const auth = await requireAdmin(req, SUPABASE_MOCK_MODE ? "demo-owner" : null);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function GET(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  if (SUPABASE_MOCK_MODE) {
    // 26.10.2026: the demo's own orders, so single pictures can be tried end to end.
    const orders = [...mockStore.orders.values()]
      .filter((o) => o.status === "PAID" || o.status === "REFUNDED")
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((o) => ({
        id: o.id,
        tier: o.tier,
        price_paise: o.pricePaise,
        credit_used_paise: o.creditUsedPaise ?? 0,
        status: o.status,
        paid_at: o.paidAt,
        created_at: o.createdAt,
        preview_count: o.previewCount ?? 0,
        previews_used: o.previewsUsed ?? 0,
        email: "demo customer",
        txnid: o.razorpayOrderId,
        order_kind: o.orderKind ?? "PACK",
        style_name: o.pictureStyleId ? hairstyleById(o.pictureStyleId)?.name ?? o.pictureStyleId : null,
        picture_views: o.pictureViews ?? [],
        problems: [...mockStore.pictureViews.values()]
          .filter((v) => v.orderId === o.id && PROBLEMS.includes(v.status))
          .map((v) => ({ view: v.view, status: v.status, failures: v.failures }) as Problem),
      }));
    return NextResponse.json({ orders });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("orders")
    .select("id, user_id, tier, price_paise, credit_used_paise, status, paid_at, created_at, preview_count, previews_used, razorpay_order_id, order_kind, picture_style_id, picture_views")
    .in("status", ["PAID", "REFUNDED"])
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: "Couldn't load the orders." }, { status: 500 });
  const ids = [...new Set((data ?? []).map((o) => o.user_id as string))];
  const { data: people } = ids.length ? await db.from("profiles").select("id, email").in("id", ids) : { data: [] };
  const emailOf = new Map((people ?? []).map((p: { id: string; email: string | null }) => [p.id, p.email]));
  // 26.10.2026: single pictures that failed 3 times or were paid for twice.
  const pictureIds = (data ?? []).filter((o) => o.order_kind === "PICTURES").map((o) => o.id as string);
  const { data: problemRows } = pictureIds.length
    ? await db.from("picture_views").select("order_id, view, status, failures").in("order_id", pictureIds).in("status", PROBLEMS)
    : { data: [] };
  return NextResponse.json({
    orders: (data ?? []).map(({ user_id, razorpay_order_id, picture_style_id, ...o }) => ({
      ...o,
      email: emailOf.get(user_id as string) ?? null,
      // PayU's transaction id (column name left over from Razorpay — see lib/payments.ts).
      txnid: razorpay_order_id,
      style_name: picture_style_id ? hairstyleById(picture_style_id as string)?.name ?? picture_style_id : null,
      problems: (problemRows ?? [])
        .filter((r: { order_id: string }) => r.order_id === o.id)
        .map(({ view, status, failures }: Problem & { order_id: string }) => ({ view, status, failures })),
    })),
  });
}

export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as { orderId?: unknown; view?: unknown };
  const orderId = typeof body.orderId === "string" ? body.orderId.slice(0, 60) : "";
  if (!orderId) return NextResponse.json({ error: "Which order?" }, { status: 400 });

  // 26.10.2026: one picture of a single-picture order, refunded by the owner in PayU.
  if (typeof body.view === "string") {
    const view = body.view;
    if (!(PICTURE_VIEWS as string[]).includes(view)) return NextResponse.json({ error: "Which picture?" }, { status: 400 });
    if (SUPABASE_MOCK_MODE) {
      const row = mockStore.pictureViews.get(`${orderId}:${view}`);
      if (!row || (row.status !== "REFUND_DUE" && row.status !== "DUPLICATE")) {
        return NextResponse.json({ error: "That picture isn't waiting for a refund." }, { status: 409 });
      }
      row.status = "REFUNDED";
      return NextResponse.json({ ok: true, view });
    }
    const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
    const { data: rows } = await getSupabaseAdmin()
      .from("picture_views")
      .update({ status: "REFUNDED", updated_at: new Date().toISOString() })
      .eq("order_id", orderId)
      .eq("view", view)
      .in("status", ["REFUND_DUE", "DUPLICATE"])
      .select("view");
    if (!rows || rows.length === 0) return NextResponse.json({ error: "That picture isn't waiting for a refund." }, { status: 409 });
    return NextResponse.json({ ok: true, view });
  }

  if (SUPABASE_MOCK_MODE) return NextResponse.json({ error: "Not available in the demo." }, { status: 400 });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const result = await refundOrder(getSupabaseAdmin(), orderId);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 409 });
  return NextResponse.json(result);
}
