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
//
// 14.10.2026 (credit at checkout): with `useCredit: true` the customer's
// Tressform credit goes toward the order (rules in lib/credit.ts). The
// order is saved at the reduced price, with the credit used beside it, and
// PayU is asked only for the reduced amount. When the credit covers the
// whole price there is no PayU step at all: the credit is taken at once and
// the order is saved already PAID (answer: { free: true, orderId }).

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  calculatePackPnl,
  calculateAddonPnl,
  calculateOrderPnl,
  PACK_TIERS,
  PICTURES_PER_PREVIEW,
  type PackTier,
  type AddonKind,
} from "@/lib/pricing";
import { CREDIT_ONLY_TXN_PREFIX, splitWithCredit } from "@/lib/credit";
import { PAYU_LIVE, PAYU_MOCK_MODE, buildPaymentForm, cleanFirstName, newTxnId } from "@/lib/integrations/payu";
import { mockStore } from "@/lib/mockStore";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { confirmPayuTxn } from "@/lib/payments";
import { campaignColumns } from "@/lib/campaign";

const SELLABLE_TIERS: PackTier[] = ["STARTER", "STYLE"];

/**
 * 21.10.2026: save an order with the ad campaign that brought the customer.
 * If the campaign columns aren't in the database yet (the database step not
 * run), the order is saved without them — a payment must never fail over
 * ad tracking.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertOrder(admin: any, select: string, row: Record<string, unknown>, campaign: Record<string, unknown>) {
  const first = await admin.from("orders").insert({ ...row, ...campaign }).select(select).single();
  if (first.error && /utm_|column/i.test(first.error.message ?? "")) {
    console.error("[Tressform] order saved without the ad campaign:", first.error.message);
    return admin.from("orders").insert(row).select(select).single();
  }
  return first;
}

/**
 * 20.10.2026: the id of one of this customer's orders from the last two hours
 * that was still unpaid here but that PayU now says is paid (it is marked
 * PAID on the way), or null. At most three are checked; a PayU error never
 * stops the new order.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function recentlyPaidOrder(admin: any, userId: string): Promise<string | null> {
  const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const { data: open } = await admin
    .from("orders")
    .select("id, razorpay_order_id")
    .eq("user_id", userId)
    .eq("status", "CREATED")
    .gte("created_at", since)
    .not("razorpay_order_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(3);
  for (const o of (open ?? []) as { id: string; razorpay_order_id: string }[]) {
    if (o.razorpay_order_id.startsWith(CREDIT_ONLY_TXN_PREFIX)) continue;
    try {
      const r = await confirmPayuTxn(o.razorpay_order_id, "check");
      if (r.found && r.status === "PAID") return r.orderId;
    } catch (err) {
      console.error(`[Tressform] re-check of order ${o.id} before a new order failed:`, (err as Error)?.message ?? err);
    }
  }
  return null;
}

interface CreateOrderBody {
  userId?: string; // mock mode only — ignored when a real project is connected
  tier?: PackTier;
  addonKind?: AddonKind;
  addonPhotoCount?: number;
  phone?: string;
  useCredit?: boolean;
  /** 21.10.2026: the ad campaign that brought this customer (lib/campaign.ts). */
  campaign?: unknown;
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
  // 23.10.2026: visitors try the upload before signing in (anonymous
  // account); paying needs a real account, so the purchase and its pictures
  // are never lost and PayU gets an email.
  if (auth.anonymous) {
    return NextResponse.json({ error: "Please create your account to continue.", needsAccount: true }, { status: 401 });
  }
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

  const listPnl = tier ? calculatePackPnl(tier) : calculateAddonPnl(addonPhotoCount!);
  const imageCount = tier ? PACK_TIERS[tier].imageCount : addonPhotoCount!;
  const internalOrderId = randomUUID();
  const useCredit = body.useCredit === true;
  /** The order's figures at the price actually charged (after any credit). */
  const pnlFor = (duePaise: number) => calculateOrderPnl(duePaise, imageCount, tier ? PICTURES_PER_PREVIEW : 1);

  const txnid = PAYU_MOCK_MODE ? `mock_${newTxnId()}` : newTxnId();

  if (SUPABASE_MOCK_MODE) {
    const profile = mockStore.getOrCreateProfile(userId);
    const hasPaidBefore = [...mockStore.orders.values()].some((o) => o.userId === userId && o.status === "PAID");
    const split = splitWithCredit(listPnl.pricePaise, profile.creditBalancePaise, useCredit);
    const free = split.duePaise === 0;
    const pnl = pnlFor(split.duePaise);
    // A first purchase paid entirely with credit brings no new money in, so it earns the referrer nothing.
    const isReferredFirstPurchase = Boolean(profile.referredBy) && !hasPaidBefore && !free;
    if (free) profile.creditBalancePaise -= split.creditPaise;

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
      status: free ? "PAID" : "CREATED",
      razorpayOrderId: free ? `${CREDIT_ONLY_TXN_PREFIX}${txnid}` : txnid,
      razorpayPaymentId: null,
      createdAt: new Date().toISOString(),
      paidAt: free ? new Date().toISOString() : null,
      previewCount: imageCount,
      previewsUsed: 0,
      creditUsedPaise: split.creditPaise,
    });

    return NextResponse.json({
      mockMode: true,
      free,
      orderId: order.id,
      razorpayOrderId: order.razorpayOrderId,
      amountPaise: split.duePaise,
      creditUsedPaise: split.creditPaise,
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

  // 20.10.2026: a customer paid by QR code, the page didn't move on (UPI can
  // take minutes to confirm), so he started again and paid twice. Before a
  // new order is made, the customer's unpaid orders from the last two hours
  // are checked with PayU; if one has been paid, they're sent to it instead.
  const alreadyPaidId = await recentlyPaidOrder(admin, userId);
  if (alreadyPaidId) {
    return NextResponse.json(
      {
        error: "Your earlier payment has come through, so there's no need to pay again. Taking you to your hairstyles…",
        alreadyPaid: true,
        orderId: alreadyPaidId,
      },
      { status: 409 }
    );
  }

  const { data: existingPaid } = await admin
    .from("orders")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "PAID")
    .limit(1);

  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by, credit_balance_paise")
    .eq("id", userId)
    .single();
  const split = splitWithCredit(listPnl.pricePaise, profile?.credit_balance_paise ?? 0, useCredit);
  const pnl = pnlFor(split.duePaise);
  // A first purchase paid entirely with credit brings no new money in, so it earns the referrer nothing.
  const isReferredFirstPurchase =
    Boolean(profile?.referred_by) && !(existingPaid && existingPaid.length > 0) && split.duePaise > 0;

  if (split.duePaise === 0) return creditOnlyOrder();

  const phone = cleanPhone(body.phone);
  if (!phone) {
    return NextResponse.json({ error: "Please enter your 10-digit mobile number.", field: "phone" }, { status: 400 });
  }
  if (!auth.email) {
    return NextResponse.json({ error: "Your account has no email address. Please log in with Google again." }, { status: 400 });
  }

  const { data: order, error } = await insertOrder(admin, "*", {
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
      // Taken from the balance only when PayU confirms the payment (lib/payments.ts).
      credit_used_paise: split.creditPaise,
    }, campaignColumns(body.campaign));

  if (error || !order) {
    console.error("[Tressform] Order not created:", error?.message);
    return NextResponse.json({ error: "We couldn't start your payment. Please try again." }, { status: 500 });
  }

  const returnUrl = `${req.nextUrl.origin}/api/payment/payu-return`;
  const payu = buildPaymentForm({
    txnid,
    amountPaise: split.duePaise,
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
    free: false,
    orderId: order.id,
    amountPaise: split.duePaise,
    creditUsedPaise: split.creditPaise,
    currency: "INR",
    imageCount,
    payu,
  });

  /** The credit covers the whole price: take it now and save the order already PAID — no PayU step. */
  async function creditOnlyOrder() {
    const { data: took, error: spendError } = await admin.rpc("spend_credit", {
      p_user: userId,
      p_amount: split.creditPaise,
    });
    if (spendError || took !== true) {
      return NextResponse.json(
        { error: "Your credit balance has changed. Please refresh the page and try again." },
        { status: 409 }
      );
    }
    const now = new Date().toISOString();
    const { data: order, error } = await insertOrder(admin, "id", {
        id: internalOrderId,
        user_id: userId,
        tier: tier ?? null,
        addon_kind: addonKind ?? null,
        addon_photo_count: isAddon ? addonPhotoCount! : 0,
        price_paise: 0,
        gst_paise: pnl.gstPaise,
        generation_cost_paise: pnl.generationCostPaise,
        gateway_fee_paise: pnl.gatewayFeePaise,
        profit_before_referral_paise: pnl.profitBeforeReferralPaise,
        is_referred_first_purchase: false,
        referral_credits_paise: 0,
        status: "PAID",
        paid_at: now,
        razorpay_order_id: `${CREDIT_ONLY_TXN_PREFIX}${txnid}`,
        preview_count: imageCount,
        credit_used_paise: split.creditPaise,
      }, campaignColumns(body.campaign));
    if (error || !order) {
      // Give the credit back — nothing was bought.
      await admin.rpc("increment_credit_balance", { profile_id: userId, amount_paise: split.creditPaise });
      console.error("[Tressform] Credit-only order not created:", error?.message);
      return NextResponse.json({ error: "We couldn't complete your order. Your credit is unchanged — please try again." }, { status: 500 });
    }
    return NextResponse.json({
      mockMode: false,
      free: true,
      orderId: order.id,
      amountPaise: 0,
      creditUsedPaise: split.creditPaise,
      currency: "INR",
      imageCount,
    });
  }
}
