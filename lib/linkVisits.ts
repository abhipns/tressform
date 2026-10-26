// Tressform — credit for the visitors a customer's link brings
// (26.10.2026, owner's request). The amounts are in lib/pricing.ts.
//
// When someone opens tressform.co.in/?ref=<code>, the page
// (components/ReferralBeacon.tsx) tells /api/referral/visit, with the
// visitor's anonymous id (the same one the visit counter uses, kept on their
// device). The visit counts toward that code only if:
//   - the page's own code ran (no JavaScript, as with most robots = never
//     sent), and the browser doesn't call itself a robot;
//   - the code belongs to an account that has paid at least once;
//   - it isn't the customer themselves: not signed in as the code's owner,
//     and not a device the owner has used (their visitor id is noted each
//     time they open their referral area — referral_sharer_devices);
//   - this visitor hasn't been counted for this code before (each visitor
//     once per code: referral_link_visits is unique on code + visitor);
//   - fewer than 100 new visitors have been counted for this code today
//     (India time).
// When the count passes 10, 20, 30…, ₹10 of credit is added, and the
// milestone is recorded (referral_link_rewards, unique on code + milestone)
// so it is never paid twice. It counts toward the ₹15,000-a-year cap.
//
// recordLinkVisit() holds the rules; the database and the demo each supply
// a LinkVisitStore. Server-only.

import type { SupabaseClient } from "@supabase/supabase-js";
import { LINK_NEW_VISITORS_PER_DAY, LINK_REWARD_PAISE, LINK_VISITORS_PER_REWARD, linkRewardsDue } from "./pricing";
import { financialYearStart } from "./referral";
import type { mockStore as MockStore } from "./mockStore";

export const VISITOR_PATTERN = /^[A-Za-z0-9-]{8,64}$/;

export interface LinkVisitStore {
  /** The account a code belongs to, and whether it has ever paid. */
  referrerOf(code: string): Promise<{ userId: string; hasPaid: boolean } | null>;
  /** Whether the code's owner has used this device (their own visitor id). */
  isSharerDevice(userId: string, visitor: string): Promise<boolean>;
  newVisitorsSince(code: string, sinceIso: string): Promise<number>;
  /** Count this visitor for this code; false if they were counted before. */
  addVisitor(code: string, visitor: string, referrerId: string): Promise<boolean>;
  visitorCount(code: string): Promise<number>;
  paidMilestones(code: string): Promise<number[]>;
  /** Credit earned this financial year from pack referrals and links. */
  creditsSince(userId: string, sinceIso: string): Promise<number>;
  /** Record a milestone; false if it was already recorded (paid). */
  recordReward(code: string, userId: string, milestone: number, visitors: number, paise: number): Promise<boolean>;
  addCredit(userId: string, paise: number): Promise<void>;
}

export type LinkVisitResult =
  | { counted: false; reason: "bad_input" | "unknown_code" | "not_paid_yet" | "own_visit" | "seen_before" | "daily_limit" }
  | { counted: true; visitors: number; creditedPaise: number };

/** Midnight in India, today, as a UTC instant (for the 100-a-day limit). */
export function indiaDayStart(now: Date): Date {
  const IST = 330 * 60 * 1000;
  const ist = new Date(now.getTime() + IST);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - IST);
}

export async function recordLinkVisit(
  store: LinkVisitStore,
  input: { code: string | null; visitor: string | null; signedInUserId: string | null },
  now: Date = new Date()
): Promise<LinkVisitResult> {
  const { code, visitor } = input;
  if (!code || !visitor || !VISITOR_PATTERN.test(visitor)) return { counted: false, reason: "bad_input" };
  const owner = await store.referrerOf(code);
  if (!owner) return { counted: false, reason: "unknown_code" };
  if (input.signedInUserId === owner.userId || (await store.isSharerDevice(owner.userId, visitor))) {
    return { counted: false, reason: "own_visit" };
  }
  if (!owner.hasPaid) return { counted: false, reason: "not_paid_yet" };
  if ((await store.newVisitorsSince(code, indiaDayStart(now).toISOString())) >= LINK_NEW_VISITORS_PER_DAY) {
    return { counted: false, reason: "daily_limit" };
  }
  if (!(await store.addVisitor(code, visitor, owner.userId))) return { counted: false, reason: "seen_before" };

  const visitors = await store.visitorCount(code);
  let creditedPaise = 0;
  if (visitors >= LINK_VISITORS_PER_REWARD) {
    const [paid, earned] = await Promise.all([
      store.paidMilestones(code),
      store.creditsSince(owner.userId, financialYearStart(now).toISOString()),
    ]);
    for (const due of linkRewardsDue(visitors, paid, earned)) {
      // Recorded first: only the call that records the milestone pays it.
      if (!(await store.recordReward(code, owner.userId, due.milestone, visitors, due.paise))) continue;
      if (due.paise > 0) {
        await store.addCredit(owner.userId, due.paise);
        creditedPaise += due.paise;
      }
    }
  }
  return { counted: true, visitors, creditedPaise };
}

/** "7 of 10 visitors — ₹10 credit when you reach 10. Earned so far: ₹30" */
export function linkProgressLine(visitors: number, earnedPaise: number): string {
  const step = LINK_VISITORS_PER_REWARD;
  const into = Math.max(0, visitors) % step;
  const next = Math.max(0, visitors) - into + step;
  const reward = `₹${Math.round(LINK_REWARD_PAISE / 100)}`;
  return `${into} of ${step} visitors — ${reward} credit when you reach ${next}. Earned so far: ₹${Math.round(earnedPaise / 100).toLocaleString("en-IN")}`;
}

// ------------------------------------------------------------ the database
type Admin = SupabaseClient;

export function databaseLinkStore(db: Admin): LinkVisitStore {
  return {
    async referrerOf(code) {
      const { data: profile } = await db.from("profiles").select("id").eq("referral_code", code).maybeSingle();
      if (!profile) return null;
      const { data: paid } = await db.from("orders").select("id").eq("user_id", profile.id).eq("status", "PAID").limit(1);
      return { userId: profile.id as string, hasPaid: Boolean(paid && paid.length > 0) };
    },
    async isSharerDevice(userId, visitor) {
      const { data } = await db.from("referral_sharer_devices").select("user_id").eq("user_id", userId).eq("visitor", visitor).limit(1);
      return Boolean(data && data.length > 0);
    },
    async newVisitorsSince(code, sinceIso) {
      const { count } = await db.from("referral_link_visits").select("visitor", { count: "exact", head: true }).eq("code", code).gte("first_seen", sinceIso);
      return count ?? 0;
    },
    async addVisitor(code, visitor, referrerId) {
      const { data, error } = await db
        .from("referral_link_visits")
        .upsert({ code, visitor, referrer_id: referrerId }, { onConflict: "code,visitor", ignoreDuplicates: true })
        .select("visitor");
      if (error) throw new Error(`referral_link_visits: ${error.message}`);
      return Boolean(data && data.length > 0);
    },
    async visitorCount(code) {
      const { count } = await db.from("referral_link_visits").select("visitor", { count: "exact", head: true }).eq("code", code);
      return count ?? 0;
    },
    async paidMilestones(code) {
      const { data } = await db.from("referral_link_rewards").select("milestone").eq("code", code);
      return (data ?? []).map((r: { milestone: number }) => r.milestone);
    },
    async creditsSince(userId, sinceIso) {
      const [{ data: packs }, { data: links }] = await Promise.all([
        db.from("referrals").select("credits_paise").eq("referrer_id", userId).gte("paid_at", sinceIso),
        db.from("referral_link_rewards").select("credits_paise").eq("referrer_id", userId).gte("created_at", sinceIso),
      ]);
      const sum = (rows: { credits_paise: number | null }[] | null) => (rows ?? []).reduce((s, r) => s + (r.credits_paise ?? 0), 0);
      return sum(packs) + sum(links);
    },
    async recordReward(code, userId, milestone, visitors, paise) {
      const { data } = await db
        .from("referral_link_rewards")
        .upsert(
          { code, referrer_id: userId, milestone, visitors, credits_paise: paise },
          { onConflict: "code,milestone", ignoreDuplicates: true }
        )
        .select("milestone");
      return Boolean(data && data.length > 0);
    },
    async addCredit(userId, paise) {
      const { error } = await db.rpc("increment_credit_balance", { profile_id: userId, amount_paise: paise });
      if (error) console.error(`[Tressform] link credit for ${userId} not added:`, error.message);
    },
  };
}

/** Link credit earned this financial year, for the pack referral cap in lib/payments.ts. */
export async function linkCreditsSince(db: Admin, userId: string, sinceIso: string): Promise<number> {
  const { data } = await db.from("referral_link_rewards").select("credits_paise").eq("referrer_id", userId).gte("created_at", sinceIso);
  return (data ?? []).reduce((s: number, r: { credits_paise: number | null }) => s + (r.credits_paise ?? 0), 0);
}

// ------------------------------------------------------------- the demo
export function mockLinkStore(store: typeof MockStore): LinkVisitStore {
  return {
    async referrerOf(code) {
      const profile = [...store.profiles.values()].find((p) => p.referralCode === code);
      if (!profile) return null;
      return { userId: profile.id, hasPaid: [...store.orders.values()].some((o) => o.userId === profile.id && o.status === "PAID") };
    },
    async isSharerDevice(userId, visitor) {
      return store.sharerDevices.has(`${userId}:${visitor}`);
    },
    async newVisitorsSince(code, sinceIso) {
      return [...store.linkVisits.values()].filter((v) => v.code === code && v.firstSeen >= sinceIso).length;
    },
    async addVisitor(code, visitor, referrerId) {
      const key = `${code}:${visitor}`;
      if (store.linkVisits.has(key)) return false;
      store.linkVisits.set(key, { code, visitor, referrerId, firstSeen: new Date().toISOString() });
      return true;
    },
    async visitorCount(code) {
      return [...store.linkVisits.values()].filter((v) => v.code === code).length;
    },
    async paidMilestones(code) {
      return [...store.linkRewards.values()].filter((r) => r.code === code).map((r) => r.milestone);
    },
    async creditsSince(userId, sinceIso) {
      return store.sumReferrerCreditsThisFY(userId, new Date(sinceIso));
    },
    async recordReward(code, userId, milestone, visitors, paise) {
      const key = `${code}:${milestone}`;
      if (store.linkRewards.has(key)) return false;
      store.linkRewards.set(key, { code, referrerId: userId, milestone, visitors, creditsPaise: paise, createdAt: new Date().toISOString() });
      return true;
    },
    async addCredit(userId, paise) {
      store.getOrCreateProfile(userId).creditBalancePaise += paise;
    },
  };
}
