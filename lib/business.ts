// Tressform — who runs the site and how to reach them.
//
// One place for the details that a customer, a payment gateway reviewer and
// the law all expect to find on the site: the operator's name, a support
// email, a phone number and a postal address. The Contact page, the footer
// and the three legal pages all read from here, so a change is one edit.
//
// 10.10.2026: name, email and phone supplied by the owner. Tressform is run
// by an individual (no registered company, no GST registration yet).
//   - address: one display line per "\n". No comma at the end of a line —
//     the footer joins the lines with ", ". If it is ever emptied, every
//     page simply leaves the address out.
//   - GSTIN is empty for the same reason; see GST_REGISTERED in
//     lib/pricing.ts, which controls the GST wording on prices.

export const BUSINESS = {
  brand: "Tressform",
  operator: "Abhishek Sharma",
  supportEmail: "support@tressform.co.in",
  phoneDisplay: "+91 78270 76770",
  phoneHref: "+917827076770",
  // 12.10.2026: worded exactly as on the PayU agreement (registered office).
  address: "H No. 38-39, Ground Floor, Pocket-10, Sector-21\nRohini, Sultanpuri C Block, North West Delhi\nDelhi - 110086, India",
  gstin: "",
  /** Shown as "Last updated" on the legal pages. Change it whenever their wording changes. */
  legalLastUpdated: "12 October 2026",
} as const;

/** "Tressform is operated by Abhishek Sharma." */
export const OPERATOR_LINE = `${BUSINESS.brand} is operated by ${BUSINESS.operator}.`;

/** The postal address split into display lines; an empty list while no address is set. */
export function addressLines(): string[] {
  return (BUSINESS.address as string)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}
