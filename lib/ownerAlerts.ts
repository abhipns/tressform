// Tressform — messages to the site owner (20.10.2026, owner's request).
//
// Used for things the owner must act on quickly, such as the fal.ai balance
// running low (lib/falBalance.ts). Each message goes out by email and by
// WhatsApp; either one may be left unset, and a failure on one never stops
// the other.
//
// Settings (Vercel → Settings → Environment Variables). The owner's email
// address and phone number live ONLY here, never in the code, because the
// code is on GitHub for anyone to read.
//
//   EMAIL — sent from the owner's own Gmail account to the owner:
//     ALERT_EMAIL_TO        where alerts go, e.g. you@gmail.com
//     GMAIL_USER            the Gmail address that sends them
//     GMAIL_APP_PASSWORD    a Gmail "app password" (Google account →
//                           Security → 2-Step Verification → App passwords).
//                           Not the normal Gmail password.
//
//   WHATSAPP — through CallMeBot, a free service for sending WhatsApp
//   messages to your OWN number (https://www.callmebot.com/blog/free-api-whatsapp-messages/).
//   One-time set-up: save the bot's number shown on that page in your
//   phone's contacts, send it the WhatsApp message "I allow callmebot to send
//   me messages", and it replies with an API key. (On 20.10.2026 the page
//   said the bot was full and hid the number; it shows it again when there
//   is room.) Then set:
//     ALERT_WHATSAPP        your number with country code, e.g. +91XXXXXXXXXX
//     CALLMEBOT_API_KEY     the key CallMeBot sent you
//   CallMeBot is fine for the owner's own alerts. Messages to CUSTOMERS will
//   go through a proper WhatsApp Business account (MSG91) later.
//
// Server-only.

export interface AlertResult {
  email: "sent" | "off" | "failed";
  whatsapp: "sent" | "off" | "failed";
}

/** Whether any way of reaching the owner is set up. */
export function ownerAlertsConfigured(): boolean {
  return emailConfigured() || whatsappConfigured();
}

function emailConfigured(): boolean {
  return Boolean(process.env.ALERT_EMAIL_TO?.trim() && process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
}

function whatsappConfigured(): boolean {
  return Boolean(process.env.ALERT_WHATSAPP?.trim() && process.env.CALLMEBOT_API_KEY?.trim());
}

/** Send one alert to the owner by every channel that is set up. Never throws. */
export async function sendOwnerAlert(subject: string, text: string): Promise<AlertResult> {
  const [email, whatsapp] = await Promise.all([sendEmail(subject, text), sendWhatsApp(`${subject}\n\n${text}`)]);
  if (email === "off" && whatsapp === "off") {
    console.warn(`[Tressform] Owner alert not sent (no email or WhatsApp set up in Vercel): ${subject}`);
  }
  return { email, whatsapp };
}

async function sendEmail(subject: string, text: string): Promise<AlertResult["email"]> {
  if (!emailConfigured()) return "off";
  try {
    const nodemailer = (await import("nodemailer")).default;
    const user = process.env.GMAIL_USER!.trim();
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
    });
    await transport.sendMail({
      from: `Tressform alerts <${user}>`,
      to: process.env.ALERT_EMAIL_TO!.trim(),
      subject: `[Tressform] ${subject}`,
      text,
    });
    return "sent";
  } catch (err) {
    console.error("[Tressform] Owner alert email failed:", (err as Error)?.message ?? err);
    return "failed";
  }
}

async function sendWhatsApp(text: string): Promise<AlertResult["whatsapp"]> {
  if (!whatsappConfigured()) return "off";
  try {
    const url = new URL("https://api.callmebot.com/whatsapp.php");
    url.searchParams.set("phone", process.env.ALERT_WHATSAPP!.replace(/[^\d+]/g, ""));
    url.searchParams.set("text", text.slice(0, 900));
    url.searchParams.set("apikey", process.env.CALLMEBOT_API_KEY!.trim());
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const body = await res.text();
    // CallMeBot answers 200 with a page of text; a refusal says so in it.
    if (!res.ok || /error|apikey is invalid|not allowed/i.test(body)) {
      console.error(`[Tressform] Owner alert WhatsApp failed (HTTP ${res.status}): ${body.replace(/<[^>]+>/g, " ").slice(0, 200)}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[Tressform] Owner alert WhatsApp failed:", (err as Error)?.message ?? err);
    return "failed";
  }
}
