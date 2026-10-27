import { describe, expect, it } from "vitest";
import { BROWSER_STEPS, CHECKOUT_STEPS, afterPayuPath, checkoutFunnel, cleanEmail, payerEmail } from "../lib/checkoutSteps";
import { resultsKey, resultsKeyOk, resultsLink } from "../lib/resultsLink";
import { resultsEmailText } from "../lib/resultsEmail";
import { FRONT_OFFER, FULL_OFFER, pictureCheckoutLink } from "../lib/pictureOffer";

describe("paying without an account (27.10.2026)", () => {
  it("gives PayU the account's email, else the one typed, else the support address", () => {
    expect(payerEmail("me@shop.in", "other@x.com", "support@tressform.co.in")).toBe("me@shop.in");
    expect(payerEmail(null, " Asha@Example.COM ", "support@tressform.co.in")).toBe("asha@example.com");
    expect(payerEmail(null, "", "support@tressform.co.in")).toBe("support@tressform.co.in");
    expect(payerEmail(undefined, "not-an-email", "support@tressform.co.in")).toBe("support@tressform.co.in");
  });

  it("accepts only real-looking email addresses", () => {
    expect(cleanEmail("a@b.co")).toBe("a@b.co");
    expect(cleanEmail("a@b")).toBeNull();
    expect(cleanEmail("a b@c.com")).toBeNull();
    expect(cleanEmail(42)).toBeNull();
    expect(cleanEmail(`${"x".repeat(200)}@a.com`)).toBeNull();
  });

  it("sends a failed single-picture payment to its results page, a failed pack back to checkout", () => {
    expect(afterPayuPath({ orderId: "o1", tier: null, status: "FAILED" })).toBe("/results/o1");
    expect(afterPayuPath({ orderId: "o1", tier: "STARTER", status: "FAILED" })).toBe("/checkout?tier=STARTER&payment=failed");
    expect(afterPayuPath({ orderId: "o1", tier: "STARTER", status: "PAID" })).toBe("/results/o1");
    expect(afterPayuPath({ orderId: "o1", tier: null, status: "PENDING" })).toBe("/results/o1");
  });
});

describe("the private link to a buyer's results", () => {
  it("opens only that order and can't be guessed", () => {
    const key = resultsKey("order-1", "secret");
    expect(key).toMatch(/^[0-9a-f]{40}$/);
    expect(resultsKeyOk("order-1", key, "secret")).toBe(true);
    expect(resultsKeyOk("order-2", key, "secret")).toBe(false);
    expect(resultsKeyOk("order-1", key, "another-secret")).toBe(false);
    expect(resultsKeyOk("order-1", "0".repeat(40), "secret")).toBe(false);
    expect(resultsKeyOk("order-1", null, "secret")).toBe(false);
  });

  it("is a results page address with the key", () => {
    expect(resultsLink("https://www.tressform.co.in/", "abc")).toMatch(/^https:\/\/www\.tressform\.co\.in\/results\/abc\?k=[0-9a-f]{40}$/);
  });

  it("says whether the email's link signs them in or only shows the looks", () => {
    expect(resultsEmailText("https://x", true)).toContain("signs you in");
    expect(resultsEmailText("https://x", false)).toContain("private link");
    expect(resultsEmailText("https://x", false)).toContain("https://x");
  });
});

describe("checkout steps funnel", () => {
  it("counts different visitors per step, ignoring repeats and unknown steps", () => {
    const funnel = checkoutFunnel([
      { visitor: "visitor-aaaa", step: "opened" },
      { visitor: "visitor-aaaa", step: "opened" },
      { visitor: "visitor-bbbb", step: "opened" },
      { visitor: "visitor-aaaa", step: "phone" },
      { visitor: "visitor-aaaa", step: "pay" },
      { visitor: "visitor-aaaa", step: "return_success" },
      { visitor: null, step: "opened" },
      { visitor: "visitor-cccc", step: "hacked" },
    ]);
    expect(funnel.map((f) => [f.step, f.visitors])).toEqual([
      ["opened", 2],
      ["phone", 1],
      ["pay", 1],
      ["return_success", 1],
      ["return_fail", 0],
    ]);
  });

  it("lets the browser report only 'opened' and 'phone'; Pay and PayU's answer are recorded by the server", () => {
    expect(BROWSER_STEPS).toEqual(["opened", "phone"]);
    expect(CHECKOUT_STEPS).toContain("pay");
  });
});

describe("the ₹25 front view is the main offer", () => {
  it("reads as the owner asked, priced from lib/pricing.ts", () => {
    expect(FRONT_OFFER).toBe("See it on your face – ₹25");
    expect(FULL_OFFER).toBe("Full look ₹70 (best value)");
    expect(pictureCheckoutLink("m-buzz-cut", "p1", "front")).toBe("/checkout?style=m-buzz-cut&photo=p1&views=front");
  });
});
