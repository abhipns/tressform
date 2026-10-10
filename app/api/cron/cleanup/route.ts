// /api/cron/cleanup — the daily "delete after 90 days" job.
//
// 10.10.2026: built to keep the promise the Privacy Policy, the Trust
// section, the FAQ and /about all make: uploaded photos and free previews
// are deleted automatically 90 days after upload, unless the account is
// still in use.
//
// THE RULE (the database decides — see the two functions at the end of
// db/schema.sql): a customer's photos and free previews go once the file is
// more than 90 days old AND the account hasn't been used for 90 days (no
// login or returning visit, no upload, no new preview, no purchase).
// Results a customer paid for are never touched.
//
// WHAT A RUN DOES
//   1. asks the database which stored files are due        (expired_storage_objects)
//   2. deletes those files through Supabase Storage
//   3. deletes the matching database records, including the
//      face measurements                                     (purge_expired_photo_records)
// Step 3 only removes records whose file is already gone, so if step 2
// fails for a file, its record stays and the next run tries again.
//
// WHO CAN RUN IT. Vercel calls this address once a day (see "crons" in
// vercel.json) and sends the CRON_SECRET environment variable as a
// password. Without the right password the answer is 401; if CRON_SECRET
// isn't set at all, the job refuses to run rather than run unprotected.
//
// Adding ?dryRun=1 lists how many files are due without deleting anything.
// The 90 days is fixed here — nothing in the request can shorten it, and
// the database functions refuse anything under 30 days regardless.

import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { SUPABASE_MOCK_MODE, getSupabaseAdmin } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const RETENTION_DAYS = 90;
const MAX_FILES_PER_RUN = 500; // anything beyond this waits for tomorrow's run
const REMOVE_BATCH = 100;

function passwordMatches(req: NextRequest, secret: string): boolean {
  const given = Buffer.from(req.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: NextRequest) {
  if (SUPABASE_MOCK_MODE) {
    return NextResponse.json({ ok: true, skipped: "No database connected (mock mode) — nothing to clean up." });
  }

  const secret = process.env.CRON_SECRET;
  if (!secret || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("[Tressform] Clean-up did not run: CRON_SECRET or SUPABASE_SERVICE_ROLE_KEY is not set in Vercel.");
    return NextResponse.json({ ok: false, error: "Clean-up isn't set up." }, { status: 503 });
  }
  if (!passwordMatches(req, secret)) {
    return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 401 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "1";
  const admin = getSupabaseAdmin();

  const { data: due, error: listError } = await admin.rpc("expired_storage_objects", {
    max_age_days: RETENTION_DAYS,
    max_rows: MAX_FILES_PER_RUN,
  });
  if (listError) {
    console.error("[Tressform] Clean-up could not list expired files:", listError.message);
    return NextResponse.json({ ok: false, error: "Could not list expired files." }, { status: 500 });
  }

  const byBucket = new Map<string, string[]>();
  for (const row of (due ?? []) as { bucket_id: string; name: string }[]) {
    // Belt and braces: this job only ever touches the two customer buckets.
    if (row.bucket_id !== "photos" && row.bucket_id !== "results") continue;
    byBucket.set(row.bucket_id, [...(byBucket.get(row.bucket_id) ?? []), row.name]);
  }
  const filesDue = [...byBucket.values()].reduce((n, names) => n + names.length, 0);

  if (dryRun) {
    return NextResponse.json({ ok: true, dryRun: true, retentionDays: RETENTION_DAYS, filesDue });
  }

  let filesDeleted = 0;
  let fileErrors = 0;
  for (const [bucket, names] of byBucket) {
    for (let i = 0; i < names.length; i += REMOVE_BATCH) {
      const batch = names.slice(i, i + REMOVE_BATCH);
      const { data: removed, error } = await admin.storage.from(bucket).remove(batch);
      if (error) {
        fileErrors += batch.length;
        console.error(`[Tressform] Clean-up could not delete ${batch.length} file(s) from "${bucket}":`, error.message);
      } else {
        filesDeleted += removed?.length ?? 0;
      }
    }
  }

  const { data: recordsDeleted, error: purgeError } = await admin.rpc("purge_expired_photo_records", {
    max_age_days: RETENTION_DAYS,
  });
  if (purgeError) {
    console.error("[Tressform] Clean-up could not delete expired records:", purgeError.message);
  }

  const summary = {
    ok: fileErrors === 0 && !purgeError,
    retentionDays: RETENTION_DAYS,
    filesDue,
    filesDeleted,
    fileErrors,
    recordsDeleted: purgeError ? null : (recordsDeleted ?? 0),
    moreWaiting: filesDue >= MAX_FILES_PER_RUN,
  };
  console.log("[Tressform] Clean-up run:", JSON.stringify(summary));
  return NextResponse.json(summary, { status: summary.ok ? 200 : 500 });
}
