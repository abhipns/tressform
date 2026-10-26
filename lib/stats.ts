// The owner's dashboard (13.10.2026): periods and the funnel steps.

export type Period = "today" | "7" | "30" | "all";

export const PERIODS: { id: Period; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "all", label: "All time" },
];

const IST_OFFSET_MS = 330 * 60 * 1000;

/** When a period starts, as an ISO time. "Today" starts at midnight in India. */
export function periodStart(period: Period, now: Date): string {
  if (period === "all") return "2000-01-01T00:00:00.000Z";
  if (period === "today") {
    const ist = new Date(now.getTime() + IST_OFFSET_MS);
    const midnightIst = Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST_OFFSET_MS;
    return new Date(midnightIst).toISOString();
  }
  return new Date(now.getTime() - Number(period) * 86400_000).toISOString();
}

/** One step's share of the step before it, as a whole percentage; null when there is nothing to compare. */
export function stepRate(count: number, previous: number): number | null {
  if (!previous) return null;
  return Math.round((count / previous) * 100);
}

/**
 * 26.10.2026: the bold Total row under "By ad campaign", so the owner sees
 * all ads together. Bought % is total sales ÷ total people (not an average
 * of each row's %), to 1 decimal; null when there were no people.
 */
export function campaignTotals(rows: { visitors: number; purchases: number; revenuePaise: number }[]): {
  visitors: number;
  purchases: number;
  revenuePaise: number;
  boughtPct: string | null;
} {
  const visitors = rows.reduce((n, r) => n + r.visitors, 0);
  const purchases = rows.reduce((n, r) => n + r.purchases, 0);
  const revenuePaise = rows.reduce((n, r) => n + r.revenuePaise, 0);
  return { visitors, purchases, revenuePaise, boughtPct: visitors ? ((purchases / visitors) * 100).toFixed(1) : null };
}

/** Search-engine robots and link previews, which never count as visitors (13.10.2026; shared 26.10.2026). */
const ROBOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|headless|lighthouse|pingdom|monitor/i;

export function looksLikeRobot(userAgent: string | null | undefined): boolean {
  return !userAgent || ROBOT.test(userAgent);
}

/**
 * 26.10.2026: "Top sharers" on the dashboard — visitors each referral link
 * brought and the link credit it earned, most visitors first.
 */
export function topSharers(
  visits: { code: string }[],
  rewards: { code: string; credits_paise: number }[],
  max = 20
): { code: string; visitors: number; creditPaise: number }[] {
  const by = new Map<string, { code: string; visitors: number; creditPaise: number }>();
  const row = (code: string) => by.get(code) ?? by.set(code, { code, visitors: 0, creditPaise: 0 }).get(code)!;
  for (const v of visits) row(v.code).visitors += 1;
  for (const r of rewards) row(r.code).creditPaise += r.credits_paise ?? 0;
  return [...by.values()].sort((a, b) => b.visitors - a.visitors || b.creditPaise - a.creditPaise).slice(0, max);
}

/** "₹1,234" from paise. */
export function rupees(paise: number): string {
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN");
}

/** "2026-10" → the first day of that month, or null if it isn't a month. */
export function monthStart(value: string): string | null {
  const m = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return `${m[1]}-${m[2]}-01`;
}

// 14.10.2026 (owner): "AI cost still to come". Customers have paid for
// pictures that haven't been made yet, and that AI cost can arrive any
// time: a look whose sides and back were never opened (3 pictures each,
// made when the customer taps "See the sides and back"), and a paid look
// not made at all yet (up to 4: the front, then the 3 others).
export const PICTURES_PER_UNOPENED_LOOK = 3;
export const PICTURES_PER_UNMADE_LOOK = 4;

export interface CommittedCost {
  unopenedLooks: number;
  unmadeLooks: number;
  paise: number;
}

/** The AI cost already paid for by customers but not yet spent, at `perPicturePaise` a picture. */
export function committedCost(unopenedLooks: number, unmadeLooks: number, perPicturePaise: number): CommittedCost {
  const a = Math.max(0, Math.floor(unopenedLooks));
  const b = Math.max(0, Math.floor(unmadeLooks));
  return {
    unopenedLooks: a,
    unmadeLooks: b,
    paise: (a * PICTURES_PER_UNOPENED_LOOK + b * PICTURES_PER_UNMADE_LOOK) * perPicturePaise,
  };
}

// 14.10.2026 (owner): one "Final summary" on the dashboard — what is left
// after every cost the business already knows about, including AI cost
// still to come, GST to pay and a tentative income tax. Other bills
// (hosting, domain…) are not in it.
//
// Income tax depends on the owner's TOTAL income from all sources, which
// the site can't know, so the rate is the owner's own setting (a
// percentage typed on the dashboard), applied to the profit after GST.

export interface SummaryInput {
  salesPaise: number;
  affiliatePaise: number;
  feesPaise: number;
  aiCostPaise: number;
  committedPaise: number;
  gstPaise: number;
  taxRatePct: number;
}

export interface SummaryOutput {
  profitBeforeTaxPaise: number;
  incomeTaxPaise: number;
  takeHomePaise: number;
}

export function finalSummary(i: SummaryInput): SummaryOutput {
  const rate = Math.min(100, Math.max(0, Number.isFinite(i.taxRatePct) ? i.taxRatePct : 0));
  const profitBeforeTaxPaise =
    i.salesPaise + i.affiliatePaise - i.feesPaise - i.aiCostPaise - i.committedPaise - i.gstPaise;
  const incomeTaxPaise = profitBeforeTaxPaise > 0 ? Math.round((profitBeforeTaxPaise * rate) / 100) : 0;
  return { profitBeforeTaxPaise, incomeTaxPaise, takeHomePaise: profitBeforeTaxPaise - incomeTaxPaise };
}

// 14.10.2026: the visit counter's limits (app/api/visit/route.ts), so one
// visitor — or someone calling the counter in a loop — can't inflate the
// dashboard. No IP address is kept (the privacy page promises nothing
// personal), so the limits are per visitor id: the same page counts once
// per half hour, and a visitor counts at most 60 pages a day.
export const VISIT_SAME_PAGE_MINUTES = 30;
export const VISITS_PER_VISITOR_PER_DAY = 60;

/** Whether a visit should be counted, given this visitor's visits in the last 24 hours (newest first is fine). */
export function shouldCountVisit(path: string, recent: { path: string; created_at: string }[], now: Date): boolean {
  if (recent.length >= VISITS_PER_VISITOR_PER_DAY) return false;
  const since = now.getTime() - VISIT_SAME_PAGE_MINUTES * 60_000;
  return !recent.some((v) => v.path === path && new Date(v.created_at).getTime() > since);
}
