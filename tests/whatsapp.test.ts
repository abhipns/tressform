import { describe, expect, it } from "vitest";
import { cleanIndianMobile, csvRow } from "../lib/whatsapp";

describe("WhatsApp numbers", () => {
  it("accepts the ways people type an Indian mobile number", () => {
    for (const typed of ["9876543210", "+91 98765 43210", "091-9876543210", "09876543210", "919876543210"]) {
      expect(cleanIndianMobile(typed)).toBe("+919876543210");
    }
  });
  it("refuses landlines, short numbers and other countries", () => {
    for (const typed of ["5876543210", "987654321", "+44 7911 123456", "", "abc"]) {
      expect(cleanIndianMobile(typed)).toBeNull();
    }
    expect(cleanIndianMobile(9876543210 as unknown)).toBeNull();
  });
  it("writes CSV cells safely", () => {
    expect(csvRow(["+919876543210", 'Ravi "R" Kumar', null])).toBe('"+919876543210","Ravi ""R"" Kumar",""');
  });
});
