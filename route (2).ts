// POST /api/photo/background — "Remove background" on the selfie
// (17.10.2026; see lib/integrations/background.ts).
//
// Body: { photo: "data:image/jpeg;base64,…" } — the selfie as the browser
// shrank it. Answer: { image: "data:image/png;base64,…" } — the person on a
// see-through background; the browser adds the plain backdrop. Signed-in
// customers only (the selfie screen is only shown to them), and the photo
// is not stored here.

import { NextRequest, NextResponse } from "next/server";
import { BACKGROUND_OFF, removeBackground } from "@/lib/integrations/background";
import { hashedClientIp, requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { takeDailyUse } from "@/lib/usageLimits";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_CHARS = 4_000_000; // a shrunk selfie is far smaller

export async function POST(req: NextRequest) {
  if (BACKGROUND_OFF) {
    return NextResponse.json({ error: "Removing the background isn't available right now." }, { status: 503 });
  }
  let body: { photo?: unknown; userId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const auth = await requireUser(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const photo = typeof body.photo === "string" ? body.photo : "";
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(photo) || photo.length > MAX_CHARS) {
    return NextResponse.json({ error: "Please add your selfie first." }, { status: 400 });
  }

  // 20.10.2026: at most DAILY_LIMITS.background removals per account per day (lib/usageLimits.ts).
  if (!SUPABASE_MOCK_MODE) {
    const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
    const limited = await takeDailyUse(getSupabaseAdmin(), "background", auth.userId, {
      anonymous: auth.anonymous,
      ip: auth.anonymous ? await hashedClientIp(req) : undefined,
    });
    if (limited) return NextResponse.json({ error: limited, limitReached: true, needsAccount: Boolean(auth.anonymous) }, { status: 429 });
  }

  try {
    const png = await removeBackground(photo);
    return NextResponse.json({ image: `data:image/png;base64,${png.toString("base64")}` });
  } catch (err) {
    console.error("[Tressform] Background removal failed:", (err as Error)?.message ?? err);
    return NextResponse.json(
      { error: "We couldn't remove the background this time. Please try again, or use the photo as it is." },
      { status: 502 }
    );
  }
}
