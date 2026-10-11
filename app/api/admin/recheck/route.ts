// /api/admin/recheck — owner only. Scores pictures that were made before
// the safety net existed (11.10.2026).
//
// The net compares every new preview with the photo it was made from and
// records two numbers: how alike the faces are and how far the head turned
// (lib/previewCheck.ts). Its pass/fail limits were first guesses. The best
// evidence for setting them is already in storage: the pictures the owner
// made while choosing an image model, including the ones everyone agreed
// were wrong (another man's face, a head turned to the side). This route
// runs the same comparison over those and saves the numbers next to each
// picture, so the limits can be set from them.
//
// It changes nothing a customer sees: it only fills in the `check_result`
// column of rows that have none. Each call does a small batch and says how
// many are left; the Studio page calls it until none are.

import { NextRequest, NextResponse } from "next/server";
import { checkPreview, poseFromAnalysis } from "@/lib/previewCheck";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const maxDuration = 60;

const BATCH = 12;
const AT_ONCE = 4;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ scored: 0, remaining: 0, note: "No database connected." });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const pending = () =>
    admin
      .from("style_results")
      .select("id, photo_id, result_storage_path", { count: "exact" })
      .is("check_result", null)
      .eq("status", "SUCCEEDED")
      .not("result_storage_path", "is", null)
      .not("result_storage_path", "like", "http%");

  const { data: rows, error, count } = await pending().order("created_at", { ascending: false }).limit(BATCH);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rows || rows.length === 0) return NextResponse.json({ scored: 0, remaining: 0 });

  // Each original photo is fetched once, however many pictures were made from it.
  const photoIds = [...new Set(rows.map((r) => r.photo_id))];
  const { data: photos } = await admin.from("photos").select("id, storage_path, rekognition_raw").in("id", photoIds);
  const originals = new Map<string, { bytes: Uint8Array | null; pose: ReturnType<typeof poseFromAnalysis> }>();
  await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data: file } = await admin.storage.from("photos").download(photo.storage_path);
      originals.set(photo.id, {
        bytes: file ? new Uint8Array(await file.arrayBuffer()) : null,
        pose: poseFromAnalysis(photo.rekognition_raw),
      });
    })
  );

  let scored = 0;
  let unavailable: string | null = null;
  const queue = [...rows];
  const worker = async () => {
    for (let row = queue.shift(); row; row = queue.shift()) {
      const original = originals.get(row.photo_id);
      const { data: file } = await admin.storage.from("results").download(row.result_storage_path!);
      // A picture or photo that is no longer in storage (the 90-day clean-up)
      // is marked so it is not tried again.
      if (!original?.bytes || !file) {
        await admin.from("style_results").update({ check_result: { checked: false, note: "file no longer in storage", rescored: true } }).eq("id", row.id);
        continue;
      }
      const verdict = await checkPreview(original.bytes, new Uint8Array(await file.arrayBuffer()), original.pose);
      if (!verdict.checked) {
        // The face service refused (for example a missing permission):
        // stop, and leave the rows untouched for a later run.
        unavailable = verdict.note;
        queue.length = 0;
        return;
      }
      await admin.from("style_results").update({ check_result: { ...verdict, attempts: 1, rescored: true } }).eq("id", row.id);
      scored += 1;
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));

  if (unavailable) return NextResponse.json({ error: `The check could not run: ${unavailable}.`, scored }, { status: 502 });

  const { count: left } = await pending().limit(1);
  return NextResponse.json({ scored, remaining: left ?? Math.max(0, (count ?? 0) - rows.length) });
}
