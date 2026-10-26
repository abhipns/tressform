"use client";

// "World hairstyles – make pictures" in /admin/studio (26.10.2026). OWNER ONLY.
//
// Makes the pictures for /hairstyles with fal.ai: first one plain "before"
// photo of a model per region and gender, then each style's front picture on
// that model. Each picture is shrunk here in the browser to about 640 px wide,
// saved as WebP with a small white "tressform.co.in" mark in the top-right
// corner, and stored (/api/admin/world). What is made is remembered, so
// pressing the button again carries on where it stopped. The running cost is
// shown as it goes (about ₹3.50 a picture).

import { useEffect, useRef, useState } from "react";
import { authHeaders } from "@/lib/authClient";

type Item = { key: string; label: string; made: boolean; model?: string; hasFull?: boolean };
type Status = { models: Item[]; styles: Item[]; spentPaise: number; perPicturePaise: number };

const SMALL_WIDTH = 640;
const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/** The gallery copy: about 640 px wide, WebP, with the white mark top-right. */
async function smallWithMark(dataUrl: string): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const scale = Math.min(1, SMALL_WIDTH / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't make the small picture.");
  ctx.drawImage(img, 0, 0, w, h);
  const size = Math.max(13, Math.round(w * 0.028));
  ctx.font = `600 ${size}px Figtree, system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 4;
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("tressform.co.in", w - Math.round(size * 0.9), Math.round(size * 0.8));
  const webp = canvas.toDataURL("image/webp", 0.82);
  if (!webp.startsWith("data:image/webp")) throw new Error("This browser can't save WebP pictures. Please use Chrome or Edge.");
  return webp;
}

export default function WorldPictureMaker() {
  const [status, setStatus] = useState<Status | null>(null);
  const [running, setRunning] = useState(false);
  const [now, setNow] = useState<string | null>(null);
  const [sessionPaise, setSessionPaise] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const stop = useRef(false);

  async function load() {
    const res = await fetch("/api/admin/world", { headers: await authHeaders() });
    const data = await res.json().catch(() => ({}));
    if (res.ok) setStatus(data);
    else setError(data.error ?? "Couldn't load the list.");
  }
  useEffect(() => {
    void load();
  }, []);

  async function makeOne(kind: "model" | "style", item: Item) {
    const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
    setNow(`${kind === "model" ? "Model photo" : "Style"}: ${item.label}`);
    const res = await fetch("/api/admin/world", { method: "POST", headers, body: JSON.stringify({ action: "make", kind, key: item.key }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.dataUrl) throw new Error(data.error ?? "A picture couldn't be made.");
    setSessionPaise((p) => p + (data.costPaise ?? 0));
    const webp = await smallWithMark(data.dataUrl);
    const saved = await fetch("/api/admin/world", { method: "POST", headers, body: JSON.stringify({ action: "save", kind, key: item.key, webp }) });
    const done = await saved.json().catch(() => ({}));
    if (!saved.ok) throw new Error(done.error ?? "The picture couldn't be saved.");
  }

  async function makeMissing() {
    if (!status) return;
    stop.current = false;
    setRunning(true);
    setError(null);
    try {
      // Models first (only those a missing style needs, or missing themselves), then the styles.
      const neededModels = new Set(status.styles.filter((s) => !s.made).map((s) => s.model));
      for (const m of status.models) {
        if (stop.current) break;
        if (m.made && m.hasFull) continue;
        if (!neededModels.has(m.key) && m.made) continue;
        await makeOne("model", m);
      }
      for (const s of status.styles) {
        if (stop.current) break;
        if (s.made) continue;
        await makeOne("style", s);
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Press the button again to carry on.");
    } finally {
      setRunning(false);
      setNow(null);
      await load();
    }
  }

  if (!status) {
    return <p className="text-[14.5px] text-ink-muted">{error ?? "Loading the world hairstyles…"}</p>;
  }
  const total = status.models.length + status.styles.length;
  const made = status.models.filter((m) => m.made).length + status.styles.filter((s) => s.made).length;
  const left = total - made;

  return (
    <div className="rounded-[20px] border border-line bg-surface p-5 sm:p-6">
      <h2 className="text-[20px] font-semibold">World hairstyles – make pictures</h2>
      <p className="mt-1 max-w-[66ch] text-[14.5px] leading-[1.55] text-ink-muted">
        Pictures for the Hairstyles of the World page: one model photo for each region and gender (reused), then each
        style on that model. Each is saved small, with the tressform.co.in mark. If it stops, press the button again: it
        carries on from where it stopped. Styles without a picture show a neat placeholder on the site meanwhile.
      </p>
      <div className="mt-4 h-3 rounded-full bg-bg-soft">
        <div className="h-3 rounded-full bg-mint transition-all" style={{ width: `${total ? (made / total) * 100 : 0}%` }} />
      </div>
      <p className="mt-2 text-[14.5px] text-ink-heading">
        <strong>{made}</strong> of {total} pictures made · about {rupees(left * status.perPicturePaise)} to make the rest
      </p>
      <p className="mt-0.5 text-[13.5px] text-ink-muted">
        Spent so far: {rupees(status.spentPaise)} in all{sessionPaise > 0 ? `, ${rupees(sessionPaise)} just now` : ""} (about{" "}
        {rupees(status.perPicturePaise)} a picture).
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" disabled={running || left === 0} onClick={makeMissing}>
          {left === 0 ? "All pictures made" : made === 0 ? `Make all ${left} pictures` : `Carry on: make the ${left} left`}
        </button>
        {running && (
          <button type="button" className="btn-secondary" onClick={() => (stop.current = true)}>
            Stop after this one
          </button>
        )}
      </div>
      {now && (
        <p className="mt-3 flex items-center gap-2 text-[14px] text-ink-heading" role="status">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-mint-deep" /> Making: {now}
        </p>
      )}
      {error && <p className="mt-3 rounded-sm2 bg-danger/10 px-4 py-2.5 text-[14px] font-medium text-danger">{error}</p>}
    </div>
  );
}
