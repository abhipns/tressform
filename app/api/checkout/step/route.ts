// /api/checkout/step — the browser reports a checkout step (27.10.2026; see
// lib/checkoutSteps.ts). Only "opened" and "phone" come from here; "pay"
// and the PayU returns are recorded by the server itself, so they can't be
// faked. No login needed; nothing personal is sent or kept.

import { NextRequest, NextResponse } from "next/server";
import { BROWSER_STEPS, type CheckoutStep } from "@/lib/checkoutSteps";
import { recordCheckoutStep } from "@/lib/checkoutEvents";
import { looksLikeRobot } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (looksLikeRobot(req.headers.get("user-agent"))) return new NextResponse(null, { status: 204 });
  const body = (await req.json().catch(() => ({}))) as { visitor?: unknown; step?: unknown };
  const step = body.step as CheckoutStep;
  if (!BROWSER_STEPS.includes(step)) return new NextResponse(null, { status: 204 });
  await recordCheckoutStep(body.visitor, step);
  return new NextResponse(null, { status: 204 });
}
