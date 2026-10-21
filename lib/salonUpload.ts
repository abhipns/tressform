// Tressform — putting a salon photo in storage, from the browser
// (21.10.2026, salon onboarding).
//
// The photo is made smaller first (longest side 1600 px, JPEG), so it
// uploads quickly on a salon's phone data, then goes into the owner's own
// folder of the public "salons" bucket: <owner id>/<random name>.jpg. The
// bucket's rules only let an owner upload into their own folder. The server
// checks the photos again when the salon is saved (/api/salons/mine).
// Client-only.

import { supabase } from "@/lib/supabaseClient";
import { salonPhotoUrl } from "@/lib/salons";

const MAX_SIDE = 1600;
const MAX_BYTES = 12 * 1024 * 1024; // a phone photo is well under this

/** Shrink a picked or camera photo to a JPEG the site can store. */
async function shrink(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.85)
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Upload one salon photo; returns its storage path and public link. Throws a message fit to show. */
export async function uploadSalonPhoto(file: File, userId: string): Promise<{ path: string; url: string }> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose a photo (JPG or PNG).");
  if (file.size > MAX_BYTES) throw new Error("That photo is too large. Please choose a smaller one.");
  let blob: Blob;
  try {
    blob = await shrink(file);
  } catch {
    throw new Error("We couldn't read that photo. Please try a different one.");
  }
  const name = `${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}.jpg`;
  const path = `${userId}/${name}`;
  const { error } = await supabase.storage.from("salons").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) throw new Error("The photo didn't upload. Please check your internet and try again.");
  return { path, url: salonPhotoUrl(path) };
}

/** Remove a photo the owner took out before saving. Best-effort. */
export async function removeSalonPhoto(path: string): Promise<void> {
  try {
    await supabase.storage.from("salons").remove([path]);
  } catch {
    /* left in storage; harmless */
  }
}

/** The random id this browser already keeps for visit counting (components/VisitBeacon.tsx). */
export function visitorId(): string | null {
  try {
    return window.localStorage.getItem("tf_visitor");
  } catch {
    return null;
  }
}

/** Count an onboarding step or profile view (/api/salons/event). Never throws. */
export function trackSalonEvent(event: string, slug?: string) {
  const visitor = visitorId();
  if (!visitor) return;
  fetch("/api/salons/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, visitor, slug }),
    keepalive: true,
  }).catch(() => undefined);
}
