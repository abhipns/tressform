// /api/admin/reread — owner only. Reads the owner's earlier photos again
// with the new photo reading (11.10.2026).
//
// The reading (lib/integrations/vision.ts) gives face shape, hair length
// and hair type. It was written without being able to run it against a real
// photo, so before customers rely on it, it is tried on photos already in
// storage: the ones the owner uploaded while testing. This route reads each
// of them and saves the answer beside the photo's other measurements, where
// it can be looked at: do different people get different shapes, does the
// same person get the same shape twice, and what does a reading cost.
//
// Earlier photos were uploaded before the site asked whether men's or
// women's hairstyles were wanted, and hair length is described differently
// for each, so every photo is read both ways.
//
// It changes nothing a customer sees. Each call does a small batch and says
// how many are left; the Studio page calls it until none are.

import { NextRequest, NextResponse } from "next/server";
import { readPhoto, type PhotoReading } from "@/lib/integrations/vision";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const maxDuration = 60;

const BATCH = 6;
const AT_ONCE = 3;
const LINK_SECONDS = 300;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ read: 0, remaining: 0, note: "No database connected." });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const pending = () =>
    admin
      .from("photos")
      .select("id, storage_path, rekognition_raw", { count: "exact" })
      .is("rekognition_raw->tressform->reread", null)
      .not("storage_path", "like", "data:%");

  const { data: rows, error, count } = await pending().order("created_at", { ascending: false }).limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ read: 0, remaining: 0, shapes: {}, costPaise: 0 });

  let read = 0;
  let costPaise = 0;
  let stopped: string | null = null;
  const shapes: Record<string, number> = {};
  const queue = [...rows];

  const save = async (row: (typeof rows)[number], reread: Record<string, unknown>) => {
    const raw = (row.rekognition_raw ?? {}) as Record<string, unknown>;
    const tressform = (raw.tressform ?? {}) as Record<string, unknown>;
    const { error: saveError } = await admin
      .from("photos")
      .update({ rekognition_raw: { ...raw, tressform: { ...tressform, reread } } })
      .eq("id", row.id);
    if (saveError) console.error("[Tressform] Could not save a re-read:", saveError.message);
  };

  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      const { data: link } = await admin.storage.from("photos").createSignedUrl(row.storage_path, LINK_SECONDS);
      // A photo that is no longer in storage (the 90-day clean-up) is marked so it is not tried again.
      if (!link?.signedUrl) {
        await save(row, { note: "file no longer in storage" });
        continue;
      }
      const [men, women]: PhotoReading[] = await Promise.all([
        readPhoto(link.signedUrl, "men"),
        readPhoto(link.signedUrl, "women"),
      ]);
      costPaise += (men.costPaise ?? 0) + (women.costPaise ?? 0);
      // The very first reading failing means the service itself is not
      // answering: stop and say why, and leave the photos for a later run.
      if (!men.ok && !women.ok && read === 0) {
        stopped = men.note || women.note || "the reading failed";
        queue.length = 0;
        return;
      }
      await save(row, { men, women, at: new Date().toISOString() });
      const shape = men.faceShape ?? women.faceShape ?? "No reading";
      shapes[shape] = (shapes[shape] ?? 0) + 1;
      read += 1;
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));

  if (stopped) return NextResponse.json({ error: `The reading could not run: ${stopped}.`, read, shapes, costPaise }, { status: 502 });

  const { count: left } = await pending().limit(1);
  return NextResponse.json({ read, remaining: left ?? Math.max(0, (count ?? 0) - rows.length), shapes, costPaise });
}
