// /api/admin/reread — owner only. Reads the owner's earlier photos again
// with the photo reading (11.10.2026).
//
// The reading (lib/integrations/vision.ts) gives face shape, hair length
// and hair type. It was written without being able to run it against a real
// photo, so it is tried on photos already in storage: the ones the owner
// uploaded while testing. This route reads each of them and saves the
// answer beside the photo's other measurements, where it can be looked at:
// do different people get different shapes, do the two wordings of the
// question agree, and what does a reading cost.
//
// Earlier photos were uploaded before the site asked whether men's or
// women's hairstyles were wanted, and hair length is described differently
// for each, so every photo is read both ways.
//
// ROUNDS. Each time the question is changed, ROUND below goes up by one and
// the tool reads every photo again; the earlier answers are kept beside the
// new ones (reread, reread2, …) so the two can be compared.
//   1  the first wording, one reading per photo and gender
//   2  two readings per photo and gender (readPhotoTwice), with the
//      hairline and curly-hair notes added to the question
//
// It changes nothing a customer sees. Each call does a small batch and says
// how many are left; the Studio page calls it until none are.

import { NextRequest, NextResponse } from "next/server";
import { readPhotoTwice, type CheckedReading } from "@/lib/integrations/vision";
import { requireAdmin, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const maxDuration = 60;

const ROUND = 2;
const KEY = `reread${ROUND}`;
const BATCH = 4;
const AT_ONCE = 2;
// Photos looked through for ones this round has not read yet. Far more than the owner has uploaded.
const LOOK_AT = 300;
const LINK_SECONDS = 300;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req, null);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (SUPABASE_MOCK_MODE) return NextResponse.json({ read: 0, remaining: 0, note: "No database connected." });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  // The filter is done here rather than in the query: "this key is missing
  // inside a JSON column" is easy to get subtly wrong in a query string,
  // and there are only a few dozen photos.
  const { data: all, error } = await admin
    .from("photos")
    .select("id, storage_path, rekognition_raw")
    .not("storage_path", "like", "data:%")
    .order("created_at", { ascending: false })
    .limit(LOOK_AT);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const waiting = (all ?? []).filter((photo) => {
    const tressform = (photo.rekognition_raw as { tressform?: Record<string, unknown> } | null)?.tressform;
    return !tressform?.[KEY];
  });
  const rows = waiting.slice(0, BATCH);
  if (rows.length === 0) return NextResponse.json({ read: 0, remaining: 0, shapes: {}, costPaise: 0, agreed: 0, differed: 0 });

  let read = 0;
  let agreed = 0;
  let differed = 0;
  let costPaise = 0;
  let stopped: string | null = null;
  const shapes: Record<string, number> = {};
  const queue = [...rows];

  const save = async (row: (typeof rows)[number], reread: Record<string, unknown>) => {
    const raw = (row.rekognition_raw ?? {}) as Record<string, unknown>;
    const tressform = (raw.tressform ?? {}) as Record<string, unknown>;
    const { error: saveError } = await admin
      .from("photos")
      .update({ rekognition_raw: { ...raw, tressform: { ...tressform, [KEY]: reread } } })
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
      const [men, women]: CheckedReading[] = await Promise.all([
        readPhotoTwice(link.signedUrl, "men"),
        readPhotoTwice(link.signedUrl, "women"),
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
      if (men.agreed === true) agreed += 1;
      if (men.agreed === false) differed += 1;
      read += 1;
    }
  };
  await Promise.all(Array.from({ length: AT_ONCE }, worker));

  if (stopped) return NextResponse.json({ error: `The reading could not run: ${stopped}.`, read, shapes, costPaise, agreed, differed }, { status: 502 });

  return NextResponse.json({ read, remaining: Math.max(0, waiting.length - rows.length), shapes, costPaise, agreed, differed });
}
