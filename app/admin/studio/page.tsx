// /admin/studio — the owner's workbench for making hairstyle images.
//
// 10.10.2026. Built so the owner can (a) turn his own model photos into
// example images for the home page carousel and (b) see for himself how
// good the image model is, including against the alternatives.
//
// What it does: upload one front-facing photo → it is analysed exactly as a
// customer's would be (same checks, same face-shape reading) → pick a
// hairstyle from the starter list or describe one → the image is made by
// the same code customers use, and can be downloaded next to the original.
//
// It is NOT counted against free previews and is NOT available to
// customers: the server route behind it (/api/admin/studio) only answers
// an account whose role is ADMIN. This page checks the same thing up front
// simply to show a clear message instead of an error.
//
// Every image costs real money on the FAL account. The page shows the
// price beside each model and keeps a running total for the session.

"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SUPABASE_MOCK_MODE, authHeaders, getMockUserId, loginUrl, useSession } from "@/lib/authClient";
import { shrinkPhoto } from "@/lib/shrinkPhoto";
import { STUDIO_STYLES, type StudioStyle } from "@/lib/content/studioStyles";

type Gender = "men" | "women";

type Shot = {
  id: string;
  label: string;
  modelLabel: string;
  state: "loading" | "done" | "failed";
  url?: string;
  seconds?: number;
  costPaise?: number;
  error?: string;
};

const MODELS = [
  { id: "fal-ai/nano-banana/edit", label: "Nano Banana", note: "what customers get, about ₹3.50 an image", paise: 350 },
  { id: "fal-ai/nano-banana-pro/edit", label: "Nano Banana Pro", note: "higher quality, about ₹13 an image", paise: 1320 },
  { id: "fal-ai/flux-pro/kontext", label: "Flux Kontext Pro", note: "a different editor, about ₹3.50 an image", paise: 350 },
];

const BATCH_AT_ONCE = 3;

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "hairstyle";
}

async function saveImage(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const objectUrl = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    // Some browsers won't let a page save a picture from another address;
    // opening it lets the owner save it with a right-click instead.
    window.open(url, "_blank", "noopener");
  }
}

export default function StudioPage() {
  const { session, loading: sessionLoading } = useSession();
  const userId = session?.user.id ?? null;
  const mockUserId = useRef<string>("");

  const [isOwner, setIsOwner] = useState<boolean | null>(SUPABASE_MOCK_MODE ? true : null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("photo");
  const [photoId, setPhotoId] = useState<string | null>(null);
  const [faceRead, setFaceRead] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [gender, setGender] = useState<Gender>("men");
  const [custom, setCustom] = useState("");
  const [modelId, setModelId] = useState(MODELS[0].id);
  const [shots, setShots] = useState<Shot[]>([]);

  useEffect(() => {
    mockUserId.current = getMockUserId();
  }, []);

  // Is the signed-in account the owner's?
  useEffect(() => {
    if (SUPABASE_MOCK_MODE || !userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setIsOwner(data?.role === "ADMIN");
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const model = MODELS.find((m) => m.id === modelId) ?? MODELS[0];
  const ready = Boolean(photo && (SUPABASE_MOCK_MODE || photoId)) && !photoBusy;
  const spentPaise = shots.reduce((sum, s) => sum + (s.state === "done" ? (s.costPaise ?? 0) : 0), 0);
  const inFlight = shots.filter((s) => s.state === "loading").length;

  async function handlePhoto(file: File) {
    setError(null);
    setPhotoBusy(true);
    setPhotoId(null);
    setFaceRead(null);
    try {
      const { dataUrl, blob } = await shrinkPhoto(file);
      setPhoto(dataUrl);
      setPhotoName(slug(file.name.replace(/\.[a-z0-9]+$/i, "")));

      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
      let body: Record<string, unknown>;
      if (SUPABASE_MOCK_MODE) {
        body = { userId: mockUserId.current, consentGiven: true, photoUrl: dataUrl };
      } else {
        const path = `${userId}/studio-${Date.now()}/front.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (uploadError) throw new Error("The photo couldn't be uploaded. Please try again.");
        body = { consentGiven: true, storagePath: path, extraPaths: [] };
      }

      const res = await fetch("/api/analyze", { method: "POST", headers, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The photo couldn't be analysed.");
      setPhotoId(data.photoId);
      setFaceRead(`${data.faceShape} face, ${data.confidence}% sure`);
    } catch (err) {
      setPhoto(null);
      setError(err instanceof Error && err.message !== "unreadable" ? err.message : "That photo couldn't be read. Please try a JPG or PNG.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function makeOne(style: StudioStyle) {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setShots((prev) => [{ id, label: style.label, modelLabel: model.label, state: "loading" }, ...prev]);
    const patch = (p: Partial<Shot>) => setShots((prev) => prev.map((s) => (s.id === id ? { ...s, ...p } : s)));
    try {
      const res = await fetch("/api/admin/studio", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({
          ...(SUPABASE_MOCK_MODE ? { userId: mockUserId.current, sourceImageUrl: photo } : { photoId }),
          styleLabel: style.label,
          styleText: style.prompt,
          gender,
          model: model.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "The image couldn't be made.");
      patch({ state: "done", url: data.resultImageUrl, seconds: data.seconds, costPaise: data.costPaise });
    } catch (err) {
      patch({ state: "failed", error: err instanceof Error ? err.message : "The image couldn't be made." });
    }
  }

  async function makeAll() {
    const queue = [...STUDIO_STYLES[gender]];
    const worker = async () => {
      for (let next = queue.shift(); next; next = queue.shift()) await makeOne(next);
    };
    await Promise.all(Array.from({ length: BATCH_AT_ONCE }, worker));
  }

  // ------------------------------------------------------------------ gates
  if (!SUPABASE_MOCK_MODE && (sessionLoading || (userId && isOwner === null))) {
    return (
      <section className="frame flex min-h-[50vh] items-center justify-center py-20">
        <div className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
      </section>
    );
  }
  if (!SUPABASE_MOCK_MODE && !userId) {
    return (
      <section className="frame py-20">
        <h1 className="h-display">Studio</h1>
        <p className="lead mt-4">Log in with the owner&apos;s account to use this page.</p>
        <a href={loginUrl("/admin/studio")} className="btn-primary mt-7">
          Log in
        </a>
      </section>
    );
  }
  if (isOwner === false) {
    return (
      <section className="frame py-20">
        <h1 className="h-display">Studio</h1>
        <p className="lead mt-4 max-w-[52ch]">This page is for the site owner only.</p>
        <a href="/" className="btn-secondary mt-7">
          Back to the home page
        </a>
      </section>
    );
  }

  // ------------------------------------------------------------------- page
  const allCostRupees = Math.round((STUDIO_STYLES[gender].length * model.paise) / 100);

  return (
    <section className="frame py-12 lg:py-16">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-3">
        <div>
          <h1 className="h-display">Studio</h1>
          <p className="lead mt-3 max-w-[60ch]">
            Make hairstyle images from your own model photos. Only you can open this page, and nothing here counts
            against free previews.
          </p>
        </div>
        <p className="text-[15.5px] text-ink-muted">
          Spent this session:{" "}
          <strong className="font-heading text-[20px] text-ink-heading">₹{(spentPaise / 100).toFixed(2)}</strong>
        </p>
      </div>

      {error && (
        <div className="mt-6 rounded-sm2 bg-danger/10 px-4 py-3 text-[15px] font-medium text-danger" role="alert">
          {error}
        </div>
      )}

      <div className="mt-10 grid gap-x-12 gap-y-10 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]">
        {/* 1 — the photo */}
        <div>
          <h2 className="text-[20px] font-semibold">1. The photo</h2>
          <label className="mt-4 block cursor-pointer">
            <div
              className={`relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-[20px] border-[1.5px] bg-surface text-center ${
                photo ? "border-mint" : "border-dashed border-ink-muted/50"
              }`}
            >
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt="The photo you chose" className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <span className="px-6 text-[15.5px] leading-[1.5] text-ink-muted">
                  Choose a front-facing photo.
                  <br />
                  Face clearly visible, looking at the camera.
                </span>
              )}
              {photoBusy && (
                <span className="absolute inset-0 flex items-center justify-center bg-white/70">
                  <span className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
                </span>
              )}
            </div>
            <span className="btn-secondary mt-4 w-full">{photo ? "Use a different photo" : "Choose a photo"}</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handlePhoto(file);
                e.target.value = "";
              }}
            />
          </label>
          <p className="mt-3 min-h-[22px] text-[15px] text-ink-body" aria-live="polite">
            {photoBusy ? "Checking the photo…" : faceRead ? `Reading: ${faceRead}.` : ""}
          </p>
          <p className="mt-2 text-[13.5px] leading-[1.5] text-ink-muted">
            Only use photos you have the right to use: AI-generated people or licensed pictures.
          </p>
        </div>

        {/* 2 and 3 — the hairstyle and the model */}
        <div className="min-w-0">
          <h2 className="text-[20px] font-semibold">2. The hairstyle</h2>
          <div className="mt-4 inline-flex rounded-full border border-line bg-surface p-1" role="group" aria-label="Whose hairstyles">
            {(["men", "women"] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                aria-pressed={gender === g}
                className={`rounded-full px-5 py-2 text-[15px] font-semibold transition ${
                  gender === g ? "bg-ink-heading text-white" : "text-ink-heading hover:bg-bg-soft"
                }`}
              >
                {g === "men" ? "Men's" : "Women's"}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2.5">
            {STUDIO_STYLES[gender].map((style) => (
              <button
                key={style.label}
                type="button"
                disabled={!ready}
                onClick={() => makeOne(style)}
                title={style.prompt}
                className="rounded-full border border-line bg-surface px-4 py-2.5 text-[15px] font-medium text-ink-heading transition hover:border-mint hover:bg-mint-pale disabled:cursor-not-allowed disabled:opacity-50"
              >
                {style.label}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[13.5px] text-ink-muted">Click a style to make it. Each click makes one image.</p>

          <div className="mt-6">
            <label htmlFor="customStyle" className="block text-[15.5px] font-semibold text-ink-heading">
              Or describe a hairstyle in your own words
            </label>
            <textarea
              id="customStyle"
              rows={3}
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              maxLength={600}
              placeholder="Example: a short French crop with a blunt fringe and a high skin fade"
              className="mt-2 w-full resize-none rounded-[14px] border border-line bg-surface px-4 py-3 text-[15.5px] text-ink-body outline-none focus:border-mint-deep"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                className="btn-primary !px-6 !py-3"
                disabled={!ready || custom.trim().length < 4}
                onClick={() => makeOne({ label: custom.trim().slice(0, 60), prompt: custom.trim() })}
              >
                Make this one
              </button>
              <button type="button" className="btn-secondary !px-6 !py-3" disabled={!ready || inFlight > 0} onClick={makeAll}>
                Make all {STUDIO_STYLES[gender].length} {gender === "men" ? "men's" : "women's"} styles (about ₹{allCostRupees})
              </button>
            </div>
          </div>

          <h2 className="mt-10 text-[20px] font-semibold">3. The image model</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {MODELS.map((m) => (
              <label
                key={m.id}
                className={`cursor-pointer rounded-[16px] border-[1.5px] bg-surface p-4 transition ${
                  modelId === m.id ? "border-mint" : "border-line hover:border-ink-muted/60"
                }`}
              >
                <input
                  type="radio"
                  name="model"
                  value={m.id}
                  checked={modelId === m.id}
                  onChange={() => setModelId(m.id)}
                  className="sr-only"
                />
                <span className="block font-heading text-[17px] font-semibold text-ink-heading">{m.label}</span>
                <span className="mt-1 block text-[13.5px] leading-[1.45] text-ink-muted">{m.note}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* results */}
      <div className="mt-14 border-t border-line pt-10">
        <h2 className="text-[20px] font-semibold">
          Results{shots.length > 0 ? ` (${shots.filter((s) => s.state === "done").length} made)` : ""}
        </h2>
        {shots.length === 0 ? (
          <p className="mt-3 text-[15.5px] text-ink-muted">
            Nothing yet. Choose a photo, then click a hairstyle. Images appear here, newest first.
          </p>
        ) : (
          <ul className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shots.map((shot) => (
              <li key={shot.id}>
                {shot.state === "done" && shot.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.url} alt={shot.label} className="w-full rounded-[18px] bg-bg-soft" />
                ) : (
                  <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-[18px] bg-surface px-5 text-center">
                    {shot.state === "loading" ? (
                      <>
                        <div className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
                        <p className="text-[14px] font-medium text-ink-muted">Making the image…</p>
                      </>
                    ) : (
                      <p className="text-[14px] font-medium text-danger">{shot.error}</p>
                    )}
                  </div>
                )}
                <p className="mt-3 text-[15.5px] font-semibold leading-snug text-ink-heading">{shot.label}</p>
                <p className="mt-0.5 text-[13.5px] text-ink-muted">
                  {shot.modelLabel}
                  {shot.state === "done" && shot.seconds !== undefined ? `, ${shot.seconds} seconds` : ""}
                </p>
                {shot.state === "done" && shot.url && (
                  <button
                    type="button"
                    onClick={() => saveImage(shot.url!, `${photoName}-${slug(shot.label)}.jpg`)}
                    className="mt-2 text-[14.5px] font-semibold text-mint-deep underline decoration-mint/40 underline-offset-4 hover:decoration-mint-deep"
                  >
                    Download
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
