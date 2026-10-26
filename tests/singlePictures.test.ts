import { describe, expect, it } from "vitest";
import {
  FULL_LOOK_PRICE_PAISE,
  PICTURE_PRICE_PAISE,
  PICTURE_REFERRAL_CREDITS_PAISE,
  PACK_TIERS,
  REFERRAL_CREDITS_BY_TIER_PAISE,
  calculatePicturePnl,
  calculateReferralCreditsPaise,
  priceForPictures,
} from "../lib/pricing";
import { mockStore, type MockOrder } from "../lib/mockStore";
import { viewState } from "../lib/pictures";

describe("single-picture prices (26.10.2026)", () => {
  it("front ₹25, each side and the back ₹15, Full look ₹70", () => {
    expect(PICTURE_PRICE_PAISE).toEqual({ front: 2500, left: 1500, right: 1500, back: 1500 });
    expect(FULL_LOOK_PRICE_PAISE).toBe(7000);
    expect(priceForPictures(["front"])).toEqual({ ok: true, views: ["front"], pricePaise: 2500, fullLook: false });
    expect(priceForPictures(["front", "left", "right", "back"])).toEqual({
      ok: true,
      views: ["front", "left", "right", "back"],
      pricePaise: 7000,
      fullLook: true,
    });
  });

  it("leaves the packs exactly as they were", () => {
    expect(PACK_TIERS.STARTER.earlyBirdPricePaise).toBe(19_900);
    expect(PACK_TIERS.STYLE.earlyBirdPricePaise).toBe(39_900);
    expect(REFERRAL_CREDITS_BY_TIER_PAISE.STARTER).toBe(2_000);
    expect(REFERRAL_CREDITS_BY_TIER_PAISE.STYLE).toBe(4_000);
  });

  it("P&L uses ₹3.50 × 1.2 per picture and the 2.36% gateway fee", () => {
    const front = calculatePicturePnl(2500, 1);
    expect(front.generationCostPaise).toBe(420);
    expect(front.gatewayFeePaise).toBe(59);
    expect(front.gstPaise).toBe(0);
    expect(front.profitBeforeReferralPaise).toBe(2500 - 420 - 59);
    const full = calculatePicturePnl(7000, 4);
    expect(full.generationCostPaise).toBe(1680);
    expect(full.gatewayFeePaise).toBe(165);
  });
});

describe("adding a view later", () => {
  it("charges only the new view, at ₹15", () => {
    expect(priceForPictures(["back"], ["front"])).toEqual({ ok: true, views: ["back"], pricePaise: 1500, fullLook: false });
    expect(priceForPictures(["left", "right"], ["front", "back"])).toMatchObject({ ok: true, pricePaise: 3000 });
  });

  it("never charges twice for a view already owned", () => {
    // Front owned, then "Full look": only the three missing views, not ₹70.
    expect(priceForPictures(["front", "left", "right", "back"], ["front"])).toEqual({
      ok: true,
      views: ["left", "right", "back"],
      pricePaise: 4500,
      fullLook: false,
    });
    expect(priceForPictures(["front"], ["front"]).ok).toBe(false);
  });

  it("needs the front first: sides and back are made from it", () => {
    expect(priceForPictures(["back"]).ok).toBe(false);
    expect(priceForPictures(["front", "back"])).toMatchObject({ ok: true, pricePaise: 4000 });
  });

  it("ignores unknown views", () => {
    expect(priceForPictures(["front", "top", "front"])).toMatchObject({ ok: true, views: ["front"], pricePaise: 2500 });
    expect(priceForPictures([]).ok).toBe(false);
  });
});

describe("referral credit", () => {
  it("is 0 for single pictures", () => {
    expect(PICTURE_REFERRAL_CREDITS_PAISE).toBe(0);
    // Picture orders are saved with no pack (tier null), which never earns referral credit.
    expect(calculateReferralCreditsPaise(null, true)).toBe(0);
  });
});

function pictureOrder(id: string, userId: string, views: MockOrder["pictureViews"]): MockOrder {
  return mockStore.createOrder({
    id,
    userId,
    tier: null,
    addonKind: null,
    addonPhotoCount: 0,
    pricePaise: 2500,
    gstPaise: 0,
    generationCostPaise: 420,
    gatewayFeePaise: 59,
    profitBeforeReferralPaise: 2021,
    isReferredFirstPurchase: false,
    referralCreditsPaise: 0,
    status: "PAID",
    razorpayOrderId: `mock_${id}`,
    razorpayPaymentId: null,
    createdAt: new Date().toISOString(),
    paidAt: new Date().toISOString(),
    previewCount: 0,
    previewsUsed: 0,
    orderKind: "PICTURES",
    pictureStyleId: "m-textured-crop",
    picturePhotoId: "photo-1",
    pictureViews: views,
  });
}

describe("paid views (demo store, same rules as the database)", () => {
  it("records each paid view once, and a view paid twice as a duplicate", () => {
    pictureOrder("o-1", "u-1", ["front"]);
    expect(mockStore.grantPictureViews("o-1")).toBe(1);
    pictureOrder("o-2", "u-1", ["front", "back"]);
    expect(mockStore.grantPictureViews("o-2")).toBe(1);
    expect(mockStore.pictureViews.get("o-2:front")?.status).toBe("DUPLICATE");
    expect(mockStore.ownedPictureViews("u-1", "photo-1", "m-textured-crop").map((v) => v.view).sort()).toEqual(["back", "front"]);
  });

  it("a failed picture can be tried again; the third failure marks it for refund", () => {
    pictureOrder("o-3", "u-2", ["front"]);
    mockStore.grantPictureViews("o-3");
    for (let i = 1; i <= 3; i++) {
      expect(mockStore.reservePictureView("u-2", "photo-1", "m-textured-crop", "front")).toBe("o-3");
      expect(mockStore.finishPictureView("o-3", "front", false, null)).toBe(i < 3 ? "READY" : "REFUND_DUE");
    }
    expect(mockStore.reservePictureView("u-2", "photo-1", "m-textured-crop", "front")).toBeNull();
    expect(viewState(mockStore.ownedPictureViews("u-2", "photo-1", "m-textured-crop"), "front")).toBe("refund");
  });

  it("only paid views are made; the rest stay locked", () => {
    pictureOrder("o-4", "u-3", ["front"]);
    mockStore.grantPictureViews("o-4");
    expect(mockStore.reservePictureView("u-3", "photo-1", "m-textured-crop", "back")).toBeNull();
    const rows = mockStore.ownedPictureViews("u-3", "photo-1", "m-textured-crop");
    expect(viewState(rows, "front")).toBe("ready");
    expect(viewState(rows, "back")).toBe("locked");
    mockStore.reservePictureView("u-3", "photo-1", "m-textured-crop", "front");
    mockStore.finishPictureView("o-4", "front", true, "https://example.com/front.jpg");
    expect(viewState(mockStore.ownedPictureViews("u-3", "photo-1", "m-textured-crop"), "front")).toBe("done");
  });
});
