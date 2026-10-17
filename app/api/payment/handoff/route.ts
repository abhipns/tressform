// /api/payment/handoff — "Pay from another phone" (17.10.2026; see lib/payHandoff.ts).
//
// POST (the customer, signed in, on the checkout page): { orderId, phone }
//   for one of their own unpaid orders → { url } for the QR code.
// GET ?t=<token> (the other phone; no login, the token is the permission)
//   → the form to post to PayU for that order, or { status } when the order
//   is already paid / closed.
//
// PayU then sends the other phone back to /api/payment/payu-return?h=1,
// which shows it a short "done" page instead of the customer's results.

import { NextRequest, NextResponse } from "next/server";
import { PACK_TIERS, type PackTier } from "@/lib/pricing";
import { PAYU_MOCK_MODE, buildPaymentForm, cleanFirstName } from "@/lib/integrations/payu";
import { makeHandoffToken, readHandoffToken } from "@/lib/payHandoff";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";

export const dynamic = "force-dynamic";

const OFF = { error: "Paying from another phone isn't available right now." };

function cleanPhone(raw: unknown): string | null {
  let d = (typeof raw === "string" ? raw : "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export async function POST(req: NextRequest) {
  if (SUPABASE_MOCK_MODE || PAYU_MOCK_MODE) return NextResponse.json(OFF, { status: 503 });
  let body: { orderId?: unknown; phone?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const auth = await requireUser(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const phone = cleanPhone(body.phone);
  if (!phone) return NextResponse.json({ error: "Please enter your 10-digit mobile number.", field: "phone" }, { status: 400 });
  const orderId = typeof body.orderId === "string" ? body.orderId : "";

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  const { data: order } = await admin.from("orders").select("id, user_id, status").eq("id", orderId).maybeSingle();
  if (!order || order.user_id !== auth.userId) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.status !== "CREATED") return NextResponse.json({ error: "This order is already closed." }, { status: 409 });

  const token = makeHandoffToken({ orderId: order.id, phone });
  if (!token) return NextResponse.json(OFF, { status: 503 });
  return NextResponse.json({ url: `${req.nextUrl.origin}/pay?t=${token}` });
}

export async function GET(req: NextRequest) {
  if (SUPABASE_MOCK_MODE || PAYU_MOCK_MODE) return NextResponse.json(OFF, { status: 503 });
  const data = readHandoffToken(req.nextUrl.searchParams.get("t"));
  if (!data) {
    return NextResponse.json(
      { error: "This payment link has expired or isn't valid. Ask for a new QR code on the checkout page." },
      { status: 400 }
    );
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const admin = getSupabaseAdmin();
  const { data: order } = await admin
    .from("orders")
    .select("id, user_id, status, tier, price_paise, razorpay_order_id")
    .eq("id", data.orderId)
    .maybeSingle();
  if (!order) return NextResponse.json({ error: "We couldn't find this payment." }, { status: 404 });
  if (order.status !== "CREATED") return NextResponse.json({ status: order.status === "PAID" ? "PAID" : "CLOSED" });

  const { data: who } = await admin.auth.admin.getUserById(order.user_id);
  const user = who?.user ?? null;
  const email = user?.email;
  if (!user || !email || !order.razorpay_order_id) return NextResponse.json({ error: "We couldn't open this payment." }, { status: 500 });
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name : typeof meta.name === "string" ? meta.name : null;
  const tier = order.tier as PackTier | null;

  const returnUrl = `${req.nextUrl.origin}/api/payment/payu-return?h=1`;
  const payu = buildPaymentForm({
    txnid: order.razorpay_order_id,
    amountPaise: order.price_paise,
    productinfo: tier && PACK_TIERS[tier] ? `Tressform ${PACK_TIERS[tier].label}` : "Tressform add-on",
    firstname: cleanFirstName(name),
    email,
    phone: data.phone,
    orderId: order.id,
    surl: returnUrl,
    furl: returnUrl,
  });
  return NextResponse.json({
    status: "CREATED",
    amountPaise: order.price_paise,
    packLabel: tier && PACK_TIERS[tier] ? PACK_TIERS[tier].label : "Tressform",
    payu,
  });
}
