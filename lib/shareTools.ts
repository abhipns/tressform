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

type Pic = ImageBitmap | HTMLImageElement;

/**
 * 20.10.2026 (owner: "make sure the cropping is done properly"): where the
 * person is in a picture, as a box in the picture's own pixels, plus the
 * colour of its background. Works on plain backgrounds — every AI picture
 * now has the light-grey studio backdrop — by marking what differs from the
 * colour along the picture's edges. Returns no box for a busy background
 * (a room behind the person), where nothing can be told apart this way.
 */
function findSubject(img: Pic): { box: { x: number; y: number; w: number; h: number } | null; bg: string } {
  const sw = 72;
  const sh = Math.max(1, Math.round((sw * img.height) / img.width));
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) return { box: null, bg: "#E9E7E0" };
  g.drawImage(img, 0, 0, sw, sh);
  const d = g.getImageData(0, 0, sw, sh).data;
  const at = (x: number, y: number) => (y * sw + x) * 4;
  // The edges: left, right and top rows (the bottom is usually clothes).
  const edge: number[] = [];
  for (let y = 0; y < sh; y++) edge.push(at(0, y), at(sw - 1, y));
  for (let x = 0; x < sw; x++) edge.push(at(x, 0));
  let r = 0, gg = 0, b = 0;
  for (const i of edge) {
    r += d[i];
    gg += d[i + 1];
    b += d[i + 2];
  }
  r /= edge.length;
  gg /= edge.length;
  b /= edge.length;
  const bg = `rgb(${Math.round(r)},${Math.round(gg)},${Math.round(b)})`;
  const dist = (i: number) => Math.abs(d[i] - r) + Math.abs(d[i + 1] - gg) + Math.abs(d[i + 2] - b);
  // A busy background: the edges themselves vary a lot.
  const spread = edge.reduce((s, i) => s + dist(i), 0) / edge.length;
  if (spread > 40) return { box: null, bg };
  let x0 = sw, y0 = sh, x1 = -1, y1 = -1;
  for (let y = 0; y < sh; y++)
    for (let x = 0; x < sw; x++)
      if (dist(at(x, y)) > 70) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
  if (x1 < 0 || (x1 - x0) * (y1 - y0) < sw * sh * 0.04) return { box: null, bg };
  // The head: how wide the person is in the top part only (hair and face,
  // and the nose on a side view), so the shoulders don't count.
  const headBottom = Math.min(y1, y0 + Math.round((y1 - y0) * 0.45));
  let hx0 = sw, hx1 = -1;
  for (let y = y0; y <= headBottom; y++)
    for (let x = 0; x < sw; x++)
      if (dist(at(x, y)) > 70) {
        if (x < hx0) hx0 = x;
        if (x > hx1) hx1 = x;
      }
  if (hx1 < 0) return { box: null, bg };
  const k = img.width / sw;
  return { box: { x: hx0 * k, y: y0 * k, w: (hx1 - hx0 + 1) * k, h: (headBottom - y0 + 1) * k }, bg };
}

/**
 * Fill the frame with the picture without cutting into the person: the
 * crop follows the person (head kept whole, a little room above the hair,
 * centred left to right on them). When the person can't be found, or can't
 * fit whole, the whole picture is shown and the space around it filled with
 * its own background colour — nothing is ever cut off.
 */
function drawSmart(ctx: CanvasRenderingContext2D, img: Pic, x: number, y: number, w: number, h: number, r: number) {
  const iw = img.width;
  const ih = img.height;
  const { box, bg } = findSubject(img);
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.clip();
  const aspect = w / h;
  // The largest crop of the frame's shape that the picture allows.
  let cw = iw;
  let ch = iw / aspect;
  if (ch > ih) {
    ch = ih;
    cw = ih * aspect;
  }
  const exact = Math.abs(iw / ih - aspect) < 0.01;
  let cropped = false;
  if (exact) {
    ctx.drawImage(img, 0, 0, iw, ih, x, y, w, h);
    cropped = true;
  } else if (box) {
    // Some room around the head: above the hair especially, and at the sides.
    const top = Math.max(0, box.y - box.h * 0.15);
    const left = box.x - box.w * 0.06;
    const right = box.x + box.w * 1.06;
    if (right - left <= cw) {
      // Centred on the head left to right; starting just above the hair.
      const cx = Math.min(Math.max(0, (left + right) / 2 - cw / 2), iw - cw);
      const cy = Math.min(Math.max(0, top), ih - ch);
      ctx.drawImage(img, cx, cy, cw, ch, x, y, w, h);
      cropped = true;
    }
  }
  if (!cropped) {
    // Show it all, centred, on its own background colour.
    ctx.fillStyle = bg;
    ctx.fillRect(x, y, w, h);
    const s = Math.min(w / iw, h / ih);
    const dw = iw * s;
    const dh = ih * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
  ctx.restore();
}

/** The old centred crop, kept for anything not yet moved to drawSmart. */
function drawCover(ctx: CanvasRenderingContext2D, img: Pic, x: number, y: number, w: number, h: number, r: number) {
  drawSmart(ctx, img, x, y, w, h, r);
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

// ------------------------------------------------------------ barber sheet

/** Break text into lines that fit `maxWidth` in the context's current font. */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const tryLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(tryLine).width <= maxWidth || !line) line = tryLine;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

export interface BarberSheetInput {
  styleName: string;
  /** "a short textured quiff" — what to ask for. */
  cutName: string;
  /** "Sides: low taper, #2 to #0.5" … (lib/content/barberPoints.ts). */
  points: string[];
  /** The clipper guard key printed under the points. */
  guide?: string;
  /** The customer's own photo, shown as "Before". */
  before: string | null;
  /** Front first, then left, right, back — whichever exist. */
  pictures: { label: string; url: string; estimate?: boolean }[];
}

const FONT = "system-ui, -apple-system, Segoe UI, sans-serif";
const SHEET = { green: "#2F6B4F", gold: "#C79A3D", paper: "#F4F1E4", ink: "#16261C", muted: "#5B6B60" };

/**
 * 20.10.2026, owner's request: the "barber sheet" — ONE picture with
 * everything a barber needs for one look: the customer's photo before, the
 * front, both sides and the back, and the cutting instructions with clipper
 * guard numbers. Portrait, so it reads well on a barber's phone in WhatsApp.
 * Made on the customer's own device.
 */
export async function makeBarberSheet(input: BarberSheetInput): Promise<File> {
  const W = 1200;
  const pad = 48;
  const gap = 24;
  const inner = W - pad * 2;

  const front = input.pictures[0];
  const sides = input.pictures.slice(1, 4);
  const topTiles = [...(input.before ? [{ label: "Before", url: input.before, estimate: false }] : []), ...(front ? [front] : [])];
  const topW = topTiles.length === 2 ? (inner - gap) / 2 : 640;
  const topH = Math.round((topW * 4) / 3);
  const sideW = (inner - gap * 2) / 3;
  const sideH = Math.round((sideW * 4) / 3);

  // Measure the instructions first, to know how tall the picture is.
  const measure = document.createElement("canvas").getContext("2d")!;
  const textW = inner - 64;
  measure.font = `400 30px ${FONT}`;
  const pointLines = input.points.map((p) => {
    const i = p.indexOf(": ");
    const label = i > 0 && i <= 20 ? `${p.slice(0, i)}:` : "";
    const rest = label ? p.slice(i + 2) : p;
    measure.font = `700 30px ${FONT}`;
    const labelW = label ? measure.measureText(`${label} `).width : 0;
    measure.font = `400 30px ${FONT}`;
    // The first line starts after the label; later lines start at the left edge.
    const first = wrapText(measure, rest, textW - 28 - labelW);
    const firstLine = first[0] ?? "";
    const remaining = rest.slice(firstLine.length).trim();
    const more = remaining ? wrapText(measure, remaining, textW - 28) : [];
    return { label, labelW, lines: [firstLine, ...more] };
  });
  measure.font = `700 32px ${FONT}`;
  const askLines = wrapText(measure, `Ask for ${input.cutName}`, textW);
  const lineH = 44;
  const cardH =
    40 + 40 + 20 + askLines.length * 44 + 16 + pointLines.reduce((s, p) => s + p.lines.length * lineH + 10, 0) + 20 + (input.guide ? 44 : 0) + 24;

  const headerH = 150;
  const footerH = 96;
  const H =
    headerH + pad + (topTiles.length ? topH + gap : 0) + (sides.length ? sideH + gap : 0) + cardH + pad + footerH;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = SHEET.paper;
  ctx.fillRect(0, 0, W, H);

  // Header: the style's name.
  ctx.fillStyle = SHEET.green;
  ctx.fillRect(0, 0, W, headerH);
  ctx.fillStyle = SHEET.gold;
  ctx.fillRect(0, headerH - 8, W, 8);
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  ctx.font = `800 46px ${FONT}`;
  const title = input.styleName.toUpperCase();
  ctx.fillText(title.length > 40 ? `${title.slice(0, 39)}…` : title, pad, 78);
  ctx.fillStyle = "#DDE9DF";
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText("Barber sheet · show this to your barber", pad, 120);

  const images = await Promise.all([...topTiles, ...sides].map((t) => loadImage(t.url).catch(() => null)));

  const tile = (img: ImageBitmap | HTMLImageElement | null, label: string, estimate: boolean, x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = "#E4E0D0";
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 18);
    ctx.fill();
    if (img) drawCover(ctx, img, x, y, w, h, 18);
    ctx.font = `700 24px ${FONT}`;
    const text = estimate ? `${label} · AI estimate` : label;
    const cw = ctx.measureText(text).width + 28;
    ctx.fillStyle = "rgba(255,255,255,0.94)";
    ctx.beginPath();
    ctx.roundRect(x + 12, y + 12, cw, 42, 21);
    ctx.fill();
    ctx.fillStyle = SHEET.ink;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x + 26, y + 34);
    ctx.textBaseline = "alphabetic";
  };

  let y = headerH + pad;
  if (topTiles.length) {
    const rowW = topTiles.length * topW + (topTiles.length - 1) * gap;
    const x0 = (W - rowW) / 2;
    topTiles.forEach((t, i) => tile(images[i], t.label, Boolean(t.estimate), x0 + i * (topW + gap), y, topW, topH));
    y += topH + gap;
  }
  if (sides.length) {
    const rowW = sides.length * sideW + (sides.length - 1) * gap;
    const x0 = (W - rowW) / 2;
    sides.forEach((t, i) => tile(images[topTiles.length + i], t.label, Boolean(t.estimate), x0 + i * (sideW + gap), y, sideW, sideH));
    y += sideH + gap;
  }

  // The instructions card.
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.roundRect(pad, y, inner, cardH, 22);
  ctx.fill();
  let ty = y + 40 + 32;
  const tx = pad + 32;
  ctx.fillStyle = SHEET.green;
  ctx.font = `800 30px ${FONT}`;
  ctx.fillText("HAIRCUT INSTRUCTIONS", tx, ty);
  ty += 20 + 44;
  ctx.fillStyle = SHEET.ink;
  ctx.font = `700 32px ${FONT}`;
  for (const l of askLines) {
    ctx.fillText(l, tx, ty);
    ty += 44;
  }
  ty += 16;
  for (const p of pointLines) {
    ctx.fillStyle = SHEET.gold;
    ctx.beginPath();
    ctx.arc(tx + 7, ty - 10, 7, 0, Math.PI * 2);
    ctx.fill();
    p.lines.forEach((line, i) => {
      let lx = tx + 28;
      if (i === 0 && p.label) {
        ctx.fillStyle = SHEET.ink;
        ctx.font = `700 30px ${FONT}`;
        ctx.fillText(p.label, lx, ty);
        lx += p.labelW;
      }
      ctx.fillStyle = SHEET.ink;
      ctx.font = `400 30px ${FONT}`;
      ctx.fillText(line, lx, ty);
      ty += lineH;
    });
    ty += 10;
  }
  if (input.guide) {
    ty += 20;
    ctx.fillStyle = SHEET.muted;
    ctx.font = `500 23px ${FONT}`;
    ctx.fillText(input.guide, tx, ty);
  }

  // Footer.
  ctx.fillStyle = SHEET.ink;
  ctx.fillRect(0, H - footerH, W, footerH);
  ctx.fillStyle = "#fff";
  ctx.font = `700 32px ${FONT}`;
  ctx.fillText("Tressform", pad, H - footerH / 2 + 11);
  ctx.fillStyle = "#B9DFCB";
  ctx.font = `500 24px ${FONT}`;
  const site = "Find the haircut that suits you · tressform.co.in";
  ctx.fillText(site, W - pad - ctx.measureText(site).width, H - footerH / 2 + 9);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("canvas"))), "image/jpeg", 0.9)
  );
  return new File([blob], `${slug(input.styleName)}-barber-sheet.jpg`, { type: "image/jpeg" });
}
