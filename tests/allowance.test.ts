// Free previews first, then paid packs: the rules, run against the demo
// store (the real database uses the same rules as single SQL statements).

import { beforeEach, describe, expect, it } from "vitest";
import { mockPreviewsLeft, mockReleasePreview, mockReservePreview } from "../lib/allowance";
import { mockStore, type MockOrder } from "../lib/mockStore";

let n = 0;
function customer(): string {
  n += 1;
  return `test_customer_${n}`;
}

function pack(userId: string, previews: number, paidAt: string, status: MockOrder["status"] = "PAID"): MockOrder {
  return mockStore.createOrder({
    id: `order_${userId}_${paidAt}`,
    userId,
    tier: previews === 4 ? "STARTER" : "STYLE",
    addonKind: null,
    addonPhotoCount: 0,
    pricePaise: 19900,
    gstPaise: 0,
    generationCostPaise: 0,
    gatewayFeePaise: 0,
    profitBeforeReferralPaise: 0,
    isReferredFirstPurchase: false,
    referralCreditsPaise: 0,
    status,
    razorpayOrderId: `rzp_${userId}_${paidAt}`,
    razorpayPaymentId: null,
    createdAt: paidAt,
    paidAt: status === "PAID" ? paidAt : null,
    previewCount: previews,
    previewsUsed: 0,
  });
}

describe("a customer's previews", () => {
  let user: string;
  beforeEach(() => {
    user = customer();
  });

  it("start as the two free ones", () => {
    expect(mockPreviewsLeft(user)).toEqual({ free: 2, paid: 0, total: 2 });
  });

  it("run out after two when no pack has been bought", () => {
    expect(mockReservePreview(user)).toEqual({ kind: "free" });
    expect(mockReservePreview(user)).toEqual({ kind: "free" });
    expect(mockReservePreview(user)).toBeNull();
    expect(mockPreviewsLeft(user).total).toBe(0);
  });

  it("use the free ones before a pack", () => {
    const order = pack(user, 4, "2026-10-12T10:00:00Z");
    expect(mockPreviewsLeft(user)).toEqual({ free: 2, paid: 4, total: 6 });
    expect(mockReservePreview(user)).toEqual({ kind: "free" });
    expect(mockReservePreview(user)).toEqual({ kind: "free" });
    expect(mockReservePreview(user)).toEqual({ kind: "paid", orderId: order.id });
    expect(mockPreviewsLeft(user)).toEqual({ free: 0, paid: 3, total: 3 });
  });

  it("count a pack only once it is paid for", () => {
    pack(user, 10, "2026-10-12T10:00:00Z", "CREATED");
    expect(mockPreviewsLeft(user).paid).toBe(0);
    mockReservePreview(user);
    mockReservePreview(user);
    expect(mockReservePreview(user)).toBeNull();
  });

  it("use up the older pack before the newer one, and stop at the end of both", () => {
    const second = pack(user, 10, "2026-10-13T10:00:00Z");
    const first = pack(user, 4, "2026-10-12T10:00:00Z");
    mockReservePreview(user);
    mockReservePreview(user);
    const taken = Array.from({ length: 14 }, () => mockReservePreview(user));
    expect(taken.slice(0, 4).every((t) => t?.kind === "paid" && t.orderId === first.id)).toBe(true);
    expect(taken.slice(4).every((t) => t?.kind === "paid" && t.orderId === second.id)).toBe(true);
    expect(mockReservePreview(user)).toBeNull();
    expect(mockPreviewsLeft(user).total).toBe(0);
  });

  it("get a preview back when the picture fails, to the place it came from", () => {
    const order = pack(user, 4, "2026-10-12T10:00:00Z");
    const free = mockReservePreview(user)!;
    mockReleasePreview(user, free);
    expect(mockPreviewsLeft(user)).toEqual({ free: 2, paid: 4, total: 6 });
    mockReservePreview(user);
    mockReservePreview(user);
    const paid = mockReservePreview(user)!;
    expect(paid).toEqual({ kind: "paid", orderId: order.id });
    mockReleasePreview(user, paid);
    expect(mockPreviewsLeft(user)).toEqual({ free: 0, paid: 4, total: 4 });
  });
});
