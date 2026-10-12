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

import { NextRequest, NextResponse } from "next/server";
import { FALAI_MOCK_MODE } from "@/lib/integrations/falai";
import { mockPreviewsLeft, previewsLeft } from "@/lib/allowance";
import { mockStore } from "@/lib/mockStore";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

const LINK_SECONDS = 3600;

export async function POST(req: NextRequest) {
  let body: { userId?: string; photoId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const auth = await requireUser(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;
  if (!body.photoId) return NextResponse.json({ error: "photoId is required." }, { status: 400 });

  if (SUPABASE_MOCK_MODE) {
    const photo = mockStore.getPhoto(body.photoId);
    if (!photo || photo.userId !== userId) return NextResponse.json({ error: "Photo not found." }, { status: 404 });
    const previews = [...mockStore.styleResults.values()]
      .filter((r) => r.userId === userId && r.photoId === photo.id && r.status === "SUCCEEDED" && r.resultImageUrl)
      .map((r) => ({ styleName: r.styleName, url: r.resultImageUrl as string, views: r.viewUrls ?? null }));
    return NextResponse.json({ previewsLeft: mockPreviewsLeft(userId).total, previews });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const { data: photo } = await admin.from("photos").select("id").eq("id", body.photoId).eq("user_id", userId).maybeSingle();
  if (!photo) return NextResponse.json({ error: "Photo not found." }, { status: 404 });

  const [{ data: rows }, left] = await Promise.all([
    admin
      .from("style_results")
      .select("style_name, result_storage_path, view_paths, created_at")
      .eq("user_id", userId)
      .eq("photo_id", photo.id)
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

  return NextResponse.json({ previewsLeft: FALAI_MOCK_MODE ? null : left.total, previews });
}
