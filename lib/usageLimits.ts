// Tressform — daily limits on AI use per account (20.10.2026, owner's request
// before the first Facebook ads: "make sure no customer can abuse the AI
// usage because of any glitch").
//
// What each limit guards:
//   PHOTO_READS     /api/analyze — every photo is read by AWS Rekognition and
//                   a vision model (about ₹0.20 a photo).
//   BACKGROUNDS     /api/photo/background — fal.ai's background remover.
//   FAILED_PICTURES /api/generate — a hairstyle picture that fails the
//                   true-to-you check is NOT counted against the customer's
//                   pack, but fal.ai still charged for it (about ₹3.50 a try,
//                   two tries each). Without a limit one account could keep
//                   retrying at the owner's cost.
// Counted over the last 24 hours, per account. The site owner's own account
// (profiles.role = 'ADMIN') has no limits, for testing.
//
// Photo reads and background removals are logged in job_runs (job
// "usage:photo_read" / "usage:background", summary { user }); failed
// pictures are already rows in style_results. /api/cron/watch deletes usage
// rows older than three days.
//
// Server-only.

export const DAILY_LIMITS = {
  photo_read: 10,
  background: 10,
  failed_pictures: 4,
} as const;

export type LoggedUsage = "photo_read" | "background";

// 23.10.2026: visitors who haven't signed in yet (anonymous accounts, see
// lib/serverAuth.ts) can make a new account just by clearing their browser,
// so their limits count per network address (hashed) instead of per account,
// and there is a ceiling on all anonymous photo reads in a day. Signing in
// lifts them back to DAILY_LIMITS.
export const ANON_LIMITS = {
  photo_read: 3,
  background: 3,
} as const;
export const ANON_DAILY_TOTAL = 300;

export const ANON_MESSAGES = {
  perVisitor:
    "You've tried a few photos already today. Please log in or create your account to add more — it takes a few seconds.",
  total: "Lots of people are trying Tressform right now. Please log in or create your account to continue.",
};

export type Visitor = { anonymous?: boolean; ip?: string };

const DAY_MS = 24 * 60 * 60 * 1000;

export const LIMIT_MESSAGES: Record<keyof typeof DAILY_LIMITS, string> = {
  photo_read: `You've added ${DAILY_LIMITS.photo_read} photos today, the most for one day. Please come back tomorrow, or use one of the photos you've already added.`,
  background: `You've removed the background ${DAILY_LIMITS.background} times today, the most for one day. Please use your photo as it is, or try again tomorrow.`,
  failed_pictures:
    "We couldn't make true-to-you pictures from this photo several times today. Please try again tomorrow with a clear, front-facing photo in good light.",
};

/** Whether a count has reached its limit. */
export function overLimit(kind: keyof typeof DAILY_LIMITS, used: number): boolean {
  return used >= DAILY_LIMITS[kind];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

/** The site owner's own account is never limited. */
export async function isOwnerAccount(admin: Admin, userId: string): Promise<boolean> {
  const { data } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
  return data?.role === "ADMIN";
}

/** How many times this account used `kind` in the last 24 hours. On a read error, 0 (never block a customer by mistake). */
export async function usedToday(admin: Admin, kind: LoggedUsage, userId: string): Promise<number> {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count, error } = await admin
    .from("job_runs")
    .select("id", { count: "exact", head: true })
    .eq("job", `usage:${kind}`)
    .eq("summary->>user", userId)
    .gte("ran_at", since);
  if (error) {
    console.error(`[Tressform] usage count failed (${kind}):`, error.message);
    return 0;
  }
  return count ?? 0;
}

/** Note one use of `kind` by this account. */
export async function logUsage(admin: Admin, kind: LoggedUsage, userId: string): Promise<void> {
  const { error } = await admin.from("job_runs").insert({ job: `usage:${kind}`, summary: { user: userId } });
  if (error) console.error(`[Tressform] usage log failed (${kind}):`, error.message);
}

/**
 * Check and log in one go: returns null when the account may go ahead (and
 * the use is logged), or the message to show when it has hit the limit.
 */
export async function takeDailyUse(admin: Admin, kind: LoggedUsage, userId: string, visitor: Visitor = {}): Promise<string | null> {
  if (visitor.anonymous) {
    const ip = visitor.ip || "unknown";
    if ((await anonUsedToday(admin, kind, { ip })) >= ANON_LIMITS[kind]) return ANON_MESSAGES.perVisitor;
    if (kind === "photo_read" && (await anonUsedToday(admin, kind, {})) >= ANON_DAILY_TOTAL) {
      await alertAnonCeiling(admin);
      return ANON_MESSAGES.total;
    }
    const { error } = await admin.from("job_runs").insert({ job: `usage:${kind}`, summary: { user: userId, ip, anon: true } });
    if (error) console.error(`[Tressform] usage log failed (${kind}):`, error.message);
    return null;
  }
  if (await isOwnerAccount(admin, userId)) return null;
  if (overLimit(kind, await usedToday(admin, kind, userId))) return LIMIT_MESSAGES[kind];
  await logUsage(admin, kind, userId);
  return null;
}

/** Anonymous uses of `kind` in the last 24 hours: from one network address, or from everyone when `ip` is left out. On a read error, 0. */
export async function anonUsedToday(admin: Admin, kind: LoggedUsage, where: { ip?: string }): Promise<number> {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  let q = admin
    .from("job_runs")
    .select("id", { count: "exact", head: true })
    .eq("job", `usage:${kind}`)
    .eq("summary->>anon", "true")
    .gte("ran_at", since);
  if (where.ip) q = q.eq("summary->>ip", where.ip);
  const { count, error } = await q;
  if (error) {
    console.error(`[Tressform] anonymous usage count failed (${kind}):`, error.message);
    return 0;
  }
  return count ?? 0;
}

/** Tell the owner, at most once in 12 hours, that the anonymous ceiling was reached. Best-effort. */
async function alertAnonCeiling(admin: Admin): Promise<void> {
  try {
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { count } = await admin
      .from("job_runs")
      .select("id", { count: "exact", head: true })
      .eq("job", "anon_ceiling_alert")
      .gte("ran_at", since);
    if ((count ?? 0) > 0) return;
    await admin.from("job_runs").insert({ job: "anon_ceiling_alert", summary: { total: ANON_DAILY_TOTAL } });
    const { sendOwnerAlert } = await import("./ownerAlerts");
    await sendOwnerAlert(
      "Tressform: many photo uploads before sign-in",
      `${ANON_DAILY_TOTAL} photos were uploaded today by visitors who hadn't signed in yet. New visitors are now asked to sign in before uploading, until the count drops. If this wasn't the ads, someone may be misusing the site.`
    );
  } catch (err) {
    console.error("[Tressform] anonymous ceiling alert failed:", (err as Error)?.message ?? err);
  }
}

/** Hairstyle pictures for this account that failed the check in the last 24 hours. */
export async function failedPicturesToday(admin: Admin, userId: string): Promise<number> {
  const since = new Date(Date.now() - DAY_MS).toISOString();
  const { count, error } = await admin
    .from("style_results")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "FAILED")
    .gte("created_at", since);
  if (error) {
    console.error("[Tressform] failed-picture count failed:", error.message);
    return 0;
  }
  return count ?? 0;
}
