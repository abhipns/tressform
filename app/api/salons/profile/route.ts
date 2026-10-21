// /api/salons/profile?slug=… — one salon's profile, for /salons/[slug]
// (21.10.2026).
//
// An approved (ACTIVE) salon is public. A salon still under review, or
// suspended, is shown only to its own owner and to the site owner — with
// `preview: true`, so the page can say "only you can see this".
// The owner's email is never sent; the mobile and WhatsApp numbers are, as
// the salon gave them for customers to contact it.

import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { toPublicSalon } from "@/lib/salons";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ error: "Not found." }, { status: 404 });
  const slug = (req.nextUrl.searchParams.get("slug") || "").trim();
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return NextResponse.json({ error: "Not found." }, { status: 404 });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  const { data: row } = await admin.from("salons").select("*").eq("slug", slug).maybeSingle();
  if (!row) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let preview = false;
  if (row.status !== "ACTIVE") {
    // Only the salon's owner or the site owner may see it before it's approved.
    const header = req.headers.get("authorization") || "";
    const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
    const { data: who } = token ? await admin.auth.getUser(token) : { data: { user: null } };
    const userId = who?.user?.id;
    if (!userId) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (userId !== row.owner_id) {
      const { data: me } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
      if (me?.role !== "ADMIN") return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    preview = true;
  }

  const [{ data: images }, { data: stylists }] = await Promise.all([
    admin.from("salon_images").select("*").eq("salon_id", row.id).order("sort_order"),
    admin.from("salon_stylists").select("*").eq("salon_id", row.id).order("sort_order"),
  ]);
  return NextResponse.json({ preview, salon: toPublicSalon(row, images ?? [], stylists ?? []) });
}
