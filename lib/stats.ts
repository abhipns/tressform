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
