// POST /api/previews — what a customer already has for one of their photos:
// the previews made from it, and how many previews they have left.
//
// 11.10.2026. The result screen lives in the page's memory. A customer who
// leaves it to buy a pack, or simply reloads, came back to an empty upload
// form: their photos, their list and the previews they had made were gone
// from the screen (though not from their account). The page now remembers
// which photo it was showing and asks this route to fill the screen in
// again. It is also where the page learns the new balance after a purchase.
//
// Nothing is made or counted here. In real mode only the photo's owner
// gets an answer; anyone else gets the same "not found" as a wrong id.
//
// 14.10.2026 ("My hairstyles" from the account): with { latest: true } and
// no photoId, the answer is about the customer's most recent photo that
// they made hairstyles from — its id, what they confirmed about their face
// and hair (saved with the first hairstyle, photos.customer_details), a
// short-lived link to the photo, and the hairstyles. The page uses it when
// the browser tab has no memory of the screen (new tab, other browser,
// opened from WhatsApp), so the customer's hairstyles are always there.
// "none" (404) when they have no such photo yet.

import { NextRequest, NextResponse } from "next/server";
import { FALAI_MOCK_MODE } from "@/lib/integrations/falai";
import { mockPreviewsLeft, previewsLeft } from "@/lib/allowance";
import { mockStore } from "@/lib/mockStore";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

const LINK_SECONDS = 3600;

export async function POST(req: NextRequest) {
  let body: { userId?: string; photoId?: string; latest?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const auth = await requireUser(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;
  const wantLatest = body.latest === true && !body.photoId;
  if (!body.photoId && !wantLatest) return NextResponse.json({ error: "photoId is required." }, { status: 400 });

  if (SUPABASE_MOCK_MODE) {
    // The demo keeps its screen in the tab only.
    if (wantLatest) return NextResponse.json({ error: "none" }, { status: 404 });
    const photo = mockStore.getPhoto(body.photoId!);
    if (!photo || photo.userId !== userId) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    const previews = [...mockStore.styleResults.values()]
      .filter((r) => r.userId === userId && r.photoId === photo.id && r.status === "SUCCEEDED" && r.resultImageUrl)
      .map((r) => ({ styleName: r.styleName, url: r.resultImageUrl as string, views: r.viewUrls ?? null }));
    return NextResponse.json({ previewsLeft: mockPreviewsLeft(userId).total, previews });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  let latestPhoto: { gender: "men" | "women"; faceShape: string; length: string | null; texture: string | null; photoUrl: string | null } | null =
    null;
  let photo: { id: string } | null = null;
  if (wantLatest) {
    // Newest photo with saved details (they are saved when the first hairstyle is made from it).
    const { data: rows } = await admin
      .from("photos")
      .select("id, storage_path, customer_details")
      .eq("user_id", userId)
      .not("customer_details", "is", null)
      .order("created_at", { ascending: false })
      .limit(5);
    for (const row of rows ?? []) {
      const d = (row.customer_details ?? {}) as Record<string, unknown>;
      if ((d.gender !== "men" && d.gender !== "women") || typeof d.faceShape !== "string") continue;
      const { data: link } = await admin.storage.from("photos").createSignedUrl(row.storage_path as string, LINK_SECONDS);
      latestPhoto = {
        gender: d.gender,
        faceShape: d.faceShape,
        length: typeof d.length === "string" ? d.length : null,
        texture: typeof d.texture === "string" ? d.texture : null,
        photoUrl: link?.signedUrl ?? null,
      };
      photo = { id: row.id as string };
      break;
    }
    if (!photo) return NextResponse.json({ error: "none" }, { status: 404 });
  } else {
    const { data: found } = await admin.from("photos").select("id").eq("id", body.photoId!).eq("user_id", userId).maybeSingle();
    if (!found) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    photo = found;
  }
  const photoId = photo.id;

  const [{ data: rows }, left] = await Promise.all([
    admin
      .from("style_results")
      .select("style_name, result_storage_path, view_paths, created_at")
      .eq("user_id", userId)
      .eq("photo_id", photoId)
      .eq("status", "SUCCEEDED")
      .not("result_storage_path", "is", null)
      .order("created_at", { ascending: true }),
    previewsLeft(admin, userId),
  ]);

  // One picture per style: the latest. Placeholder pictures (stored as a
  // plain web link while the image generator is in mock mode) are passed on
  // as they are; real ones get a private, short-lived link.
  // 12.10.2026: with its side and back views, when they were made.
  const latest = new Map<string, { path: string; views: Record<string, unknown> | null }>();
  for (const row of rows ?? []) {
    latest.set(row.style_name, { path: row.result_storage_path as string, views: (row.view_paths as Record<string, unknown> | null) ?? null });
  }
  const sign = async (path: string) => {
    if (path.startsWith("http")) return path;
    const { data: link } = await admin.storage.from("results").createSignedUrl(path, LINK_SECONDS);
    return link?.signedUrl ?? null;
  };

  const previews = (
    await Promise.all(
      [...latest].map(async ([styleName, { path, views }]) => {
        const url = await sign(path);
        if (!url) return null;
        let viewLinks: { left: string | null; right: string | null; back: string | null } | null = null;
        if (views) {
          const side = async (v: string) => (typeof views[v] === "string" ? sign(views[v] as string) : null);
          const [left, right, back] = await Promise.all([side("left"), side("right"), side("back")]);
          viewLinks = { left, right, back };
        }
        return { styleName, url, views: viewLinks };
      })
    )
  ).filter((p): p is { styleName: string; url: string; views: { left: string | null; right: string | null; back: string | null } | null } => p !== null);

  return NextResponse.json({
    previewsLeft: FALAI_MOCK_MODE ? null : left.total,
    previews,
    ...(latestPhoto ? { photoId, latest: latestPhoto } : {}),
  });
}
