"use client";

// Admin carousel-photo upload screen — per doc thread f3588221-19c8. Lets you
// add a new carousel "session" (a customer's card in the homepage marquee,
// Row 7) by uploading photos directly, instead of editing
// lib/content/carousel.ts and redeploying. Posts to app/api/admin/carousel.
//
// This page itself is not linked from anywhere public and has no nav entry —
// reach it directly at /admin/carousel. It is NOT hidden by real auth yet
// (see the route's own comment on ADMIN_UPLOAD_KEY) — treat the URL as
// sensitive until a real admin-role check is wired up.
//
// Note: sessions added here don't automatically show up in the live
// Carousel.tsx component yet — that still reads from
// lib/content/carousel.ts's static array. Wiring Carousel.tsx to fetch from
// this same table is the next step once there's a real Supabase project to
// read from; until then, use this page's list below to confirm an upload
// went through, then mirror it into lib/content/carousel.ts if you want it
// live immediately.

import { useEffect, useState } from "react";

interface PhotoSlot {
  file: File;
  previewUrl: string;
  tag: string;
}

interface SavedSession {
  id: string;
  caption: string;
  photos: { id: string; src: string; tag: string; alt: string }[];
}

export default function AdminCarouselPage() {
  const [adminKey, setAdminKey] = useState("");
  const [keySaved, setKeySaved] = useState(false);
  const [caption, setCaption] = useState("");
  const [slots, setSlots] = useState<PhotoSlot[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [sessions, setSessions] = useState<SavedSession[]>([]);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("tressform:adminKey") : null;
    if (stored) {
      setAdminKey(stored);
      setKeySaved(true);
    }
  }, []);

  async function loadSessions(key: string) {
    const res = await fetch("/api/admin/carousel", { headers: { "x-admin-key": key } });
    if (res.ok) {
      const data = await res.json();
      setSessions(data.sessions || []);
    }
  }

  function saveKey() {
    sessionStorage.setItem("tressform:adminKey", adminKey);
    setKeySaved(true);
    loadSessions(adminKey);
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const picked = Array.from(files).slice(0, 6 - slots.length);
    picked.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        setSlots((prev) => [...prev, { file, previewUrl: String(reader.result), tag: prev.length === 0 ? "Model" : "AI" }]);
      };
      reader.readAsDataURL(file);
    });
  }

  function removeSlot(i: number) {
    setSlots((prev) => prev.filter((_, idx) => idx !== i));
  }

  function setTag(i: number, tag: string) {
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, tag } : s)));
  }

  async function submit() {
    if (!caption.trim() || slots.length === 0) {
      setStatus("Add a caption and at least one photo first.");
      return;
    }
    setStatus("Uploading…");
    const form = new FormData();
    form.set("caption", caption.trim());
    slots.forEach((s) => {
      form.append("photos", s.file);
      form.append("tags", s.tag);
    });

    const res = await fetch("/api/admin/carousel", {
      method: "POST",
      headers: { "x-admin-key": adminKey },
      body: form,
    });

    if (res.ok) {
      setStatus("Saved.");
      setCaption("");
      setSlots([]);
      loadSessions(adminKey);
    } else {
      const data = await res.json().catch(() => ({}));
      setStatus(`Failed: ${data.error || res.statusText}`);
    }
  }

  if (!keySaved) {
    return (
      <div className="mx-auto max-w-sm px-5 py-20">
        <h1 className="mb-3 text-[18px] font-semibold text-ink-heading">Admin — Carousel photos</h1>
        <p className="mb-4 text-[13px] text-ink-muted">
          Enter the admin key (ADMIN_UPLOAD_KEY on the server). This is a placeholder gate, not real access control —
          don't share this URL.
        </p>
        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Admin key"
          className="mb-3 w-full rounded-md2 border border-line px-3 py-2 text-[14px]"
        />
        <button onClick={saveKey} className="btn-primary w-full">
          Continue
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[640px] px-5 py-14">
      <h1 className="mb-1 text-[20px] font-semibold text-ink-heading">Add a carousel session</h1>
      <p className="mb-6 text-[13px] text-ink-muted">
        Up to 6 photos per session. First photo defaults to "Model", the rest to "AI" — edit the tag under each thumbnail
        before saving.
      </p>

      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-heading">Caption</label>
      <input
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder='e.g. "Rohan · 4 AI transformations"'
        className="mb-5 w-full rounded-md2 border border-line px-3 py-2 text-[14px]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-ink-heading">Photos ({slots.length}/6)</label>
      <div className="mb-3 grid grid-cols-3 gap-2.5">
        {slots.map((s, i) => (
          <div key={i} className="relative overflow-hidden rounded-md2 border border-line">
            <img src={s.previewUrl} alt="" className="aspect-square w-full object-cover" />
            <input
              value={s.tag}
              onChange={(e) => setTag(i, e.target.value)}
              className="w-full border-t border-line px-1.5 py-1 text-center text-[11px]"
            />
            <button
              onClick={() => removeSlot(i)}
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-[11px] text-white"
              aria-label="Remove photo"
            >
              ×
            </button>
          </div>
        ))}
        {slots.length < 6 && (
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-md2 border border-dashed border-line text-[12px] text-ink-muted">
            + Add
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
          </label>
        )}
      </div>

      <button onClick={submit} className="btn-primary mb-2 w-full">
        Save session
      </button>
      {status && <p className="text-[12.5px] text-ink-muted">{status}</p>}

      <hr className="my-8 border-line" />

      <h2 className="mb-3 text-[14px] font-semibold text-ink-heading">Existing sessions</h2>
      {sessions.length === 0 && <p className="text-[13px] text-ink-muted">None yet.</p>}
      <div className="flex flex-col gap-3">
        {sessions.map((s) => (
          <div key={s.id} className="rounded-md2 border border-line p-3">
            <p className="mb-2 text-[13px] font-medium text-ink-heading">{s.caption}</p>
            <div className="flex flex-wrap gap-1.5">
              {s.photos.map((p) => (
                <img key={p.id} src={p.src} alt={p.alt} title={p.tag} className="h-12 w-12 rounded-sm2 object-cover" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
