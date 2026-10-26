// Tressform — the "Hairstyles of the World" gallery pictures (26.10.2026).
//
// Made by the owner in /admin/studio ("World hairstyles – make pictures"),
// never during a build or by a visitor. Two kinds:
//   model   the plain "before" photo of one region's model, per gender
//           (key "<region>-<gender>"); its full-size copy is what each
//           style's picture is made from
//   style   a style's front picture on that model (key = the style's slug)
// The gallery shows small copies: about 640 px wide, WebP, with a small
// white "tressform.co.in" mark in the top-right corner (made in the
// owner's browser before saving). They live in the public "world" storage
// bucket; which ones exist is kept in the private world_pictures table.
// Customers' own paid pictures are separate and stay full size.
//
// Server-only.

import { SUPABASE_MOCK_MODE } from "./serverAuth";
import { mockStore } from "./mockStore";

export type WorldPictureKind = "model" | "style";

export interface WorldPictureRow {
  kind: WorldPictureKind;
  key: string;
  full_path: string | null;
  small_path: string | null;
  cost_paise: number;
}

export const WORLD_BUCKET = "world";

/** The public address of a file in the world bucket. */
export function worldPublicUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
  return `${base}/storage/v1/object/public/${WORLD_BUCKET}/${path}`;
}

/** Every world picture made so far. */
export async function worldPictureRows(): Promise<WorldPictureRow[]> {
  if (SUPABASE_MOCK_MODE) return [...mockStore.worldPictures.values()];
  const { getSupabaseAdmin } = await import("./supabaseClient");
  const { data, error } = await getSupabaseAdmin().from("world_pictures").select("kind, key, full_path, small_path, cost_paise");
  if (error) {
    // Before the database step is run there are simply no pictures yet.
    console.error("[Tressform] world pictures:", error.message);
    return [];
  }
  return (data ?? []) as WorldPictureRow[];
}

/** For the gallery: the small picture of each style and each model, by "<kind>:<key>". */
export async function worldGalleryPictures(): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const row of await worldPictureRows()) {
    if (!row.small_path) continue;
    out[`${row.kind}:${row.key}`] = row.small_path.startsWith("data:") ? row.small_path : worldPublicUrl(row.small_path);
  }
  return out;
}
