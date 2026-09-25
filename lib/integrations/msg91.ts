// Tressform — MSG91 integration (email + WhatsApp Business API, one vendor,
// one API — chosen for Trivia/blog notifications per Part J).
//
// MOCK MODE: when MSG91_AUTH_KEY is absent, both send functions "succeed"
// immediately, log to the console, and return a fake provider message id
// instead of calling the real MSG91 API.

const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_WHATSAPP_NUMBER = process.env.MSG91_WHATSAPP_NUMBER;

export const MSG91_MOCK_MODE = !MSG91_AUTH_KEY;

export interface SendResult {
  status: "SENT" | "FAILED";
  providerMessageId: string | null;
  errorMessage?: string;
  mock: boolean;
}

export interface SendEmailParams {
  to: string;
  templateId: string;
  variables?: Record<string, string>;
}

export interface SendWhatsAppParams {
  to: string; // E.164, e.g. +91XXXXXXXXXX
  templateName: string;
  variables?: Record<string, string>;
}

export async function sendEmail(params: SendEmailParams): Promise<SendResult> {
  if (MSG91_MOCK_MODE) {
    console.log(`[Tressform][mock][msg91-email] to=${params.to} template=${params.templateId}`, params.variables ?? {});
    return { status: "SENT", providerMessageId: `mock_email_${Date.now()}`, mock: true };
  }

  // Real implementation (MSG91 Email API, https://api.msg91.com/api/v5/email/send):
  //
  // const res = await fetch("https://api.msg91.com/api/v5/email/send", {
  //   method: "POST",
  //   headers: { authkey: MSG91_AUTH_KEY!, "Content-Type": "application/json" },
  //   body: JSON.stringify({ to: [{ email: params.to }], template_id: params.templateId, variables: params.variables }),
  // });
  // const data = await res.json();
  // return { status: res.ok ? "SENT" : "FAILED", providerMessageId: data.messageId ?? null, mock: false };

  throw new Error("MSG91_MOCK_MODE is false but the real MSG91 email call is not wired up yet.");
}

export async function sendWhatsApp(params: SendWhatsAppParams): Promise<SendResult> {
  if (MSG91_MOCK_MODE) {
    console.log(`[Tressform][mock][msg91-whatsapp] to=${params.to} template=${params.templateName}`, params.variables ?? {});
    return { status: "SENT", providerMessageId: `mock_whatsapp_${Date.now()}`, mock: true };
  }

  // Real implementation (MSG91 WhatsApp Business API):
  //
  // const res = await fetch("https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/", {
  //   method: "POST",
  //   headers: { authkey: MSG91_AUTH_KEY!, "Content-Type": "application/json" },
  //   body: JSON.stringify({
  //     integrated_number: MSG91_WHATSAPP_NUMBER,
  //     content_type: "template",
  //     payload: { to: params.to, type: "template", template: { name: params.templateName, ... } },
  //   }),
  // });
  // ...

  throw new Error("MSG91_MOCK_MODE is false but the real MSG91 WhatsApp call is not wired up yet.");
}
