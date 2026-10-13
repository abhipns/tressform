// /api/admin/income — affiliate income the owner types in from the Amazon
// Associates and EarnKaro dashboards, one total per month and source
// (13.10.2026). OWNER ONLY. Those shops don't tell us which customer bought
// what, so the monthly total is what goes on the dashboard.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { monthStart } from "@/lib/stats";

export const dynamic = "force-dynamic";

async function guard(req: NextRequest) {
  const auth = await requireAdmin(req, SUPABASE_MOCK_MODE ? "demo-owner" : null);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const month = monthStart(typeof body.month === "string" ? body.month : "");
  const source = body.source;
  const amount = Number(body.amount);
  if (!month) return NextResponse.json({ error: "Choose the month." }, { status: 400 });
  if (source !== "amazon" && source !== "earnkaro" && source !== "other") {
    return NextResponse.json({ error: "Choose where it came from." }, { status: 400 });
  }
  if (!Number.isFinite(amount) || amount < 0 || amount > 10_000_000) {
    return NextResponse.json({ error: "Type the amount in rupees, for example 450." }, { status: 400 });
  }
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ ok: true });
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { error } = await getSupabaseAdmin()
    .from("affiliate_income")
    .upsert(
      { month, source, amount_paise: Math.round(amount * 100), note: typeof body.note === "string" ? body.note.slice(0, 200) : null },
      { onConflict: "month,source" }
    );
  if (error) return NextResponse.json({ error: "Couldn't save it." }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const id = (req.nextUrl.searchParams.get("id") ?? "").slice(0, 60);
  if (!id) return NextResponse.json({ error: "Which one?" }, { status: 400 });
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ ok: true });
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { error } = await getSupabaseAdmin().from("affiliate_income").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't remove it." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
