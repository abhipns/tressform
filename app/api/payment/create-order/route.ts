// /api/payment/create-order — closes the doc's #2 gap ("no checkout or
// results route exists anywhere in the app... Pricing, WhatYouGet, and
// ProductRecommendations all describe a purchase → results journey, but
// there is no page for a user to actually pay"). First half of that flow:
// price the order server-side from lib/pricing.ts (never trust a client-
// supplied amount), open a Razorpay order, and persist a CREATED order row.
//
// Only STARTER and STYLE are sellable right now — FULL_EXPLORE is shown
// "🔒 Not yet available" in Pricing.tsx, so this route rejects it too,
// rather than letting a direct API call buy a pack the UI itself blocks.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  calculatePackPnl,
  calculateAddonPnl,
  PACK_TIERS,
  type PackTier,
  type AddonKind,
} from "@/lib/pricing";
import { createOrder as createRazorpayOrder } from "@/lib/integrations/razorpay";
import { mockStore } from "@/lib/mockStore";

const SUPABASE_MOCK_MODE = !process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const SELLABLE_TIERS: PackTier[] = ["STARTER", "STYLE"];

interface CreateOrderBody {
  userId?: string;
  tier?: PackTier;
  addonKind?: AddonKind;
  addonPhotoCount?: number;
}

export async function POST(req: NextRequest) {
  let body: CreateOrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { userId, tier, addonKind, addonPhotoCount } = body;

  if (!userId) return NextResponse.json({ error: "userId is required." }, { status: 400 });

  const isAddon = Boolean(addonKind);
  if (!tier && !isAddon) {
    return NextResponse.json({ error: "Either tier or addonKind is required." }, { status: 400 });
  }
  if (tier && isAddon) {
    return NextResponse.json({ error: "Pass either tier or an add-on, not both." }, { status: 400 });
  }
  if (tier && !PACK_TIERS[tier]) {
    return NextResponse.json({ error: `Unknown tier "${tier}".` }, { status: 400 });
  }
  if (tier && !SELLABLE_TIERS.includes(tier)) {
    return NextResponse.json({ error: `${PACK_TIERS[tier].label} isn't available for purchase yet.` }, { status: 400 });
  }
  if (isAddon && (!addonPhotoCount || addonPhotoCount < 1)) {
    return NextResponse.json({ error: "addonPhotoCount must be at least 1 for an add-on order." }, { status: 400 });
  }

  const pnl = tier ? calculatePackPnl(tier) : calculateAddonPnl(addonPhotoCount!);
  const imageCount = tier ? PACK_TIERS[tier].imageCount : addonPhotoCount!;
  const internalOrderId = randomUUID();

  let razorpayOrder;
  try {
    razorpayOrder = await createRazorpayOrder({
      amountPaise: pnl.pricePaise,
      receipt: internalOrderId,
      notes: { userId, tier: tier ?? "", addonKind: addonKind ?? "" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not create a payment order." },
      { status: 502 }
    );
  }

  if (SUPABASE_MOCK_MODE) {
    const profile = mockStore.getOrCreateProfile(userId);
    const hasPaidBefore = [...mockStore.orders.values()].some((o) => o.userId === userId && o.status === "PAID");
    const isReferredFirstPurchase = Boolean(profile.referredBy) && !hasPaidBefore;

    const order = mockStore.createOrder({
      id: internalOrderId,
      userId,
      tier: tier ?? null,
      addonKind: addonKind ?? null,
      addonPhotoCount: isAddon ? addonPhotoCount! : 0,
      pricePaise: pnl.pricePaise,
      gstPaise: pnl.gstPaise,
      generationCostPaise: pnl.generationCostPaise,
      gatewayFeePaise: pnl.gatewayFeePaise,
      profitBeforeReferralPaise: pnl.profitBeforeReferralPaise,
      isReferredFirstPurchase,
      referralCreditsPaise: 0, // settled in /api/payment/verify once payment is confirmed
      status: "CREATED",
      razorpayOrderId: razorpayOrder.id,
      razorpayPaymentId: null,
      createdAt: new Date().toISOString(),
      paidAt: null,
    });

    return NextResponse.json({
      mockMode: true,
      orderId: order.id,
      razorpayOrderId: razorpayOrder.id,
      amountPaise: pnl.pricePaise,
      currency: "INR",
      imageCount,
      keyId: process.env.RAZORPAY_KEY_ID || null,
    });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  const { data: existingPaid } = await admin
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "PAID")
    .limit(1);

  const { data: profile } = await admin.from("profiles").select("referred_by").eq("id", userId).single();
  const isReferredFirstPurchase = Boolean(profile?.referred_by) && !(existingPaid && existingPaid.length > 0);

  const { data: order, error } = await admin
    .from("orders")
    .insert({
      id: internalOrderId,
      user_id: userId,
      tier: tier ?? null,
      addon_kind: addonKind ?? null,
      addon_photo_count: isAddon ? addonPhotoCount! : 0,
      price_paise: pnl.pricePaise,
      gst_paise: pnl.gstPaise,
      generation_cost_paise: pnl.generationCostPaise,
      gateway_fee_paise: pnl.gatewayFeePaise,
      profit_before_referral_paise: pnl.profitBeforeReferralPaise,
      is_referred_first_purchase: isReferredFirstPurchase,
      referral_credits_paise: 0,
      status: "CREATED",
      razorpay_order_id: razorpayOrder.id,
    })
    .select()
    .single();

  if (error || !order) {
    return NextResponse.json({ error: error?.message ?? "Failed to create order." }, { status: 500 });
  }

  return NextResponse.json({
    mockMode: false,
    orderId: order.id,
    razorpayOrderId: razorpayOrder.id,
    amountPaise: pnl.pricePaise,
    currency: "INR",
    imageCount,
    keyId: process.env.RAZORPAY_KEY_ID || null,
  });
}
