// GET /api/payment/order/[orderId] — lets app/results/[orderId]/page.tsx
// (a client component) fetch the order it should be confirming, instead of
// reaching into lib/mockStore.ts directly from a page that also needs to
// run against a real Supabase project. Read-only, no auth check yet — same
// "no role/session system wired up" caveat as the rest of this codebase
// (see app/api/admin/carousel/route.ts's header comment).

import { NextRequest, NextResponse } from "next/server";
import { mockStore } from "@/lib/mockStore";
import { PACK_TIERS, type PackTier } from "@/lib/pricing";

const SUPABASE_MOCK_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export async function GET(_req: NextRequest, { params }: { params: { orderId: string } }) {
  const { orderId } = params;

  if (SUPABASE_MOCK_MODE) {
    const order = mockStore.getOrder(orderId);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

    return NextResponse.json({
      mockMode: true,
      order: {
        id: order.id,
        status: order.status,
        tier: order.tier,
        tierLabel: order.tier ? PACK_TIERS[order.tier as PackTier].label : null,
        imageCount: order.tier ? PACK_TIERS[order.tier as PackTier].imageCount : order.addonPhotoCount,
        pricePaise: order.pricePaise,
        gstPaise: order.gstPaise,
        addonKind: order.addonKind,
        referralCreditsPaise: order.referralCreditsPaise,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
      },
    });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  const { data: order, error } = await admin.from("orders").select("*").eq("id", orderId).single();
  if (error || !order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  return NextResponse.json({
    mockMode: false,
    order: {
      id: order.id,
      status: order.status,
      tier: order.tier,
      tierLabel: order.tier ? PACK_TIERS[order.tier as PackTier].label : null,
      imageCount: order.tier ? PACK_TIERS[order.tier as PackTier].imageCount : order.addon_photo_count,
      pricePaise: order.price_paise,
      gstPaise: order.gst_paise,
      addonKind: order.addon_kind,
      referralCreditsPaise: order.referral_credits_paise,
      createdAt: order.created_at,
      paidAt: order.paid_at,
    },
  });
}
