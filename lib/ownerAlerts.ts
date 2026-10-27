// Tressform — messages to the site owner (20.10.2026, owner's request).
//
// Used for things the owner must act on quickly, such as the fal.ai balance
// running low (lib/falBalance.ts). Each message goes out by email, Telegram
// and WhatsApp — whichever are set up; any may be left unset, and a failure
// on one never stops the others.
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
//   TELEGRAM — 21.10.2026, owner's request: free and official. A Telegram
//   bot the owner makes himself sends the alerts to his own Telegram chat,
//   and they ring like any message. One-time set-up:
//     1. In Telegram, open @BotFather, send /newbot, give it a name (e.g.
//        "Tressform alerts") and a username ending in "bot". BotFather
//        replies with the bot's token.
//     2. Open the new bot and press Start (a bot may only message people
//        who have started it).
//     3. Open @userinfobot and press Start: it replies with your Id (digits).
//   Then set:
//     TELEGRAM_BOT_TOKEN    the token from BotFather
//     TELEGRAM_CHAT_ID      your Id from @userinfobot
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

type Outcome = "sent" | "off" | "failed";

export interface AlertResult {
  email: Outcome;
  telegram: Outcome;
  whatsapp: Outcome;
}

/** Whether any way of reaching the owner is set up. */
export function ownerAlertsConfigured(): boolean {
  return emailConfigured() || telegramConfigured() || whatsappConfigured();
}

function telegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim() && process.env.TELEGRAM_CHAT_ID?.trim());
}

function emailConfigured(): boolean {
  return Boolean(process.env.ALERT_EMAIL_TO?.trim() && process.env.GMAIL_USER?.trim() && process.env.GMAIL_APP_PASSWORD?.trim());
}

function whatsappConfigured(): boolean {
  return Boolean(process.env.ALERT_WHATSAPP?.trim() && process.env.CALLMEBOT_API_KEY?.trim());
}

/** Send one alert to the owner by every channel that is set up. Never throws. */
export async function sendOwnerAlert(subject: string, text: string): Promise<AlertResult> {
  const [email, telegram, whatsapp] = await Promise.all([
    sendEmail(subject, text),
    sendTelegram(`${subject}\n\n${text}`),
    sendWhatsApp(`${subject}\n\n${text}`),
  ]);
  if (email === "off" && telegram === "off" && whatsapp === "off") {
    console.warn(`[Tressform] Owner alert not sent (no email, Telegram or WhatsApp set up in Vercel): ${subject}`);
  }
  return { email, telegram, whatsapp };
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

async function sendTelegram(text: string): Promise<Outcome> {
  if (!telegramConfigured()) return "off";
  try {
    const token = process.env.TELEGRAM_BOT_TOKEN!.trim();
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: process.env.TELEGRAM_CHAT_ID!.trim(), text: `🔔 Tressform\n${text}`.slice(0, 4000), disable_web_page_preview: true }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    const body = (await res.json().catch(() => ({}))) as { ok?: boolean; description?: string };
    if (!res.ok || body.ok !== true) {
      // e.g. "chat not found" (the bot wasn't started) or "Unauthorized" (wrong token)
      console.error(`[Tressform] Owner alert Telegram failed (HTTP ${res.status}): ${body.description ?? ""}`);
      return "failed";
    }
    return "sent";
  } catch (err) {
    console.error("[Tressform] Owner alert Telegram failed:", (err as Error)?.message ?? err);
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

/**
 * 27.10.2026: one email to a customer (the private link to their results
 * after paying without an account; lib/resultsEmail.ts). Sent from the same
 * Gmail account as the owner's alerts. Never throws.
 */
export async function sendCustomerEmail(to: string, subject: string, text: string): Promise<"sent" | "off" | "failed"> {
  if (!process.env.GMAIL_USER?.trim() || !process.env.GMAIL_APP_PASSWORD?.trim()) return "off";
  try {
    const nodemailer = (await import("nodemailer")).default;
    const user = process.env.GMAIL_USER!.trim();
    const transport = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s+/g, "") },
    });
    await transport.sendMail({ from: `Tressform <${user}>`, replyTo: "support@tressform.co.in", to, subject, text });
    return "sent";
  } catch (err) {
    console.error("[Tressform] Customer email failed:", (err as Error)?.message ?? err);
    return "failed";
  }
}
