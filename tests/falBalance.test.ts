import { afterEach, describe, expect, it, vi } from "vitest";
import { isLowBalance, lowBalanceMessage, LOW_BALANCE_USD, readFalBalance } from "../lib/falBalance";

describe("fal.ai balance watch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("warns below $10, not at or above it", () => {
    expect(LOW_BALANCE_USD).toBe(10);
    expect(isLowBalance(9.99)).toBe(true);
    expect(isLowBalance(-0.14)).toBe(true);
    expect(isLowBalance(10)).toBe(false);
    expect(isLowBalance(25)).toBe(false);
  });

  it("says pictures have stopped when the balance is zero or below", () => {
    expect(lowBalanceMessage(-0.14, "USD").subject).toMatch(/stopped/);
    expect(lowBalanceMessage(7.5, "USD").subject).toBe("fal.ai balance is low: $7.50");
    expect(lowBalanceMessage(7.5, "USD").text).toContain("fal.ai/dashboard");
  });

  it("reads the balance from fal.ai's billing answer", async () => {
    vi.stubEnv("FAL_BILLING_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ username: "x", credits: { current_balance: 12.34, currency: "USD" } }), { status: 200 })
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(readFalBalance()).resolves.toEqual({ ok: true, balance: 12.34, currency: "USD" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toBe("https://api.fal.ai/v1/account/billing?expand=credits");
    expect(init.headers.Authorization).toBe("Key test-key");
  });

  it("explains a key without billing access", async () => {
    vi.stubEnv("FAL_BILLING_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 403 })));
    const r = await readFalBalance();
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/billing access/);
  });

  it("does nothing without a key", async () => {
    vi.stubEnv("FAL_BILLING_KEY", "");
    vi.stubEnv("FAL_AI_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const r = await readFalBalance();
    expect(r.ok).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
