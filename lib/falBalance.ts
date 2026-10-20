// Tressform — watching the fal.ai balance (20.10.2026, owner's request).
//
// What happened: on 14.10.2026 the fal.ai prepaid balance ran out. fal.ai
// then refused every hairstyle picture, and nobody noticed for six days. A
// paying customer's looks all failed.
//
// Now the balance is checked:
//   - after a hairstyle picture is made, at most once every CHECK_EVERY_MINUTES;
//   - once a day by /api/cron/watch;
//   - straight away when fal.ai refuses a picture because of the account
//     (HTTP 401/403: locked, out of credit, or a bad key).
// Below LOW_BALANCE_USD the owner gets an email and a WhatsApp message
// (lib/ownerAlerts.ts), repeated at most once every REPEAT_ALERT_HOURS while
// it stays low. Every check and alert leaves a row in job_runs, which is
// also how the "at most once every …" rules are kept across servers.
//
// Settings (Vercel → Settings → Environment Variables):
//   FAL_BILLING_KEY   a fal.ai key that may read billing (fal.ai → Settings →
//                     API keys → create a key with the "READONLY" or
//                     "BILLING" preset). Without it the regular FAL_AI_API_KEY
//                     is tried, which works only if it has billing access.
//
// fal.ai's billing API: GET https://api.fal.ai/v1/account/billing?expand=credits
// answers { credits: { current_balance, currency } }.
//
// Server-only.

import { sendOwnerAlert } from "./ownerAlerts";

export const LOW_BALANCE_USD = 10;
const CHECK_EVERY_MINUTES = 10;
const REPEAT_ALERT_HOURS = 12;
const REFUSED_ALERT_HOURS = 1;
const BILLING_URL = "https://api.fal.ai/v1/account/billing?expand=credits";
const BILLING_PAGE = "https://fal.ai/dashboard/usage-billing/billing";

export type BalanceReading =
  | { ok: true; balance: number; currency: string }
  | { ok: false; reason: string };

/** Ask fal.ai for the account balance. Never throws. */
export async function readFalBalance(): Promise<BalanceReading> {
  const key = (process.env.FAL_BILLING_KEY || process.env.FAL_AI_API_KEY || "").trim();
  if (!key) return { ok: false, reason: "no fal.ai key set" };
  try {
    const res = await fetch(BILLING_URL, {
      headers: { Authorization: `Key ${key}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return {
        ok: false,
        reason:
          res.status === 401 || res.status === 403
            ? `fal.ai would not show the balance (HTTP ${res.status}) — FAL_BILLING_KEY needs billing access`
            : `fal.ai billing answered HTTP ${res.status}`,
      };
    }
    const data = (await res.json()) as { credits?: { current_balance?: unknown; currency?: unknown } };
    const balance = Number(data.credits?.current_balance);
    if (!Number.isFinite(balance)) return { ok: false, reason: "fal.ai's answer had no balance in it" };
    return { ok: true, balance, currency: typeof data.credits?.currency === "string" ? data.credits.currency : "USD" };
  } catch (err) {
    return { ok: false, reason: `could not reach fal.ai billing: ${(err as Error)?.message ?? err}` };
  }
}

/** Whether a balance is low enough to warn about. */
export function isLowBalance(balance: number, threshold: number = LOW_BALANCE_USD): boolean {
  return balance < threshold;
}

export function lowBalanceMessage(balance: number, currency: string): { subject: string; text: string } {
  const amount = `${currency === "USD" ? "$" : `${currency} `}${balance.toFixed(2)}`;
  return {
    subject: balance <= 0 ? `fal.ai balance is ${amount} — hairstyle pictures are stopped` : `fal.ai balance is low: ${amount}`,
    text:
      (balance <= 0
        ? "fal.ai has no credit left, so customers' hairstyle pictures are failing right now."
        : `Your fal.ai balance is below $${LOW_BALANCE_USD}. When it reaches zero, customers' hairstyle pictures stop.`) +
      `\n\nTop up here: ${BILLING_PAGE}`,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any;

async function happenedWithin(admin: Admin, job: string, minutes: number): Promise<boolean> {
  const since = new Date(Date.now() - minutes * 60_000).toISOString();
  const { data, error } = await admin.from("job_runs").select("id").eq("job", job).gte("ran_at", since).limit(1);
  if (error) {
    console.error(`[Tressform] job_runs read failed (${job}):`, error.message);
    return false;
  }
  return Boolean(data && data.length > 0);
}

async function record(admin: Admin, job: string, summary: Record<string, unknown>) {
  const { error } = await admin.from("job_runs").insert({ job, summary });
  if (error) console.error(`[Tressform] job_runs insert failed (${job}):`, error.message);
}

/**
 * Check the balance and warn the owner if it is low. `force` skips the
 * "at most once every 10 minutes" rule (the daily job uses it). Never throws.
 */
export async function watchFalBalance(admin: Admin, opts: { force?: boolean; reason: string }): Promise<BalanceReading | null> {
  try {
    if (!opts.force && (await happenedWithin(admin, "fal_balance_check", CHECK_EVERY_MINUTES))) return null;
    const reading = await readFalBalance();
    await record(admin, "fal_balance_check", { reason: opts.reason, ...reading });
    if (!reading.ok) {
      console.error(`[Tressform] fal.ai balance check failed: ${reading.reason}`);
      return reading;
    }
    if (isLowBalance(reading.balance) && !(await happenedWithin(admin, "fal_balance_alert", REPEAT_ALERT_HOURS * 60))) {
      const msg = lowBalanceMessage(reading.balance, reading.currency);
      const sent = await sendOwnerAlert(msg.subject, msg.text);
      await record(admin, "fal_balance_alert", { balance: reading.balance, ...sent });
    }
    return reading;
  } catch (err) {
    console.error("[Tressform] fal.ai balance watch failed:", (err as Error)?.message ?? err);
    return null;
  }
}

/**
 * fal.ai refused a picture because of the account (HTTP 401/403). Tell the
 * owner at once (at most once an hour), with the balance if it can be read.
 * Never throws.
 */
export async function alertFalRefused(admin: Admin, httpStatus: number): Promise<void> {
  try {
    if (await happenedWithin(admin, "fal_refused_alert", REFUSED_ALERT_HOURS * 60)) return;
    const reading = await readFalBalance();
    const balanceLine = reading.ok ? `Balance now: $${reading.balance.toFixed(2)}.` : `Balance couldn't be read (${reading.reason}).`;
    const sent = await sendOwnerAlert(
      "fal.ai is refusing hairstyle pictures",
      `fal.ai turned down a customer's hairstyle picture (HTTP ${httpStatus}). This usually means the balance has run out, ` +
        `or the API key was changed or switched off. ${balanceLine}\n\nCheck here: ${BILLING_PAGE}`
    );
    await record(admin, "fal_refused_alert", { httpStatus, ...(reading.ok ? { balance: reading.balance } : {}), ...sent });
  } catch (err) {
    console.error("[Tressform] fal.ai refused-alert failed:", (err as Error)?.message ?? err);
  }
}
