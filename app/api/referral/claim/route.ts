// /api/referral/claim — link a signed-in customer to the friend whose
// referral link they opened (14.10.2026). Called by
// components/ReferralBeacon.tsx; the rules live in lib/referral.ts.
//
// Answers:
//   { linked: true }                     linked now
//   { linked: false, reason, final }     not linked; `final` = forget the code
//
// The customer's id always comes from their login token (lib/serverAuth.ts),
// never from the request body, so nobody can link someone else's account.

import { NextRequest, NextResponse } from "next/server";
import { requireUser, SUPABASE_MOCK_MODE } from "@/lib/serverAuth";
import { decideClaim, normalizeReferralCode } from "@/lib/referral";
import { mockStore } from "@/lib/mockStore";

export const dynamic = "force-dynamic";

function no(reason: string, status = 200) {
  return NextResponse.json({ linked: false, reason, final: true }, { status });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const auth = await requireUser(req, typeof body.userId === "string" ? body.userId : null);
  // Not signed in (or session expired): keep the code and try again after login.
  if (!auth.ok) return NextResponse.json({ linked: false, reason: "not_signed_in", final: false }, { status: auth.status });

  const code = normalizeReferralCode(body.code);
  if (!code) return no("unknown_code", 400);

  if (SUPABASE_MOCK_MODE) {
    const me = mockStore.getOrCreateProfile(auth.userId);
    const referrer = [...mockStore.profiles.values()].find((p) => p.referralCode === code) ?? null;
    const decision = decideClaim({
      claimantId: auth.userId,
      referrerId: referrer?.id ?? null,
      claimantAlreadyReferredBy: me.referredBy,
      claimantHasPaidOrder: [...mockStore.orders.values()].some((o) => o.userId === auth.userId && o.status === "PAID"),
    });
    if (!decision.ok) return no(decision.reason);
    me.referredBy = referrer!.id;
    mockStore.recordReferral({
      id: crypto.randomUUID(),
      referrerId: referrer!.id,
      referredId: auth.userId,
      referralCodeUsed: code,
      firstPurchaseOrderId: null,
      payoutStatus: "PENDING",
      creditsPaise: 0,
      createdAt: new Date().toISOString(),
    });
    return NextResponse.json({ linked: true });
  }

  const { getSupabaseAdmin } = await import("@/lib/supabaseClient");
  const db = getSupabaseAdmin();
  const [{ data: referrer }, { data: me }, { count: paidCount, error: paidError }] = await Promise.all([
    db.from("profiles").select("id").eq("referral_code", code).maybeSingle(),
    db.from("profiles").select("referred_by").eq("id", auth.userId).maybeSingle(),
    db.from("orders").select("id", { count: "exact", head: true }).eq("user_id", auth.userId).eq("status", "PAID"),
  ]);
  // If we couldn't read the customer's own records, try again on a later page.
  if (!me || paidError) {
    return NextResponse.json({ linked: false, reason: "try_later", final: false }, { status: 503 });
  }

  const decision = decideClaim({
    claimantId: auth.userId,
    referrerId: referrer?.id ?? null,
    claimantAlreadyReferredBy: me.referred_by,
    claimantHasPaidOrder: (paidCount ?? 0) > 0,
  });
  if (!decision.ok) return no(decision.reason);

  // The referrals table allows one row per customer, so two tabs racing
  // here can't both win: the second insert is refused.
  const { data: row, error: insertError } = await db
    .from("referrals")
    .insert({ referrer_id: referrer!.id, referred_id: auth.userId, referral_code_used: code })
    .select("id")
    .single();
  if (insertError || !row) {
    if (insertError?.code === "23505") return no("already_referred");
    console.error("[Tressform] referral claim: could not save the link.", insertError);
    return NextResponse.json({ linked: false, reason: "try_later", final: false }, { status: 500 });
  }

  // create-order reads profiles.referred_by to mark the first purchase as referred.
  const { data: updated, error: updateError } = await db
    .from("profiles")
    .update({ referred_by: referrer!.id })
    .eq("id", auth.userId)
    .is("referred_by", null)
    .select("id");
  if (updateError || !updated?.length) {
    await db.from("referrals").delete().eq("id", row.id);
    if (updateError) {
      console.error("[Tressform] referral claim: could not mark the profile.", updateError);
      return NextResponse.json({ linked: false, reason: "try_later", final: false }, { status: 500 });
    }
    return no("already_referred");
  }

  return NextResponse.json({ linked: true });
}
