// Tressform — single pictures of one hairstyle (26.10.2026, owner's request).
//
// Next to the packs, a customer can buy one hairstyle on their own face
// picture by picture (prices and rules: lib/pricing.ts, priceForPictures).
// The order (orders.order_kind = 'PICTURES') records the hairstyle, the photo
// and the views bought. Once it is PAID, each view gets a row in
// picture_views (grant_picture_views in the database), which then says
// whether that picture has been made:
//
//   READY       paid, not made yet (or failed, and can be tried again free)
//   MAKING      being made right now
//   DONE        made; result_storage_path is the full-size picture
//   REFUND_DUE  failed 3 times — shown on /admin/orders for a refund
//   DUPLICATE   paid for twice — shown on /admin/orders for a refund
//   REFUNDED    the owner refunded that one picture (/admin/orders)
//
// The front is made by /api/generate, the sides and back by
// /api/generate/views, and only the views that were paid for.
//
// Server-only. The demo (no database) versions live on lib/mockStore.ts.

import type { SupabaseClient } from "@supabase/supabase-js";
import { PICTURE_VIEWS, type PictureView } from "./pricing";
import type { PictureViewRow } from "./database.types";

type Admin = SupabaseClient;

/** The views of this hairstyle on this photo the customer already has (paid single pictures, or a pack picture = all four). */
export async function ownedPictureViews(admin: Admin, userId: string, photoId: string, styleId: string, styleName: string): Promise<PictureView[]> {
  const [{ data: rows }, { data: made }] = await Promise.all([
    admin
      .from("picture_views")
      .select("view, status, orders!inner(status)")
      .eq("user_id", userId)
      .eq("photo_id", photoId)
      .eq("style_id", styleId)
      .not("status", "in", "(DUPLICATE,REFUNDED)")
      .eq("orders.status", "PAID"),
    admin
      .from("style_results")
      .select("order_id")
      .eq("user_id", userId)
      .eq("photo_id", photoId)
      .eq("style_name", styleName)
      .eq("status", "SUCCEEDED")
      .not("order_id", "is", null)
      .limit(5),
  ]);
  // A pack picture of this style already comes with all four views.
  const orderIds = [...new Set((made ?? []).map((r: { order_id: string }) => r.order_id))];
  if (orderIds.length > 0) {
    const { data: packs } = await admin.from("orders").select("id").in("id", orderIds).eq("order_kind", "PACK").eq("status", "PAID").limit(1);
    if (packs && packs.length > 0) return [...PICTURE_VIEWS];
  }
  return PICTURE_VIEWS.filter((v) => (rows ?? []).some((r: { view: string }) => r.view === v));
}

/** Once a single-picture order is paid: the rows for its views. Best-effort; logged if it fails. */
export async function grantPictureViews(admin: Admin, orderId: string): Promise<void> {
  const { error } = await admin.rpc("grant_picture_views", { p_order: orderId });
  if (error) console.error(`[Tressform] order ${orderId}: picture views not recorded.`, error.message);
}

/** Take one paid view to make it. The order id, or null (not paid for, already made, or being made). */
export async function reservePictureView(admin: Admin, userId: string, photoId: string, styleId: string, view: PictureView): Promise<string | null> {
  const { data, error } = await admin.rpc("reserve_picture_view", { p_user: userId, p_photo: photoId, p_style: styleId, p_view: view });
  if (error) {
    // Before the database step is run the function doesn't exist: no single pictures, packs carry on.
    console.error("[Tressform] reserve_picture_view:", error.message);
    return null;
  }
  return typeof data === "string" && data ? data : null;
}

/** The view was made (with its stored picture) or failed (free retry; the third failure marks it for refund). */
export async function finishPictureView(admin: Admin, orderId: string, view: PictureView, ok: boolean, path: string | null): Promise<void> {
  const { error } = await admin.rpc("finish_picture_view", { p_order: orderId, p_view: view, p_ok: ok, p_path: path });
  if (error) console.error(`[Tressform] order ${orderId}: ${view} picture not updated.`, error.message);
}

/** Every paid view of this hairstyle on this photo, for the result screen. */
export async function pictureViewRows(admin: Admin, userId: string, photoId: string, styleId: string): Promise<PictureViewRow[]> {
  const { data } = await admin
    .from("picture_views")
    .select("*, orders!inner(status)")
    .eq("user_id", userId)
    .eq("photo_id", photoId)
    .eq("style_id", styleId)
    .eq("orders.status", "PAID");
  return ((data ?? []) as (PictureViewRow & { orders?: unknown })[]).map(({ orders: _o, ...r }) => r as PictureViewRow);
}

/** What the customer sees for each view: made, being made, paid and still to make (or to try again), refund due, or not bought. */
export type PictureViewState = "done" | "waiting" | "ready" | "refund" | "locked";

export function viewState(rows: { view: string; status: string }[], view: PictureView): PictureViewState {
  const mine = rows.filter((r) => r.view === view && r.status !== "DUPLICATE");
  // A picture the owner refunded can be bought again.
  const live = mine.filter((r) => r.status !== "REFUNDED");
  if (live.some((r) => r.status === "DONE")) return "done";
  if (live.some((r) => r.status === "MAKING")) return "waiting";
  if (live.some((r) => r.status === "READY")) return "ready";
  if (live.some((r) => r.status === "REFUND_DUE")) return "refund";
  return "locked";
}
