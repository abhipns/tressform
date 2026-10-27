// Tressform — recording the checkout steps (27.10.2026; the steps and why
// are in lib/checkoutSteps.ts). Kept in the private checkout_events table:
// the anonymous visitor id, the step, and the order once there is one.
// Best-effort: a checkout never fails over tracking, and before the
// database step is run nothing is recorded.
//
// Server-only.

import { SUPABASE_MOCK_MODE } from "./serverAuth";
import { mockStore } from "./mockStore";
import { CHECKOUT_STEPS, VISITOR_ID, type CheckoutStep } from "./checkoutSteps";

export async function recordCheckoutStep(
  visitor: unknown,
  step: CheckoutStep,
  extra: { userId?: string | null; orderId?: string | null } = {}
): Promise<void> {
  const v = typeof visitor === "string" && VISITOR_ID.test(visitor) ? visitor : null;
  if (!CHECKOUT_STEPS.includes(step)) return;
  if (!v && !extra.orderId) return;
  const row = { visitor: v, step, user_id: extra.userId ?? null, order_id: extra.orderId ?? null };
  if (SUPABASE_MOCK_MODE) {
    mockStore.checkoutEvents.push({ ...row, created_at: new Date().toISOString() });
    return;
  }
  try {
    const { getSupabaseAdmin } = await import("./supabaseClient");
    const { error } = await getSupabaseAdmin().from("checkout_events").insert(row);
    if (error) console.error(`[Tressform] checkout step "${step}" not recorded:`, error.message);
  } catch (err) {
    console.error(`[Tressform] checkout step "${step}" not recorded:`, (err as Error)?.message ?? err);
  }
}

/** Back from PayU: recorded for the visitor who pressed Pay for this order. */
export async function recordPayuReturn(orderId: string, paid: boolean): Promise<void> {
  const step: CheckoutStep = paid ? "return_success" : "return_fail";
  if (SUPABASE_MOCK_MODE) {
    const pay = mockStore.checkoutEvents.find((e) => e.order_id === orderId && e.step === "pay");
    await recordCheckoutStep(pay?.visitor ?? null, step, { orderId, userId: pay?.user_id ?? null });
    return;
  }
  try {
    const { getSupabaseAdmin } = await import("./supabaseClient");
    const { data } = await getSupabaseAdmin()
      .from("checkout_events")
      .select("visitor, user_id")
      .eq("order_id", orderId)
      .eq("step", "pay")
      .limit(1)
      .maybeSingle();
    await recordCheckoutStep(data?.visitor ?? null, step, { orderId, userId: data?.user_id ?? null });
  } catch (err) {
    console.error("[Tressform] PayU return not recorded:", (err as Error)?.message ?? err);
  }
}

/** The steps recorded since a time, for the dashboard. */
export async function checkoutEventsSince(sinceIso: string): Promise<{ visitor: string | null; step: string }[]> {
  if (SUPABASE_MOCK_MODE) return mockStore.checkoutEvents.filter((e) => e.created_at >= sinceIso);
  const { getSupabaseAdmin } = await import("./supabaseClient");
  const { data, error } = await getSupabaseAdmin()
    .from("checkout_events")
    .select("visitor, step")
    .gte("created_at", sinceIso)
    .limit(100000);
  if (error) return [];
  return data ?? [];
}
