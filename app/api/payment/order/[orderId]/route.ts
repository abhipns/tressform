// GET /api/payment/order/[orderId] — lets app/results/[orderId]/page.tsx
// (a client component) fetch the order it should be confirming, instead of
// reaching into lib/mockStore.ts directly from a page that also needs to
// run against a real Supabase project.
//
// 12.10.2026 (PayU): an order still CREATED is re-checked with PayU here,
// so a payment PayU confirms late (UPI can take a minute) shows up when
// the customer's "Payment confirmed" page checks again.
//
// 09.10.2026 (real sign-in): in real mode only the logged-in owner of an
// order can read it — anyone else gets the same "not found" as a wrong id.
//
// 26.10.2026 (single pictures): a single-picture order also says which
// hairstyle and photo it is for, and the state of each of the four views of
// that hairstyle on that photo (this order's and any bought before or after),
// with the front picture's link once it is made (lib/pictures.ts).
//
// 27.10.2026 (paying without an account): ?k=<key> from the "your looks are
// saved" email (lib/resultsLink.ts) opens this one order without signing in,
// to view and download only (readOnly). The answer also says whether an
// email was given at checkout, so the results page can say where the link
// went, and carries the links of every finished picture.

import { NextRequest, NextResponse } from "next/server";
import { mockStore } from "@/lib/mockStore";
import { PACK_TIERS, type PackTier } from "@/lib/pricing";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { PAYU_MOCK_MODE } from "@/lib/integrations/payu";
import { confirmPayuTxn } from "@/lib/payments";
import { hairstyleById } from "@/lib/content/hairstyles";
import { pictureViewRows, viewState, type PictureViewState } from "@/lib/pictures";
import { PICTURE_VIEWS, type PictureView } from "@/lib/pricing";
import { resultsKeyOk } from "@/lib/resultsLink";

const LINK_SECONDS = 3600;

type PictureSummary = {
  styleId: string;
  styleName: string | null;
  photoId: string | null;
  bought: PictureView[];
  views: Record<PictureView, PictureViewState>;
  frontUrl: string | null;
  /** 27.10.2026: every finished picture's link (for the view-only page). */
  urls: Partial<Record<PictureView, string>>;
};

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
  const { orderId } = params;
  const readOnly = resultsKeyOk(orderId, req.nextUrl.searchParams.get("k"));

  if (SUPABASE_MOCK_MODE) {
    const order = mockStore.getOrder(orderId);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    let pictures: PictureSummary | null = null;
    if (order.orderKind === "PICTURES" && order.pictureStyleId) {
      const rows = mockStore.ownedPictureViews(order.userId, order.picturePhotoId ?? "", order.pictureStyleId);
      pictures = {
        styleId: order.pictureStyleId,
        styleName: hairstyleById(order.pictureStyleId)?.name ?? null,
        photoId: order.picturePhotoId ?? null,
        bought: order.pictureViews ?? [],
        views: Object.fromEntries(PICTURE_VIEWS.map((v) => [v, viewState(rows, v)])) as Record<PictureView, PictureViewState>,
        frontUrl: rows.find((r) => r.view === "front" && r.status === "DONE")?.resultUrl ?? null,
        urls: Object.fromEntries(rows.filter((r) => r.status === "DONE" && r.resultUrl).map((r) => [r.view, r.resultUrl!])),
      };
    }

    return NextResponse.json({
      mockMode: true,
      order: {
        id: order.id,
        status: order.status,
        tier: order.tier,
        tierLabel: order.tier ? PACK_TIERS[order.tier as PackTier].label : null,
        imageCount: order.tier ? PACK_TIERS[order.tier as PackTier].imageCount : order.addonPhotoCount,
        pricePaise: order.pricePaise,
        creditUsedPaise: order.creditUsedPaise ?? 0,
        gstPaise: order.gstPaise,
        addonKind: order.addonKind,
        referralCreditsPaise: order.referralCreditsPaise,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
        pictures,
        readOnly,
        emailedTo: null,
      },
    });
  }

  // The order's owner, signed in — or anyone with the order's private link (view only).
  const auth = readOnly ? null : await requireUser(req);
  if (auth && !auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  let { data: order, error } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error || !order || (!readOnly && order.user_id !== (auth as { userId: string }).userId)) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.status === "CREATED" && order.razorpay_order_id && !PAYU_MOCK_MODE) {
    try {
      const r = await confirmPayuTxn(order.razorpay_order_id);
      if (r.found && r.status !== "PENDING") {
        ({ data: order } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle());
        if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
      }
    } catch (err) {
      console.error(`[Tressform] re-check of order ${orderId} with PayU failed:`, err);
    }
  }

  let pictures: PictureSummary | null = null;
  if (order.order_kind === "PICTURES" && order.picture_style_id) {
    const rows = order.picture_photo_id ? await pictureViewRows(admin, order.user_id, order.picture_photo_id, order.picture_style_id) : [];
    const frontPath = rows.find((r) => r.view === "front" && r.status === "DONE")?.result_storage_path ?? null;
    const urls: Partial<Record<PictureView, string>> = {};
    await Promise.all(
      rows
        .filter((r) => r.status === "DONE" && r.result_storage_path)
        .map(async (r) => {
          const path = r.result_storage_path!;
          if (path.startsWith("http")) return void (urls[r.view] = path);
          const { data } = await admin.storage.from("results").createSignedUrl(path, LINK_SECONDS);
          if (data?.signedUrl) urls[r.view] = data.signedUrl;
        })
    );
    const frontUrl: string | null = frontPath ? urls.front ?? null : null;
    pictures = {
      styleId: order.picture_style_id,
      styleName: hairstyleById(order.picture_style_id)?.name ?? null,
      photoId: order.picture_photo_id,
      bought: order.picture_views ?? [],
      views: Object.fromEntries(PICTURE_VIEWS.map((v) => [v, viewState(rows, v)])) as Record<PictureView, PictureViewState>,
      frontUrl,
      urls,
    };
  }

  return NextResponse.json({
    mockMode: false,
    order: {
      id: order.id,
      status: order.status,
      tier: order.tier,
      tierLabel: order.tier ? PACK_TIERS[order.tier as PackTier].label : null,
      imageCount: order.tier ? PACK_TIERS[order.tier as PackTier].imageCount : order.addon_photo_count,
      pricePaise: order.price_paise,
      creditUsedPaise: order.credit_used_paise ?? 0,
      gstPaise: order.gst_paise,
      addonKind: order.addon_kind,
      referralCreditsPaise: order.referral_credits_paise,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      pictures,
      readOnly,
      // Where the "your looks are saved" email went (only to the order's owner).
      emailedTo: !readOnly && order.contact_email ? order.contact_email : null,
    },
  });
}
