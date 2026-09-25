// POST /api/referral/track
// Records a referral relationship when a new user signs up using someone
// else's referral code/link. One referral per referred customer, ever
// (enforced by the DB's unique constraint on referrals.referred_id, and
// mirrored here in mock mode) — matches the "first purchase only, per
// customer not per tier" rule in Part I.

import { NextResponse } from "next/server";
import { getSupabaseAdmin, SUPABASE_MOCK_MODE } from "@/lib/supabaseClient";
import { mockStore } from "@/lib/mockStore";

interface TrackReferralRequestBody {
  referredUserId: string;
  referralCode: string;
}

function randomId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function POST(req: Request) {
  let body: TrackReferralRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body.referredUserId || !body.referralCode) {
    return NextResponse.json({ error: "referredUserId and referralCode are required." }, { status: 400 });
  }

  if (SUPABASE_MOCK_MODE) {
    const existing = mockStore.getReferralForReferredUser(body.referredUserId);
    if (existing) {
      return NextResponse.json({ error: "This user has already been referred once." }, { status: 409 });
    }

    // In mock mode we don't have a real referral-code -> user lookup table,
    // so we synthesize a referrer id from the code for demonstration.
    const referrerId = `referrer_of_${body.referralCode}`;
    if (referrerId === body.referredUserId) {
      return NextResponse.json({ error: "A user cannot refer themselves." }, { status: 400 });
    }

    const profile = mockStore.getOrCreateProfile(body.referredUserId);
    profile.referredBy = referrerId;

    mockStore.recordReferral({
      id: randomId("ref"),
      referrerId,
      referredId: body.referredUserId,
      referralCodeUsed: body.referralCode,
      firstPurchaseOrderId: null,
      payoutStatus: "PENDING",
      payoutPaise: 0,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ tracked: true, referrerId, mock: true });
  }

  const admin = getSupabaseAdmin();

  const { data: referrer, error: referrerError } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", body.referralCode)
    .single();

  if (referrerError || !referrer) {
    return NextResponse.json({ error: "Unknown referral code." }, { status: 404 });
  }
  if (referrer.id === body.referredUserId) {
    return NextResponse.json({ error: "A user cannot refer themselves." }, { status: 400 });
  }

  const { error: updateError } = await admin
    .from("profiles")
    .update({ referred_by: referrer.id })
    .eq("id", body.referredUserId)
    .is("referred_by", null); // never overwrite an existing referral relationship

  if (updateError) {
    return NextResponse.json({ error: `Failed to link referral: ${updateError.message}` }, { status: 500 });
  }

  const { error: insertError } = await admin.from("referrals").insert({
    referrer_id: referrer.id,
    referred_id: body.referredUserId,
    referral_code_used: body.referralCode,
  });

  if (insertError) {
    // Most likely the unique constraint on referred_id — this user was already referred.
    return NextResponse.json({ error: `Failed to record referral: ${insertError.message}` }, { status: 409 });
  }

  return NextResponse.json({ tracked: true, referrerId: referrer.id, mock: false });
}
