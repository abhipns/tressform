import { describe, expect, it, beforeAll } from "vitest";

beforeAll(() => {
  process.env.PAYU_SALT = "test-salt";
});

describe("pay-from-another-phone links", async () => {
  const { makeHandoffToken, readHandoffToken, HANDOFF_MINUTES } = await import("../lib/payHandoff");
  const order = "0f8fad5b-d9cb-469f-a165-70867728950e";

  it("reads back what it signed", () => {
    const t = makeHandoffToken({ orderId: order, phone: "9876543210" })!;
    expect(readHandoffToken(t)).toEqual({ orderId: order, phone: "9876543210" });
  });

  it("refuses a changed or made-up link", () => {
    const t = makeHandoffToken({ orderId: order, phone: "9876543210" })!;
    const [body, mac] = t.split(".");
    const other = Buffer.from(JSON.stringify({ o: order, p: "9999999999", x: 9999999999 })).toString("base64url");
    expect(readHandoffToken(`${other}.${mac}`)).toBeNull();
    expect(readHandoffToken(`${body}.x${mac.slice(1)}`)).toBeNull();
    expect(readHandoffToken("nonsense")).toBeNull();
    expect(readHandoffToken(null)).toBeNull();
  });

  it("expires", () => {
    const t = makeHandoffToken({ orderId: order, phone: "9876543210" }, 0)!;
    expect(readHandoffToken(t, (HANDOFF_MINUTES * 60 + 5) * 1000)).toBeNull();
    expect(readHandoffToken(t, (HANDOFF_MINUTES * 60 - 5) * 1000)).not.toBeNull();
  });
});
