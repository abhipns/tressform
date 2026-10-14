// Tressform — saving and sharing a customer's pictures, in the browser.
//
// 12.10.2026, the owner's plan for paid previews:
//   - every picture can be saved on its own (a headshot, say);
//   - "Send to my barber": the four pictures of one style plus the cutting
//     points, for WhatsApp to a barber or salon;
//   - "Share my styles": ONE picture for friends — the customer's photo and
//     up to four styles numbered for votes, with the Tressform name and web
//     address on it, and a short message. No barber instructions in it.
//
// Phones share files through the phone's own share menu (WhatsApp,
// Instagram…). Where that isn't possible (most computers), the pictures are
// downloaded instead and, for the barber, WhatsApp is opened with the text.
// Client-only.
//
// 14.10.2026 (owner: "let the customers comment on the social media comment
// section itself"): the share picture is the customer's own post — nothing
// is published by Tressform. The caption asks friends to comment a number,
// and both the caption and the picture carry the customer's referral link
// (lib/referral.ts): tappable in WhatsApp and Facebook, and as a QR code on
// the picture for Instagram, where links in posts can't be tapped.

import QRCode from "qrcode";

export const SITE_URL = "https://www.tressform.co.in";

/** Fetch a picture as a file the browser can save or share. */
export async function pictureFile(url: string, name: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`picture ${res.status}`);
  const blob = await res.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

/** Save one file to the device. */
export function saveFile(file: Blob, name: string) {
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(file);
  link.href = objectUrl;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 4000);
}

/** Save a picture by its link; if the browser won't fetch it, open it so it can be saved by hand. */
export async function savePicture(url: string, name: string) {
  try {
    saveFile(await pictureFile(url, name), name);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "hairstyle";
}

/** Can this browser share these files through the device's share menu? */
export function canShareFiles(files: File[]): boolean {
  const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean };
  return typeof nav.share === "function" && typeof nav.canShare === "function" && nav.canShare({ files });
}

/**
 * Share files with a message. Returns "shared", "cancelled" (the customer
 * closed the share menu) or "unsupported" (the caller falls back).
 */
export async function shareFiles(files: File[], text: string, title: string): Promise<"shared" | "cancelled" | "unsupported"> {
  if (!canShareFiles(files)) return "unsupported";
  try {
    await navigator.share({ files, text, title });
    return "shared";
  } catch (err) {
    return (err as Error)?.name === "AbortError" ? "cancelled" : "unsupported";
  }
}

/** The message that goes to the barber with the four pictures. */
export function barberMessage(styleName: string, cutName: string, points: string[]): string {
  return [
    `Hi, I'd like this haircut: ${styleName}`,
    `(${cutName.charAt(0).toUpperCase()}${cutName.slice(1)})`,
    ...points.map((p) => `• ${p}`),
    "Pictures of the front, both sides and the back are attached.",
  ].join("\n");
}

/** The message that goes to friends with the "Share my styles" picture. `link`: the customer's referral link. */
export function friendsMessage(count: number, link: string = SITE_URL): string {
  const choices = count <= 1 ? "" : count === 2 ? "1 or 2" : count === 3 ? "1, 2 or 3" : "1, 2, 3 or 4";
  const ask = count <= 1 ? "Should I get this haircut? Tell me in the comments 👇" : `Which haircut should I get? Comment ${choices} 👇`;
  return `${ask}\nI tried them on my own photo with Tressform. Find the haircut that suits you: ${link}`;
}

// ------------------------------------------------------------ share picture

async function loadImage(src: string): Promise<ImageBitmap | HTMLImageElement> {
  if (src.startsWith("data:")) {
    const img = new Image();
    img.src = src;
    await img.decode();
    return img;
  }
  const res = await fetch(src);
  if (!res.ok) throw new Error(`picture ${res.status}`);
  return createImageBitmap(await res.blob());
}

function drawCover(ctx: CanvasRenderingContext2D, img: ImageBitmap | HTMLImageElement, x: number, y: number, w: number, h: number, r: number) {
  const iw = img.width;
  const ih = img.height;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  // Keep the face: crop from the top third rather than the middle on tall pictures.
  const sx = (iw - sw) / 2;
  const sy = Math.max(0, Math.min(ih - sh, (ih - sh) * 0.3));
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
  ctx.restore();
}

function chip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number) {
  ctx.font = "600 26px system-ui, -apple-system, Segoe UI, sans-serif";
  const w = ctx.measureText(text).width + 30;
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.beginPath();
  ctx.roundRect(x, y, w, 46, 23);
  ctx.fill();
  ctx.fillStyle = "#16261C";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x + 15, y + 24);
}

function badge(ctx: CanvasRenderingContext2D, n: number, cx: number, cy: number) {
  ctx.fillStyle = "#C79A3D";
  ctx.beginPath();
  ctx.arc(cx, cy, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 28px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(n), cx, cy + 1);
  ctx.textAlign = "left";
}

/**
 * The "Share my styles" picture: the customer's photo on top, then up to
 * four styles numbered 1–4, "Which one should I get?", and the Tressform
 * name and web address. Made on the customer's own device; nothing extra
 * is paid for.
 */
export async function makeSharePicture(
  photo: string,
  styles: { name: string; url: string }[],
  link: string = SITE_URL
): Promise<File> {
  const W = 1080;
  const pad = 44;
  const gap = 22;
  const picked = styles.slice(0, 4);
  const cols = picked.length === 1 ? 1 : 2;
  const tileW = cols === 1 ? 640 : (W - pad * 2 - gap) / 2;
  const tileH = Math.round((tileW * 4) / 3);
  const rows = Math.ceil(picked.length / cols);
  const meW = 400;
  const meH = Math.round((meW * 4) / 3);
  const footer = 250; // the question, then the name, web address and QR code
  const H = pad + meH + gap * 2 + rows * tileH + (rows - 1) * gap + footer;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#16261C";
  ctx.fillRect(0, 0, W, H);

  const qrData = await QRCode.toDataURL(link, { margin: 1, width: 360, color: { dark: "#16261C", light: "#FFFFFF" } });
  const [me, qr, ...tiles] = await Promise.all([loadImage(photo), loadImage(qrData), ...picked.map((s) => loadImage(s.url))]);

  // The customer's own photo, framed in white.
  const meX = (W - meW) / 2;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(meX - 6, pad - 6, meW + 12, meH + 12, 22);
  ctx.fill();
  drawCover(ctx, me, meX, pad, meW, meH, 18);
  chip(ctx, "Me now", meX + 16, pad + 16);

  let y = pad + meH + gap * 2;
  picked.forEach((style, i) => {
    const row = Math.floor(i / cols);
    const inRow = Math.min(cols, picked.length - row * cols);
    const rowWidth = inRow * tileW + (inRow - 1) * gap;
    const x0 = (W - rowWidth) / 2;
    const x = x0 + (i % cols) * (tileW + gap);
    const ty = y + row * (tileH + gap);
    drawCover(ctx, tiles[i], x, ty, tileW, tileH, 18);
    const label = style.name.length > 24 ? `${style.name.slice(0, 23)}…` : style.name;
    chip(ctx, label, x + 14, ty + 14);
    if (picked.length > 1) badge(ctx, i + 1, x + tileW - 40, ty + 38);
  });
  y += rows * tileH + (rows - 1) * gap;

  ctx.fillStyle = "#fff";
  ctx.font = "700 46px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(picked.length > 1 ? "Which one should I get?" : "Should I get this one?", W / 2, y + 74);
  ctx.font = "500 30px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillStyle = "#B9DFCB";
  ctx.fillText(picked.length > 1 ? "Comment the number 👇" : "Tell me in the comments 👇", W / 2, y + 120);
  ctx.textAlign = "left";

  // Footer: the name and web address on the left, the QR code (the
  // customer's referral link) on the right.
  const qrSize = 150;
  const qrX = W - pad - qrSize;
  const qrY = H - pad - qrSize + 10;
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 14);
  ctx.fill();
  ctx.drawImage(qr, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#B9DFCB";
  ctx.beginPath();
  ctx.arc(pad + 16, H - 112, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "700 36px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Tressform", pad + 44, H - 100);
  ctx.fillStyle = "#B9DFCB";
  ctx.font = "500 27px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("Find the haircut that suits you", pad, H - 58);
  ctx.fillText("Scan, or visit tressform.co.in", pad, H - 24);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.9)
  );
  return new File([blob], "my-hairstyles-tressform.jpg", { type: "image/jpeg" });
}
