// Tressform — WhatsApp numbers (15.10.2026, owner's request).
//
// For now the site only COLLECTS numbers, from people who tick a box
// saying yes. Nothing is sent yet: the owner will switch on sending
// (MSG91, lib/integrations/msg91.ts) once there is traffic. The numbers
// and each person's consent are kept in whatsapp_contacts.
//
// WhatsApp's rule: a business may only message people who chose to hear
// from it, so the box is never ticked in advance and the exact words the
// person agreed to are saved with their number.

export const WHATSAPP_CONSENT =
  "Send me new hairstyles, hair products and blog posts from Tressform on WhatsApp. I can stop them at any time.";

export const WHATSAPP_SOURCES = ["results", "checkout", "blog", "trivia"] as const;
export type WhatsAppSource = (typeof WHATSAPP_SOURCES)[number];

/** An Indian mobile number as +91 and 10 digits, or null. Accepts +91, 0, spaces and dashes. */
export function cleanIndianMobile(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let d = raw.replace(/\D/g, "");
  if (d.length === 13 && d.startsWith("091")) d = d.slice(3);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? `+91${d}` : null;
}

/** Most new numbers taken in one hour, across the whole site: a brake on robots filling the list. */
export const NEW_CONTACTS_PER_HOUR = 300;

/** One line of the owner's CSV download, with quotes doubled. */
export function csvRow(cells: (string | null | undefined)[]): string {
  return cells.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",");
}
