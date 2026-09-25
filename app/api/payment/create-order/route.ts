// POST /api/payment/create-order
// Create a Razorpay order for a pack purchase or a My Assets add-on
// purchase. Computes the full GST/generation-cost/gateway-fee/referral P&L
// up front (lib/pricing.ts) and stores it as a snapshot on the order row, so
// later reporting is never dependent on prices that may change after launch.

import { NextResponse } from "next/server";
import { createOrder as createRazorpayOrder, RAZORPAY_MOCK_MODE } from "@/lib/integrations/razorpay";
import { getSupabaseAdmin, SUPABASE_MOCK_MODE } from "@/lib/supabaseClient";
import { mockStore, type MockOrder } from "@/lib/mockStore";
import {
  calculateFullOrder,
  MY_ASSETS_ADDON_PRICE_PAISE,
  PACK_TIERS,
  type AddonKind,
  type PackTier,
} from "@/lib/pricing";

interface CreateOrderRequestBody {
  userId: string;
  tier?: PackTier;
  addonKind?: AddonKind;
  addonPhotoCount?: number;
}

function randomId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: Request) {
  let body: CreateOrderRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.userId) {
    return NextResponse.json({ error: "userId is required." }, { status: 400 });
  }
  if (!body.tier && !body.addonKind) {
    return NextResponse.json({ error: "Either tier or addonKind is required." }, { status: 400 });
  }
  if (body.tier && !PACK_TIERS[body.tier]) {
    return NextResponse.json({ error: `Unknown tier: ${body.tier}` }, { status: 400 });
  }

  const pricePaise = body.tier
    ? PACK_TIERS[body.tier].pricePaise
    : MY_ASSETS_ADDON_PRICE_PAISE * (body.addonPhotoCount ?? 1);
  const imageCount = body.tier ? PACK_TIERS[body.tier].imageCount : body.addonPhotoCount ?? 1;

  // Determine referral eligibility: only a referred customer's very first
  // purchase ever qualifies (Part I rule).
  let isReferredFirstPurchase = false;
  let referrerId: string | null = null;

  if (SUPABASE_MOCK_MODE) {
    const profile = mockStore.getOrCreateProfile(body.userId);
    if (profile.referredBy && !profile.firstPurchaseOrderId) {
      isReferredFirstPurchase = true;
      referrerId = profile.referredBy;
    }
  } else {
    const admin = getSupabaseAdmin();
    const { data: profile } = await admin
      .from("profiles")
      .select("referred_by, first_purchase_order_id")
      .eq("id", body.userId)
      .single();
    if (profile?.referred_by && !profile.first_purchase_order_id) {
      isReferredFirstPurchase = true;
      referrerId = profile.referred_by;
    }
  }

  const calc = calculateFullOrder(pricePaise, imageCount, isReferredFirstPurchase);
  const orderId = randomId("ord");

  const razorpayOrder = await createRazorpayOrder({
    amountPaise: pricePaise,
    receipt: orderId,
    notes: { userId: body.userId, tier: body.tier ?? "ADDON" },
  });

  if (SUPABASE_MOCK_MODE) {
    const order: MockOrder = {
      id: orderId,
      userId: body.userId,
      tier: body.tier ?? null,
      addonKind: body.addonKind ?? null,
      addonPhotoCount: body.addonKind ? body.addonPhotoCount ?? 1 : 0,
      pricePaise: calc.pricePaise,
      gstPaise: calc.gstPaise,
      generationCostPaise: calc.generationCostPaise,
      gatewayFeePaise: calc.gatewayFeePaise,
      profitBeforeReferralPaise: calc.profitBeforeReferralPaise,
      isReferredFirstPurchase: calc.isReferredFirstPurchase,
      referralPayoutPaise: calc.referralPayoutPaise,
      status: "CREATED",
      razorpayOrderId: razorpayOrder.id,
      razorpayPaymentId: null,
      createdAt: new Date().toISOString(),
      paidAt: null,
    };
    mockStore.createOrder(order);

    if (referrerId) {
      const existing = mockStore.getReferralForReferredUser(body.userId);
      if (!existing) {
        mockStore.recordReferral({
          id: randomId("ref"),
          referrerId,
          referredId: body.userId,
          referralCodeUsed: "mock",
          firstPurchaseOrderId: null,
          payoutStatus: "PENDING",
          payoutPaise: 0,
          createdAt: new Date().toISOString(),
        });
      }
    }
  } else {
    const admin = getSupabaseAdmin();
    const { error } = await admin.from("orders").insert({
      id: orderId,
      user_id: body.userId,
      tier: body.tier ?? null,
      addon_kind: body.addonKind ?? null,
      addon_photo_count: body.addonKind ? body.addonPhotoCount ?? 1 : 0,
      price_paise: calc.pricePaise,
      gst_paise: calc.gstPaise,
      generation_cost_paise: calc.generationCostPaise,
      gateway_fee_paise: calc.gatewayFeePaise,
      profit_before_referral_paise: calc.profitBeforeReferralPaise,
      is_referred_first_purchase: calc.isReferredFirstPurchase,
      referral_payout_paise: calc.referralPayoutPaise,
      status: "CREATED",
      razorpay_order_id: razorpayOrder.id,
    });
    if (error) {
      return NextResponse.json({ error: `Failed to create order: ${error.message}` }, { status: 500 });
    }
  }

  return NextResponse.json({
    orderId,
    razorpayOrderId: razorpayOrder.id,
    razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? null,
    amountPaise: pricePaise,
    currency: "INR",
    mock: RAZORPAY_MOCK_MODE || SUPABASE_MOCK_MODE,
  });
}
