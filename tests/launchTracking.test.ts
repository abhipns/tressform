import { describe, expect, it } from "vitest";
import { campaignColumns, campaignFrom, cleanTag } from "../lib/campaign";
import { chromeIntentUrl, detectInApp } from "../lib/inAppBrowser";

describe("ad campaign tags", () => {
  it("reads utm tags from an ad link", () => {
    expect(campaignFrom("?utm_source=Meta&utm_campaign=diwali-men&utm_content=video1", "")).toEqual({ source: "meta", campaign: "diwali-men", content: "video1" });
  });
  it("counts an untagged Facebook / Instagram visit", () => {
    expect(campaignFrom("?fbclid=abc", "")).toEqual({ source: "meta", campaign: null, content: null });
    expect(campaignFrom("", "l.instagram.com")).toEqual({ source: "instagram", campaign: null, content: null });
    expect(campaignFrom("", "www.google.com")).toBeNull();
  });
  it("cleans what is stored", () => {
    expect(cleanTag("<script>x</script>")).toBe("scriptx/script");
    expect(campaignColumns({ source: "Meta", campaign: "a".repeat(200) }).utm_campaign).toHaveLength(80);
    expect(campaignColumns(null)).toEqual({ utm_source: null, utm_campaign: null, utm_content: null });
  });
});

describe("Instagram / Facebook in-app browsers", () => {
  it("are told apart from normal browsers", () => {
    expect(detectInApp("Mozilla/5.0 (Linux; Android 14) ... Instagram 300.0.0.0 Android")).toEqual({ app: "Instagram", os: "android" });
    expect(detectInApp("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) ... [FBAN/FBIOS;FBAV/450.0]")).toEqual({ app: "Facebook", os: "ios" });
    expect(detectInApp("Mozilla/5.0 (Linux; Android 14) Chrome/120 Mobile Safari/537.36")).toBeNull();
  });
  it("can reopen the page in Chrome on Android", () => {
    expect(chromeIntentUrl("https://www.tressform.co.in/login?next=%2F%23upload")).toBe(
      "intent://www.tressform.co.in/login?next=%2F%23upload#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=https%3A%2F%2Fwww.tressform.co.in%2Flogin%3Fnext%3D%252F%2523upload;end"
    );
  });
});
