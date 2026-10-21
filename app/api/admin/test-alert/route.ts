// /api/admin/test-alert — "Send test alert" on the owner's Dashboard
// (21.10.2026, owner's request). Sends one short message by every alert
// channel set up in Vercel (lib/ownerAlerts.ts: email, Telegram, WhatsApp)
// and says which ones went, so the owner can check them without waiting for
// the fal.ai balance to run low. OWNER ONLY (requireAdmin).

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/serverAuth";
import { sendOwnerAlert } from "@/lib/ownerAlerts";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sent = await sendOwnerAlert(
    "Test alert",
    "This is a test from your Tressform Dashboard. If you can read this, alerts reach you here."
  );
  return NextResponse.json({ ok: true, ...sent });
}
