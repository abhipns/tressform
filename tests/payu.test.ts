import { describe, it, expect, beforeAll, vi } from "vitest";
import crypto from "crypto";

const sha512 = (s: string) => crypto.createHash("sha512").update(s).digest("hex");
type Payu = typeof import("../lib/integrations/payu");
let payu: Payu;

beforeAll(async () => {
  vi.stubEnv("PAYU_KEY", "TESTKEY");
  vi.stubEnv("PAYU_SALT", "TESTSALT");
  vi.stubEnv("PAYU_MODE", "test");
  vi.resetModules();
  payu = await import("../lib/integrations/payu");
});

describe("PayU", () => {
  it("uses the test environment unless PAYU_MODE=live", () => {
    expect(payu.PAYU_MOCK_MODE).toBe(false);
    expect(payu.PAYU_LIVE).toBe(false);
    expect(payu.PAYU_PAYMENT_URL).toBe("https://test.payu.in/_payment");
  });

  it("builds the form with PayU's request hash", () => {
    const { action, fields } = payu.buildPaymentForm({
      txnid: "TX1",
      amountPaise: 19900,
      productinfo: "Tressform Starter Pack",
      firstname: "Abhishek",
      email: "a@b.in",
      phone: "9876543210",
      orderId: "11111111-2222-3333-4444-555555555555",
      surl: "https://x/r",
      furl: "https://x/r",
    });
    expect(action).toBe("https://test.payu.in/_payment");
    expect(fields.amount).toBe("199.00");
    // key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT
    const expected = sha512(
      "TESTKEY|TX1|199.00|Tressform Starter Pack|Abhishek|a@b.in|11111111-2222-3333-4444-555555555555||||||||||TESTSALT"
    );
    expect(fields.hash).toBe(expected);
    expect(fields).not.toHaveProperty("salt");
    expect(JSON.stringify(fields)).not.toContain("TESTSALT");
  });

  it("checks the response hash, with and without additional charges", () => {
    const p: Record<string, string> = {
      status: "success", txnid: "TX1", amount: "199.00", productinfo: "Tressform Starter Pack",
      firstname: "Abhishek", email: "a@b.in", udf1: "ORDER",
    };
    p.hash = sha512("TESTSALT|success||||||||||ORDER|a@b.in|Abhishek|Tressform Starter Pack|199.00|TX1|TESTKEY");
    expect(payu.responseHashOk(p)).toBe(true);
    expect(payu.responseHashOk({ ...p, amount: "1.00" })).toBe(false);
    const withCharges: Record<string, string> = { ...p, additionalCharges: "5.00" };
    withCharges.hash = sha512("5.00|TESTSALT|success||||||||||ORDER|a@b.in|Abhishek|Tressform Starter Pack|199.00|TX1|TESTKEY");
    expect(payu.responseHashOk(withCharges)).toBe(true);
  });

  it("makes transaction ids PayU accepts (≤ 25 characters, unique)", () => {
    const ids = new Set(Array.from({ length: 200 }, () => payu.newTxnId()));
    expect(ids.size).toBe(200);
    for (const id of ids) expect(id.length).toBeLessThanOrEqual(25);
  });

  it("cleans the first name for PayU", () => {
    expect(payu.cleanFirstName("Abhishek Sharma")).toBe("Abhishek");
    expect(payu.cleanFirstName("  ")).toBe("Customer");
    expect(payu.cleanFirstName(null)).toBe("Customer");
    expect(payu.cleanFirstName("O'Neil")).toBe("ONeil");
  });

  it("reads verify_payment's answer", async () => {
    const fetchMock = vi.fn(async (_url: string, init: { body: URLSearchParams }) => {
      expect(init.body.get("hash")).toBe(sha512("TESTKEY|verify_payment|TX1|TESTSALT"));
      return new Response(
        JSON.stringify({ status: 1, transaction_details: { TX1: { status: "success", amt: "199.00", mihpayid: "403993715", udf1: "ORDER" } } })
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    expect(await payu.verifyPayment("TX1")).toEqual({ status: "success", amountPaise: 19900, paymentId: "403993715", orderId: "ORDER" });
    expect(String(fetchMock.mock.calls[0][0])).toBe("https://test.payu.in/merchant/postservice.php?form=2");

    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ status: 0, msg: "0 out of 1 Transactions Fetched successfully" }))));
    expect((await payu.verifyPayment("TX1")).status).toBe("not found");
    vi.unstubAllGlobals();
  });

  it("reads PayU posts in both formats", async () => {
    const form = new Request("https://x", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: "txnid=TX1&status=success" });
    expect((await payu.readPayuPost(form)).txnid).toBe("TX1");
    const json = new Request("https://x", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ txnid: "TX2", amount: 199 }) });
    expect(await payu.readPayuPost(json)).toEqual({ txnid: "TX2", amount: "199" });
  });
});
