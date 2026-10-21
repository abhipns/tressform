import { describe, expect, it } from "vitest";
import {
  checkAll,
  checkStep1,
  checkStep2,
  checkStep3,
  cleanInstagram,
  emptySalonForm,
  fromSalonRow,
  mapsUrlFor,
  mapsUrlOk,
  parsePrice,
  salonSlug,
  toSalonRow,
  type SalonForm,
} from "../lib/salons";

const USER = "11111111-2222-3333-4444-555555555555";

function filled(): SalonForm {
  return {
    ...emptySalonForm(),
    name: "Looks Unisex Salon",
    ownerManagerName: "Ravi Kumar",
    mobile: "98765 43210",
    city: "Noida",
    area: "Sector 18",
    address: "Shop 12, Main Market, Sector 18, Noida",
    mapsUrl: "https://maps.app.goo.gl/AbCdEf123",
    customerTypes: ["MEN", "UNISEX"],
    marketTier: "Premium",
    services: ["HAIRCUT", "HAIR_COLOUR"],
    specialities: ["FADE", "CURLY_HAIR"],
    priceMen: "350",
    images: [
      { type: "EXTERIOR", path: `${USER}/abc123def.jpg` },
      { type: "INTERIOR", path: `${USER}/abc124def.jpg` },
      { type: "PORTFOLIO", path: `${USER}/abc125def.jpg` },
    ],
  };
}

describe("salon onboarding checks", () => {
  it("passes a complete salon", () => {
    expect(checkAll(filled(), USER)).toEqual({});
  });

  it("step 1 needs the basics, a real mobile number and a Maps link", () => {
    const e = checkStep1({ ...emptySalonForm(), mobile: "12345", mapsUrl: "https://example.com/x" });
    expect(Object.keys(e).sort()).toEqual(["address", "area", "city", "mapsUrl", "mobile", "name", "ownerManagerName"].sort());
  });

  it("accepts the usual Google Maps links, and the one 'Locate my salon' makes", () => {
    for (const u of [
      "https://maps.app.goo.gl/AbCdEf123",
      "https://www.google.com/maps/place/Looks+Salon/@28.57,77.32,17z",
      "https://goo.gl/maps/xyz",
      "https://maps.google.com/?cid=123",
      "https://www.google.co.in/maps/place/x",
      mapsUrlFor(28.5701, 77.3219),
    ])
      expect(mapsUrlOk(u), u).toBe(true);
    for (const u of ["http://maps.app.goo.gl/x", "https://evil.com/maps", "not a link", "https://goo.gl/abc"]) expect(mapsUrlOk(u), u).toBe(false);
  });

  it("step 2 needs who they serve, a salon type and a service", () => {
    const e = checkStep2({ ...emptySalonForm(), priceMen: "abc" });
    expect(Object.keys(e).sort()).toEqual(["customerTypes", "marketTier", "priceMen", "services"].sort());
    expect(checkStep2({ ...filled(), marketTier: "Gold plan" }).marketTier).toBeDefined();
  });

  it("step 3 needs the outside, inside and work photos", () => {
    const f = filled();
    expect(checkStep3({ ...f, images: f.images.slice(0, 2) }, USER).image_PORTFOLIO).toBeDefined();
    // A photo from someone else's folder is refused.
    const other = { ...f, images: [...f.images.slice(0, 2), { type: "PORTFOLIO" as const, path: "99999999-2222-3333-4444-555555555555/abc125def.jpg" }] };
    expect(checkStep3(other, USER).images).toBeDefined();
  });

  it("cleans Instagram names and prices", () => {
    expect(cleanInstagram("@looks.salon")).toBe("looks.salon");
    expect(cleanInstagram("https://www.instagram.com/looks.salon/?hl=en")).toBe("looks.salon");
    expect(cleanInstagram("not valid!")).toBeNull();
    expect(parsePrice("₹ 1,200")).toBe(1200);
    expect(parsePrice("")).toBeNull();
    expect(Number.isNaN(parsePrice("12.5"))).toBe(true);
  });

  it("makes a tidy web address", () => {
    expect(salonSlug("Looks Unisex Salon!", "Sector 18", "a1b2")).toBe("looks-unisex-salon-sector-18-a1b2");
  });

  it("stores structured values, and reads them back into the form", () => {
    const row = toSalonRow({ ...filled(), whatsappSame: true, instagram: "@looks.salon" });
    expect(row.mobile).toBe("+919876543210");
    expect(row.whatsapp).toBe("+919876543210");
    expect(row.customer_types).toEqual(["MEN", "UNISEX"]);
    expect(row.specialities).toEqual(["FADE", "CURLY_HAIR"]);
    expect(row.price_men_rupees).toBe(350);
    expect(row.price_women_rupees).toBeNull();
    expect(row.instagram_handle).toBe("looks.salon");
    const back = fromSalonRow({ ...row, slug: "x" }, [{ image_type: "EXTERIOR", storage_path: "p" }], []);
    expect(back.mobile).toBe("9876543210");
    expect(back.whatsappSame).toBe(true);
    expect(back.images).toEqual([{ type: "EXTERIOR", path: "p" }]);
  });
});
