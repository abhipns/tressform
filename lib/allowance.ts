// Tressform — how many previews a customer has, and taking one.
//
// 11.10.2026. A preview comes from one of two places:
//   free   a new account's first previews (profiles.free_previews_used /
//          free_previews_limit), while FREE_PREVIEWS_ON in lib/pricing.ts
//   paid   a pack the customer bought: each PAID order came with a number
//          of previews (orders.preview_count) and counts how many have been
//          made (orders.previews_used)
// Free ones are used first, so nobody spends a paid preview while a free
// one is waiting.
//
// With FREE_PREVIEWS_ON false (the live setting), customers have no free
// previews at all, whatever their profile says. The site owner's account
// (profiles.role = 'ADMIN') still has its free allowance, so the owner can
// run the customer journey for real without buying from himself.
//
// A preview is TAKEN before the picture is made and GIVEN BACK if the
// picture fails or is thrown away by the safety net; both are single
// database statements, so two requests at the same moment cannot both take
// the last one.
//
// Server only. The real-database functions take the service-role client;
// the demo (no database) versions live on lib/mockStore.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { FREE_PREVIEWS_ON } from "./pricing";
import { mockStore } from "./mockStore";

export type Reservation = { kind: "free" } | { kind: "paid"; orderId: string };

export interface PreviewsLeft {
  free: number;
  paid: number;
  total: number;
}

type Admin = SupabaseClient;

function freeLeft(used: number, limit: number, freeOn: boolean): number {
  return freeOn ? Math.max(0, limit - used) : 0;
}

// ------------------------------------------------------------ real database
export async function previewsLeft(admin: Admin, userId: string): Promise<PreviewsLeft> {
  const [{ data: profile }, { data: orders }] = await Promise.all([
    admin.from("profiles").select("role, free_previews_used, free_previews_limit").eq("id", userId).maybeSingle(),
    admin.from("orders").select("preview_count, previews_used").eq("user_id", userId).eq("status", "PAID"),
  ]);
  const free = profile
    ? freeLeft(profile.free_previews_used, profile.free_previews_limit, FREE_PREVIEWS_ON || profile.role === "ADMIN")
    : 0;
  const paid = (orders ?? []).reduce(
    (sum: number, o: { preview_count: number | null; previews_used: number | null }) =>
      sum + Math.max(0, (o.preview_count ?? 0) - (o.previews_used ?? 0)),
    0
  );
  return { free, paid, total: free + paid };
}

/** Take one preview: a free one if there is one, otherwise one from a pack. null = none left. */
export async function reservePreview(admin: Admin, userId: string): Promise<Reservation | null> {
  let freeAllowed = FREE_PREVIEWS_ON;
  if (!freeAllowed) {
    const { data: profile } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    freeAllowed = profile?.role === "ADMIN";
  }
  if (freeAllowed) {
    const { data: ok, error } = await admin.rpc("reserve_free_preview", { profile_id: userId });
    if (error) throw new Error(`reserve_free_preview: ${error.message}`);
    if (ok) return { kind: "free" };
  }
  const { data: orderId, error } = await admin.rpc("reserve_paid_preview", { p_user: userId });
  if (error) throw new Error(`reserve_paid_preview: ${error.message}`);
  return typeof orderId === "string" && orderId ? { kind: "paid", orderId } : null;
}

export async function releasePreview(admin: Admin, userId: string, reservation: Reservation): Promise<void> {
  const { error } =
    reservation.kind === "free"
      ? await admin.rpc("release_free_preview", { profile_id: userId })
      : await admin.rpc("release_paid_preview", { p_order: reservation.orderId });
  if (error) console.error("[Tressform] Could not give a preview back to", userId, reservation.kind, error.message);
}

// --------------------------------------------------------- demo (no database)
// `freeOn` is only passed by the tests, to check both settings of the switch.
export function mockPreviewsLeft(userId: string, freeOn: boolean = FREE_PREVIEWS_ON): PreviewsLeft {
  const profile = mockStore.getOrCreateProfile(userId);
  const free = freeLeft(profile.freePreviewsUsed, profile.freePreviewsLimit, freeOn);
  const paid = mockStore.paidPreviewsLeft(userId);
  return { free, paid, total: free + paid };
}

export function mockReservePreview(userId: string, freeOn: boolean = FREE_PREVIEWS_ON): Reservation | null {
  const profile = mockStore.getOrCreateProfile(userId);
  if (freeOn && profile.freePreviewsUsed < profile.freePreviewsLimit) {
    profile.freePreviewsUsed += 1;
    return { kind: "free" };
  }
  const orderId = mockStore.reservePaidPreview(userId);
  return orderId ? { kind: "paid", orderId } : null;
}

export function mockReleasePreview(userId: string, reservation: Reservation): void {
  if (reservation.kind === "free") {
    const profile = mockStore.getOrCreateProfile(userId);
    profile.freePreviewsUsed = Math.max(0, profile.freePreviewsUsed - 1);
  } else {
    mockStore.releasePaidPreview(reservation.orderId);
  }
}
