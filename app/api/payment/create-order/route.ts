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
//
// 09.10.2026 (real sign-in): in real mode the buyer is identified from
// their login token, not the request body. And one safety rule: when a real
// database is connected but Razorpay is still in mock mode, this route
// refuses to create orders at all — otherwise the mock "payment" (which
// accepts any signature) would mark real orders PAID for free.
//
// 12.10.2026 (PayU): the gateway is now PayU (lib/integrations/payu.ts). In
// real mode this route also needs the customer's mobile number (PayU
// requires one), saves the order with a fresh PayU transaction id, and
// returns the form the checkout page posts to PayU. The mobile number is
// passed to PayU only; Tressform does not store it.

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  calculatePackPnl,
  calculateAddonPnl,
  PACK_TIERS,
  type PackTier,
  type AddonKind,
} from "@/lib/pricing";
import { PAYU_LIVE, PAYU_MOCK_MODE, buildPaymentForm, cleanFirstName, newTxnId } from "@/lib/integrations/payu";
import { mockStore } from "@/lib/mockStore";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

const SELLABLE_TIERS: PackTier[] = ["STARTER", "STYLE"];

interface CreateOrderBody {
  userId?: string; // mock mode only — ignored when a real project is connected
  tier?: PackTier;
  addonKind?: AddonKind;
  addonPhotoCount?: number;
  phone?: string;
}

/** A 10-digit Indian mobile number, or null. Accepts +91 / 0 / spaces / dashes. */
function cleanPhone(raw: string | undefined): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export async function POST(req: NextRequest) {
  let body: CreateOrderBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { tier, addonKind, addonPhotoCount } = body;

  if (!SUPABASE_MOCK_MODE && PAYU_MOCK_MODE) {
    return NextResponse.json({ error: "Payments aren't switched on yet — please check back soon.", paymentsOff: true }, { status: 503 });
  }

  const auth = await requireUser(req, body.userId);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const userId = auth.userId;

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

  const txnid = PAYU_MOCK_MODE ? `mock_${newTxnId()}` : newTxnId();

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
      razorpayOrderId: txnid,
      razorpayPaymentId: null,
      createdAt: new Date().toISOString(),
      paidAt: null,
      previewCount: imageCount,
      previewsUsed: 0,
    });

    return NextResponse.json({
      mockMode: true,
      orderId: order.id,
      razorpayOrderId: txnid,
      amountPaise: pnl.pricePaise,
      currency: "INR",
      imageCount,
    });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();

  // PayU's test mode accepts test cards, so while PAYU_MODE isn't "live"
  // only the site owner may start a payment — nobody else gets previews
  // for a pretend payment.
  if (!PAYU_LIVE) {
    const { data: me } = await admin.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (me?.role !== "ADMIN") {
      return NextResponse.json({ error: "Payments aren't switched on yet — please check back soon.", paymentsOff: true }, { status: 503 });
    }
  }

  const phone = cleanPhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: "Please enter your 10-digit mobile number.", field: "phone" }, { status: 400 });
  }
  if (!auth.email) {
    return NextResponse.json({ error: "Your account has no email address. Please log in with Google again." }, { status: 400 });
  }

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
      // PayU's transaction id (column name left over from Razorpay — see lib/payments.ts).
      razorpay_order_id: txnid,
      // What the customer is buying: this many hairstyle previews (see the
      // "paid previews" section at the end of db/schema.sql).
      preview_count: imageCount,
    })
    .select()
    .single();

  if (error || !order) {
    return NextResponse.json({ error: error?.message ?? "Failed to create order." }, { status: 500 });
  }

  const returnUrl = `${req.nextUrl.origin}/api/payment/payu-return`;
  const payu = buildPaymentForm({
    txnid,
    amountPaise: pnl.pricePaise,
    productinfo: tier ? `Tressform ${PACK_TIERS[tier].label}` : "Tressform add-on",
    firstname: cleanFirstName(auth.name),
    email: auth.email,
    phone,
    orderId: order.id,
    surl: returnUrl,
    furl: returnUrl,
  });

  return NextResponse.json({
    mockMode: false,
    orderId: order.id,
    amountPaise: pnl.pricePaise,
    currency: "INR",
    imageCount,
    payu,
  });
}
