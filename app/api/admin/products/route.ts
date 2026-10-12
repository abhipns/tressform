// /api/admin/products — the owner's hair-care product list. OWNER ONLY.
//
// 12.10.2026. GET lists every product (switched off ones too) with how many
// times each was tapped in the last 30 days; POST adds one; PATCH changes
// one; DELETE removes one. The buy link must be a full https:// link — it's
// the affiliate link from EarnKaro, Amazon Associates or the like, pasted in
// by the owner.

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { KIND_IDS, STORES } from "@/lib/content/haircare";
import type { AffiliateProductRow } from "@/lib/database.types";

export const dynamic = "force-dynamic";

type Input = {
  title?: unknown;
  brand?: unknown;
  kind?: unknown;
  store?: unknown;
  link?: unknown;
  note?: unknown;
  gender?: unknown;
  hairTypes?: unknown;
  sortOrder?: unknown;
  active?: unknown;
};

const text = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Check and tidy what the form sent. `partial` = only the fields given (PATCH). */
function readInput(body: Input, partial: boolean): { ok: true; row: Partial<AffiliateProductRow> } | { ok: false; error: string } {
  const row: Partial<AffiliateProductRow> = {};
  if (!partial || body.title !== undefined) {
    const title = text(body.title, 120);
    if (title.length < 2) return { ok: false, error: "Give the product a name." };
    row.title = title;
  }
  if (!partial || body.link !== undefined) {
    const link = text(body.link, 2000);
    let ok = false;
    try {
      ok = new URL(link).protocol === "https:";
    } catch {
      ok = false;
    }
    if (!ok) return { ok: false, error: "Paste the full buy link, starting with https://" };
    row.earnkaro_tracked_url = link;
  }
  if (!partial || body.kind !== undefined) {
    const kind = text(body.kind, 40);
    if (!KIND_IDS.includes(kind as never)) return { ok: false, error: "Choose what kind of product it is." };
    row.kind = kind;
  }
  if (body.brand !== undefined) row.brand = text(body.brand, 60) || null;
  if (body.store !== undefined) {
    const store = text(body.store, 30);
    row.store = (STORES as readonly string[]).includes(store) ? store : "Other";
  }
  if (body.note !== undefined) row.description = text(body.note, 140) || null;
  if (body.gender !== undefined) {
    const g = text(body.gender, 10);
    row.gender = g === "men" || g === "women" ? g : "all";
  }
  if (body.hairTypes !== undefined) {
    const list = Array.isArray(body.hairTypes) ? body.hairTypes : [];
    row.hair_types = ["straight", "wavy", "curly"].filter((t) => list.includes(t));
  }
  if (body.sortOrder !== undefined) {
    const n = Number(body.sortOrder);
    row.sort_order = Number.isFinite(n) ? Math.max(0, Math.min(9999, Math.round(n))) : 0;
  }
  if (body.active !== undefined) row.is_active = body.active === true;
  return { ok: true, row };
}

// The local demo keeps products in memory.
const demoRows: AffiliateProductRow[] = [];

async function guard(req: NextRequest) {
  const auth = await requireAdmin(req, SUPABASE_MOCK_MODE ? "demo-owner" : null);
  return auth.ok ? null : NextResponse.json({ error: auth.error }, { status: auth.status });
}

export async function GET(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ products: demoRows.map((r) => ({ ...r, clicks30: 0 })) });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("affiliate_products")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) return NextResponse.json({ error: "Couldn't load the products." }, { status: 500 });

  const since = new Date(Date.now() - 30 * 86400_000).toISOString();
  const { data: clicks } = await db.from("affiliate_clicks").select("product_id").gte("created_at", since).limit(50000);
  const count: Record<string, number> = {};
  for (const c of clicks ?? []) count[c.product_id] = (count[c.product_id] ?? 0) + 1;
  return NextResponse.json({ products: (data ?? []).map((r) => ({ ...r, clicks30: count[r.id] ?? 0 })) });
}

export async function POST(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Input;
  const read = readInput(body, false);
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: 400 });
  const row = { gender: "all" as const, hair_types: [], is_active: true, sort_order: 0, ...read.row };

  if (SUPABASE_MOCK_MODE) {
    const now = new Date().toISOString();
    const full = { id: crypto.randomUUID(), description: null, image_url: null, original_url: null, category: null, price_paise: null, brand: null, store: null, created_at: now, updated_at: now, ...row } as AffiliateProductRow;
    demoRows.push(full);
    return NextResponse.json({ product: full });
  }
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { data, error } = await getSupabaseAdmin().from("affiliate_products").insert(row).select("*").single();
  if (error) return NextResponse.json({ error: "Couldn't save the product." }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function PATCH(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const body = (await req.json().catch(() => ({}))) as Input & { id?: unknown };
  const id = text(body.id, 60);
  if (!id) return NextResponse.json({ error: "Which product?" }, { status: 400 });
  const read = readInput(body, true);
  if (!read.ok) return NextResponse.json({ error: read.error }, { status: 400 });
  const changes = { ...read.row, updated_at: new Date().toISOString() };

  if (SUPABASE_MOCK_MODE) {
    const row = demoRows.find((r) => r.id === id);
    if (row) Object.assign(row, changes);
    return NextResponse.json({ product: row ?? null });
  }
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { data, error } = await getSupabaseAdmin().from("affiliate_products").update(changes).eq("id", id).select("*").single();
  if (error) return NextResponse.json({ error: "Couldn't save the change." }, { status: 500 });
  return NextResponse.json({ product: data });
}

export async function DELETE(req: NextRequest) {
  const denied = await guard(req);
  if (denied) return denied;
  const id = (req.nextUrl.searchParams.get("id") ?? "").slice(0, 60);
  if (!id) return NextResponse.json({ error: "Which product?" }, { status: 400 });
  if (SUPABASE_MOCK_MODE) {
    const i = demoRows.findIndex((r) => r.id === id);
    if (i >= 0) demoRows.splice(i, 1);
    return NextResponse.json({ ok: true });
  }
  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const { error } = await getSupabaseAdmin().from("affiliate_products").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Couldn't remove it." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
