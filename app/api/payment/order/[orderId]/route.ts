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

import { NextRequest, NextResponse } from "next/server";
import { mockStore } from "@/lib/mockStore";
import { PACK_TIERS, type PackTier } from "@/lib/pricing";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { PAYU_MOCK_MODE } from "@/lib/integrations/payu";
import { confirmPayuTxn } from "@/lib/payments";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { orderId: string } }) {
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
        creditUsedPaise: order.creditUsedPaise ?? 0,
        gstPaise: order.gstPaise,
        addonKind: order.addonKind,
        referralCreditsPaise: order.referralCreditsPaise,
        createdAt: order.createdAt,
        paidAt: order.paidAt,
      },
    });
  }

  const auth = await requireUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  let { data: order, error } = await admin.from("orders").select("*").eq("id", orderId).maybeSingle();
  if (error || !order || order.user_id !== auth.userId) {
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
    },
  });
}
