// /api/admin/contacts — the WhatsApp numbers collected so far (15.10.2026).
// OWNER ONLY. GET returns the list, newest first (?format=csv for a file).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { csvRow } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req, SUPABASE_MOCK_MODE ? "demo-owner" : null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ contacts: [] });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const { data, error } = await db
    .from("whatsapp_contacts")
    .select("phone, user_id, source, gender, face_shape, opted_in_at, opted_out_at")
    .order("created_at", { ascending: false })
    .limit(5000);
  if (error) return NextResponse.json({ error: "Couldn't load the numbers." }, { status: 500 });

  const ids = [...new Set((data ?? []).map((c) => c.user_id).filter(Boolean) as string[])];
  const { data: people } = ids.length ? await db.from("profiles").select("id, email, full_name").in("id", ids) : { data: [] };
  const who = new Map((people ?? []).map((p: { id: string; email: string | null; full_name: string | null }) => [p.id, p]));
  const contacts = (data ?? []).map(({ user_id, ...c }) => ({
    ...c,
    email: user_id ? who.get(user_id)?.email ?? null : null,
    name: user_id ? who.get(user_id)?.full_name ?? null : null,
  }));

  if (req.nextUrl.searchParams.get("format") === "csv") {
    const lines = [
      csvRow(["Phone", "Name", "Email", "Where", "Gender", "Face shape", "Said yes on", "Stopped on"]),
      ...contacts.map((c) =>
        csvRow([c.phone, c.name, c.email, c.source, c.gender, c.face_shape, c.opted_in_at, c.opted_out_at])
      ),
    ];
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="tressform-whatsapp-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }
  return NextResponse.json({ contacts });
}
