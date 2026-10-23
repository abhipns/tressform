"use client";

// 12.10.2026: ONE selfie now (owner's decision). Only the front photo was
// ever read — face shape, hair and previews all come from it — so the left
// and right photos only made the upload longer. The Slot type and the
// camera still allow more photos, should side views ever be used again.
//
// 3-photo upload flow — Front/Left/Right, consent checkbox, AWS Rekognition
// on all 3 together, then style-preview generation. Wired to the real
// (mock-mode-aware) /api/analyze and /api/generate routes so this is a
// genuine end-to-end demo, not a scripted fake.
//
// 24.09.2026: simplified per user feedback. The old flow opened with a
// 4-question tab quiz (desired look / maintenance / current problem /
// occasion — 6 options deep on one question) before the user had even seen
// the upload step, then asked two MORE tab questions (purpose / style
// direction) after analysis, before showing results. User's read: too many
// choices, too much friction before a customer sees any payoff. Replaced
// with a single "capture" step — photos first, with the exact
// instructions/labels the user asked for (Good lighting / no glasses / no
// cap / face clearly visible), equal-sized Front/Left/Right frames with a
// camera icon and label per frame — followed directly on the same screen
// by the option pills, the consent checkbox, and one "Upload" button.
//
// 24.09.2026 (later same day): per feedback, the old two-step "Continue →"
// / "preferences" screen was collapsed into one step — the 8 option pills
// (previously two separate 4-option rows for "look goal" and "style
// preference") now render as a single combined row directly below the
// photo upload cards, multi-select (a customer can be "Professional" AND
// "Classic" at once, so this isn't a single-choice pick), then the consent
// checkbox, then the Upload button. Selected options are UI-only for now,
// same as the old lookGoal/stylePref fields — the /api/generate payload
// doesn't carry them yet (see handleSubmit), matching the previous
// implementation's actual behaviour, not a regression.
//
// 09.10.2026: real sign-in. When a real Supabase project is connected:
//   - a customer must be logged in before uploading (free previews are
//     counted per account, so there is nothing useful to do anonymously) —
//     logged-out visitors see a "Log in to start" card instead of the
//     upload frames;
//   - the three photos are uploaded to the PRIVATE "photos" storage bucket
//     under the customer's own folder, and the API routes receive the
//     storage path + the customer's login token instead of a raw image and
//     a browser-made id.
// Every photo is also shrunk in the browser first (longest side 1600px,
// JPEG) — phone photos are routinely 5–10MB, which is slow to upload and
// over the request-size limit of the hosting platform. Mock mode (no
// Supabase env vars) behaves exactly as before, just with smaller images.
//
// 09.10.2026 (speed, after the first real run took ~43s for two previews):
//   - the three photos upload together instead of one after another;
//   - the previews are created together instead of one after another, and
//     each one appears on screen the moment it is ready;
//   - the page only asks for as many previews as the customer has left
//     (the analysis reply says how many), instead of always asking for a
//     third that was then refused — and says so plainly, with a link to
//     pricing, rather than showing a red error;
//   - a returning customer with no free previews left is told before they
//     upload anything.

//
// 10.10.2026 (design pass):
//   - the eight option pills (Everyday, Professional, Wedding…) are gone.
//     They never changed which styles were shown, and the owner's view is
//     that fewer choices is better: photos, consent, go.
//   - the section is now a mint band with the heading and photo tips on the
//     left and the tool on the right. The tips are practical ones (face a
//     window, phone at eye level) because the quality of the selfie decides
//     the quality of the preview.
//   - the three photo frames sit side by side on phones too, instead of
//     three tall frames stacked one under another.
//   - the button says what it does ("See my preview") and, while it is
//     greyed out, a line underneath says what is still missing.
// None of the upload / analysis / preview logic changed.
//
// 11.10.2026: a "Take selfies now" button (asked for by the owner). It
// opens the camera on the page (components/SelfieCamera.tsx) and takes the
// photos that are still missing, one after another. Tapping a frame still
// lets a customer upload a photo they already have; the frames no longer
// force the phone's camera app open, so the gallery can be chosen there.
//
// 11.10.2026 (later): the waiting screen after "See my preview" (asked for
// by the owner: "a small and simple animation like uploading, analyzing").
// It was one spinner with one line of text. It now shows the customer's
// own front photo with a band of light moving down it, beside the three
// things that are really happening, each ticked off as it finishes:
// uploading, reading the face shape, choosing hairstyles. The steps follow
// the real work, with one small exception: each stays on screen for at
// least a moment so a fast step does not flash past unread.
//
// 11.10.2026 (the customer's own list): until now everyone was shown the
// same three men's cuts, made automatically. Now:
//   - one question before the photos: men's or women's hairstyles. It
//     decides which of the two lists of 30 is used and how hair length is
//     described, so it cannot be skipped;
//   - after the photos are read, the result screen (components/
//     StylePicks.tsx) shows what was read about the customer, their top
//     picks from the 60 styles with reasons, and a "See it on me" button on
//     each. A preview is only made when the customer asks for it.
// The button is now "See my hairstyles", since that is what comes next.
//
// 11.10.2026 (paid previews):
//   - a customer with no previews left is no longer stopped before
//     uploading. Reading a photo and showing the list costs a few paise; the
//     list is what makes a pack worth buying, so everyone gets to see theirs
//     and is asked for a pack only at "See it on me";
//   - the result screen is remembered for this browser tab (which photo, the
//     customer's own corrections, a small copy of the front photo). Leaving
//     to buy a pack and coming back, or reloading, brings the same screen
//     back, with the previews already made and the new balance, which the
//     server supplies (/api/previews). "Start over" forgets it.
//
// 14.10.2026 ("My hairstyles" from the account): the tab's memory is lost
// in a new tab, another browser or a link opened from WhatsApp, and the
// customer used to land on an empty upload form although their hairstyles
// were saved. Now, when this tab remembers nothing, a signed-in customer's
// screen is rebuilt from their account: their latest photo that hairstyles
// were made from, what they confirmed about their face and hair, and every
// hairstyle with its pictures (/api/previews with { latest: true }). After
// "Start over" this tab stays on a fresh upload form (FRESH_KEY).

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SUPABASE_MOCK_MODE, authHeaders, ensureSession, getMockUserId, loginUrl, useSession } from "@/lib/authClient";
import { trackMeta } from "@/lib/metaPixel";
import SelfieCamera from "./SelfieCamera";
import { setReloadBlocked } from "./VersionWatch";
import { readLight } from "@/lib/photoLight";
import StylePicks, {
  type ConfirmedDetails,
  type EarlierPreview,
  type PhotoDetails,
  type PreviewOutcome,
  type ViewsOutcome,
} from "./StylePicks";
import type { HairGender } from "@/lib/content/hairstyles";
import { FACIAL_HAIR_OPTIONS, type FacialHair } from "@/lib/recommend";

/** 14.10.2026: a facial-hair value from the server, or null if it isn't one. */
function asFacialHair(value: unknown): FacialHair | null {
  return typeof value === "string" && (FACIAL_HAIR_OPTIONS as string[]).includes(value) ? (value as FacialHair) : null;
}

type Slot = "front" | "left" | "right";
/** 17.10.2026: the plain light backdrop behind the selfie after "Remove background". */
const PLAIN_BACKDROP = "#E8E6E1";
type Step = "capture" | "analyzing" | "results";
/** What the analysis sent back, kept for the result screen. */
type Analysis = { photoId: string; previewsLeft: number | null; details: PhotoDetails };

// What is remembered for this tab so the result screen can come back.
const RESULT_KEY = "tressform_result";
// Set by "Start over": this tab wants a fresh upload, not the account's latest screen.
const FRESH_KEY = "tressform_fresh";

function wantsFresh(): boolean {
  try {
    return window.sessionStorage.getItem(FRESH_KEY) === "1";
  } catch {
    return false;
  }
}

function setFresh(value: boolean) {
  try {
    if (value) window.sessionStorage.setItem(FRESH_KEY, "1");
    else window.sessionStorage.removeItem(FRESH_KEY);
  } catch {
    // Not remembered: a reload may bring the latest screen back, which is harmless.
  }
}
type Remembered = {
  owner: string; // whose result this is: never shown to a different login
  photoId: string;
  gender: HairGender;
  details: PhotoDetails;
  confirmed: ConfirmedDetails | null;
  thumb: string | null;
};

function remember(value: Remembered | null) {
  try {
    if (value) window.sessionStorage.setItem(RESULT_KEY, JSON.stringify(value));
    else window.sessionStorage.removeItem(RESULT_KEY);
  } catch {
    // Storage blocked or full: the screen simply is not remembered.
  }
}

function recall(): Remembered | null {
  try {
    const raw = window.sessionStorage.getItem(RESULT_KEY);
    const value = raw ? (JSON.parse(raw) as Remembered) : null;
    return value && value.photoId && value.details && (value.gender === "men" || value.gender === "women") ? value : null;
  } catch {
    return null;
  }
}

/** A small copy of the front photo: enough for the result screen, light enough to remember. */
async function makeThumb(dataUrl: string | null): Promise<string | null> {
  if (!dataUrl) return null;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("unreadable"));
      // 14.10.2026: may be a link to the photo in storage (screen rebuilt from the account).
      if (/^https?:/.test(dataUrl)) el.crossOrigin = "anonymous";
      el.src = dataUrl;
    });
    const width = 300;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = Math.max(1, Math.round((width * img.naturalHeight) / img.naturalWidth));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch {
    return null;
  }
}

// 13.10.2026 (owner): arm's length so the shoulders show, and a light top
// (dark clothes blur into dark hair in the preview).
const TIPS = [
  "Face a window or a light, so your face is evenly lit.",
  "Hold the phone at arm's length, arm straight, at eye level, so your head and shoulders are in the picture.",
  "No glasses, cap or hat, and keep your hair off your face.",
  "A light or plain top works best.",
];

const GENDER_KEY = "tressform_hairstyles_for";
const GENDER_OPTIONS: { value: HairGender; label: string; short: string }[] = [
  { value: "men", label: "Men's hairstyles", short: "Men's" },
  { value: "women", label: "Women's hairstyles", short: "Women's" },
];

const SLOT_LABEL: Record<Slot, string> = { front: "Front", left: "Left", right: "Right" };
const SLOTS: Slot[] = ["front"];

const STAGES = ["Uploading your photos", "Reading your face shape", "Choosing hairstyles for you"];
// The least time a step stays on screen, so a fast one can still be read.
const STAGE_MIN_MS = 700;

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

const MAX_SIDE_PX = 1600;
const JPEG_QUALITY = 0.85;

/**
 * Shrink a photo in the browser and re-encode it as JPEG. Also says when
 * the picture is too dark all over to use (lib/photoLight.ts). A photo
 * chosen from the gallery has no face outline to measure inside, so only
 * that one rule applies here; the selfie camera checks the light fully.
 */
async function shrinkPhoto(file: Blob): Promise<{ dataUrl: string; blob: Blob; lightMessage: string | null }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("unreadable"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", JPEG_QUALITY)
    );
    let lightMessage: string | null = null;
    try {
      const small = document.createElement("canvas");
      small.width = 60;
      small.height = Math.max(1, Math.round((60 * height) / width));
      const smallCtx = small.getContext("2d");
      if (smallCtx) {
        smallCtx.drawImage(canvas, 0, 0, small.width, small.height);
        const pixels = smallCtx.getImageData(0, 0, small.width, small.height).data;
        lightMessage = readLight(pixels, small.width, small.height, null).message;
      }
    } catch {
      // A browser that will not let the page read the pixels: skip the check.
    }
    return { dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), blob, lightMessage };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
      <path
        d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.2l.9-1.5A1.5 1.5 0 0 1 9.9 4.7h4.2c.55 0 1.06.3 1.3.75L16.3 7h2.2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="13" r="3.2" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default function UploadFlow() {
  const [photos, setPhotos] = useState<Record<Slot, string | null>>({ front: null, left: null, right: null });
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<Step>("capture");
  // Whose hairstyles the customer wants. Remembered on this device for next time.
  const [gender, setGender] = useState<HairGender | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  // Previews made earlier from the photo on screen, when the screen was brought back.
  const [earlier, setEarlier] = useState<EarlierPreview[]>([]);
  // True while a remembered result screen is being filled in again.
  const [restoring, setRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Which of STAGES the waiting screen is on.
  const [stage, setStage] = useState(0);
  // The photos the on-page camera is about to take; null while it is closed.
  const [cameraSlots, setCameraSlots] = useState<Slot[] | null>(null);
  // The shrunk JPEGs that actually get uploaded (photos{} above only holds
  // their data: URLs, for the on-screen previews).
  const blobs = useRef<Record<Slot, Blob | null>>({ front: null, left: null, right: null });
  // 17.10.2026: "Remove background" on the selfie. The photo as taken is kept
  // so the customer can go back to it.
  const [bgState, setBgState] = useState<"idle" | "working" | "done">("idle");
  const original = useRef<{ dataUrl: string; blob: Blob } | null>(null);
  const card = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(GENDER_KEY);
      if (saved === "men" || saved === "women") setGender(saved);
    } catch {
      // Storage blocked (private browsing): the customer just chooses again.
    }
  }, []);

  function chooseGender(value: HairGender) {
    setGender(value);
    try {
      window.localStorage.setItem(GENDER_KEY, value);
    } catch {
      // Not remembered; nothing else changes.
    }
  }

  const { session, loading: sessionLoading } = useSession();
  // 23.10.2026: no sign-in wall before the upload any more. A visitor without
  // a session gets an anonymous one when they first need it (ensureSession),
  // and is asked to create their account at checkout. If anonymous sign-ins
  // are switched off in Supabase, ensureSession returns null and the visitor
  // is sent to /login as before.
  const needsLogin = false;

  // Mock mode only: one demo id per browser, so repeated visits exercise
  // the free-preview cap the same way a real logged-in user would.
  const mockUserId = useMemo(() => getMockUserId(), []);

  const userId = session?.user.id ?? null;
  // Whose result screen this browser would be remembering.
  const owner = SUPABASE_MOCK_MODE ? mockUserId : userId;

  // Bring back the result screen this tab was showing (see the note at the
  // top of the file). The server says what previews exist and how many are
  // left; if it no longer knows the photo, the memory is dropped.
  /** No memory in this tab: rebuild the screen from the customer's latest hairstyles. */
  function restoreFromAccount(who: string) {
    let cancelled = false;
    setRestoring(true);
    (async () => {
      try {
        const res = await fetch("/api/previews", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ latest: true }),
        });
        if (!res.ok) return; // nothing made yet: the upload form, as before
        const data = await res.json();
        const l = data.latest as
          | {
              gender: HairGender;
              faceShape: ConfirmedDetails["faceShape"];
              length: string | null;
              texture: string | null;
              facialHair?: string | null;
              photoUrl: string | null;
            }
          | undefined;
        if (cancelled || !l || typeof data.photoId !== "string") return;
        const confirmed: ConfirmedDetails | null =
          l.length && l.texture
            ? {
                faceShape: l.faceShape,
                length: l.length as ConfirmedDetails["length"],
                texture: l.texture as ConfirmedDetails["texture"],
                facialHair: asFacialHair(l.facialHair),
              }
            : null;
        const details: PhotoDetails = {
          faceShape: l.faceShape,
          secondFaceShape: null,
          sure: "high",
          readBy: "reading",
          hair: { length: confirmed?.length ?? null, texture: confirmed?.texture ?? null },
          facialHair: asFacialHair(l.facialHair),
        };
        const thumb = (await makeThumb(l.photoUrl)) ?? l.photoUrl;
        if (cancelled) return;
        setGender(l.gender);
        setPhotos({ front: thumb, left: null, right: null });
        setEarlier(Array.isArray(data.previews) ? data.previews : []);
        setAnalysis({ photoId: data.photoId, previewsLeft: typeof data.previewsLeft === "number" ? data.previewsLeft : null, details });
        setStep("results");
        // Remember it for this tab, so a reload doesn't ask the server again.
        remember({ owner: who, photoId: data.photoId, gender: l.gender, details, confirmed, thumb: thumb?.startsWith("data:") ? thumb : null });
      } catch {
        // Couldn't reach the account: the upload form, as before.
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }

  const restored = useRef(false);
  useEffect(() => {
    if (restored.current || !owner) return;
    restored.current = true;
    const saved = recall();
    if (!saved) {
      if (!SUPABASE_MOCK_MODE && !wantsFresh()) return restoreFromAccount(owner);
      return;
    }
    if (saved.owner !== owner) {
      remember(null);
      return;
    }
    let cancelled = false;
    setRestoring(true);
    (async () => {
      try {
        const res = await fetch("/api/previews", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify(SUPABASE_MOCK_MODE ? { userId: owner, photoId: saved.photoId } : { photoId: saved.photoId }),
        });
        if (!res.ok) throw new Error("gone");
        const data = await res.json();
        if (cancelled) return;
        const details: PhotoDetails = saved.confirmed
          ? {
              // The customer already confirmed these: no need to ask again.
              faceShape: saved.confirmed.faceShape,
              secondFaceShape: null,
              sure: "high",
              readBy: "reading",
              hair: { length: saved.confirmed.length, texture: saved.confirmed.texture },
              facialHair: saved.confirmed.facialHair ?? saved.details.facialHair ?? null,
            }
          : saved.details;
        setGender(saved.gender);
        setPhotos({ front: saved.thumb, left: null, right: null });
        setEarlier(Array.isArray(data.previews) ? data.previews : []);
        setAnalysis({ photoId: saved.photoId, previewsLeft: typeof data.previewsLeft === "number" ? data.previewsLeft : null, details });
        setStep("results");
      } catch {
        remember(null);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [owner]);

  // 17.10.2026: no automatic reload to a newer site version (VersionWatch)
  // while a selfie is waiting to be sent, the camera is open or the photo is
  // being read — a reload would lose them.
  useEffect(() => {
    setReloadBlocked(step === "analyzing" || cameraSlots !== null || (step === "capture" && Boolean(photos.front)));
    return () => setReloadBlocked(false);
  }, [step, cameraSlots, photos.front]);

  const allUploaded = Boolean(photos.front);
  const canSubmit = allUploaded && consent && gender;

  async function handleFile(slot: Slot, file: Blob) {
    setError(null);
    try {
      const { dataUrl, blob, lightMessage } = await shrinkPhoto(file);
      if (lightMessage) {
        setError(`${slot === "front" ? "Your selfie" : `Your ${SLOT_LABEL[slot]} photo`} can't be used. ${lightMessage}`);
        return;
      }
      blobs.current[slot] = blob;
      setPhotos((prev) => ({ ...prev, [slot]: dataUrl }));
      if (slot === "front") {
        setBgState("idle");
        original.current = null;
      }
    } catch {
      setError("We couldn't read that photo. Please try a JPG or PNG image.");
    }
  }

  /**
   * 17.10.2026: put the person on a plain light background, so the customer
   * doesn't have to find a plain wall. The server removes the background
   * (/api/photo/background); the plain colour is added here.
   */
  async function removeBackground() {
    const front = photos.front;
    const blob = blobs.current.front;
    if (!front || !blob || bgState === "working") return;
    setError(null);
    setBgState("working");
    try {
      if (!SUPABASE_MOCK_MODE && !(await ensureSession())) {
        window.location.assign(loginUrl("/#upload"));
        return;
      }
      const res = await fetch("/api/photo/background", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify(SUPABASE_MOCK_MODE ? { userId: mockUserId, photo: front } : { photo: front }),
      });
      const data = await res.json();
      if (!res.ok || typeof data.image !== "string") throw new Error(data.error || "We couldn't remove the background. Please try again.");
      const cutout = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("We couldn't remove the background. Please try again."));
        img.src = data.image;
      });
      const canvas = document.createElement("canvas");
      canvas.width = cutout.naturalWidth;
      canvas.height = cutout.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("We couldn't remove the background on this phone.");
      ctx.fillStyle = PLAIN_BACKDROP;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(cutout, 0, 0);
      const plain = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("We couldn't remove the background on this phone."))), "image/jpeg", 0.9)
      );
      original.current = { dataUrl: front, blob };
      blobs.current.front = plain;
      setPhotos((prev) => ({ ...prev, front: canvas.toDataURL("image/jpeg", 0.9) }));
      setBgState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "We couldn't remove the background. Please try again.");
      setBgState("idle");
    }
  }

  /** Back to the selfie as it was taken. */
  function keepOriginalBackground() {
    if (!original.current) return;
    blobs.current.front = original.current.blob;
    setPhotos((prev) => ({ ...prev, front: original.current!.dataUrl }));
    original.current = null;
    setBgState("idle");
  }

  /** Open the camera for the selfie (or to retake it). */
  function openCamera() {
    setError(null);
    const empty = SLOTS.filter((slot) => !photos[slot]);
    setCameraSlots(empty.length > 0 ? empty : SLOTS);
  }

  /** Real mode: put the selfie in the customer's private storage folder. */
  async function uploadToStorage(userId: string): Promise<Record<Slot, string>> {
    const batch = crypto.randomUUID();
    const slots = SLOTS;
    const uploaded = await Promise.all(
      slots.map(async (slot) => {
        const blob = blobs.current[slot];
        if (!blob) throw new Error("Please add your selfie first.");
        const path = `${userId}/${batch}/${slot}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("photos")
          .upload(path, blob, { contentType: "image/jpeg", upsert: false });
        if (uploadError) {
          throw new Error("We couldn't upload your photos. Please check your connection and try again.");
        }
        return [slot, path] as const;
      })
    );
    return Object.fromEntries(uploaded) as Record<Slot, string>;
  }

  async function handleSubmit() {
    if (!gender) return;
    setError(null);
    setStage(0);
    setStep("analyzing");
    let stageStarted = Date.now();
    // Move the waiting screen on, once the current step has been up long enough to read.
    const nextStage = async (next: number) => {
      await pause(Math.max(0, STAGE_MIN_MS - (Date.now() - stageStarted)));
      setStage(next);
      stageStarted = Date.now();
    };
    try {
      // 23.10.2026: an anonymous session is started here if the visitor has none.
      const current = SUPABASE_MOCK_MODE ? null : await ensureSession();
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };

      let analyzeBody: Record<string, unknown>;
      if (SUPABASE_MOCK_MODE) {
        analyzeBody = { userId: mockUserId, consentGiven: consent, photoUrl: photos.front, gender };
      } else {
        if (!current) {
          window.location.assign(loginUrl("/#upload"));
          return;
        }
        const paths = await uploadToStorage(current.user.id);
        analyzeBody = { consentGiven: consent, storagePath: paths.front, extraPaths: [], gender };
      }

      await nextStage(1);
      const analyzeRes = await fetch("/api/analyze", { method: "POST", headers, body: JSON.stringify(analyzeBody) });
      const analyzeData = await analyzeRes.json();
      if (analyzeRes.status === 401) {
        window.location.assign(loginUrl("/#upload"));
        return;
      }
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analysis failed.");
      trackMeta("Lead"); // 21.10.2026: the photo was read — the hairstyle list is next.
      await nextStage(2);
      await pause(STAGE_MIN_MS);

      const details: PhotoDetails = {
        faceShape: analyzeData.faceShape,
        secondFaceShape: analyzeData.secondFaceShape ?? null,
        sure: analyzeData.sure ?? "low",
        readBy: analyzeData.readBy ?? "measurement",
        hair: { length: analyzeData.hair?.length ?? null, texture: analyzeData.hair?.texture ?? null },
        facialHair: asFacialHair(analyzeData.facialHair),
      };
      setEarlier([]);
      setAnalysis({
        photoId: analyzeData.photoId,
        previewsLeft: typeof analyzeData.previewsLeft === "number" ? analyzeData.previewsLeft : null,
        details,
      });
      const who = owner ?? current?.user.id ?? null;
      if (who) {
        remember({ owner: who, photoId: analyzeData.photoId, gender, details, confirmed: null, thumb: await makeThumb(photos.front) });
        setFresh(false);
      }
      setStep("results");
      // The list is long; bring its top into view rather than leaving the
      // customer where the button was.
      window.setTimeout(() => card.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong analyzing your photos.");
      setStep("capture");
    }
  }

  /** Ask for one preview: one style from the customer's list, on their photo. */
  async function makePreview(styleId: string, details: ConfirmedDetails): Promise<PreviewOutcome> {
    if (!analysis) throw new Error("no analysis");
    const headers = { "Content-Type": "application/json", ...(await authHeaders()) };
    const res = await fetch("/api/generate", {
      method: "POST",
      headers,
      body: JSON.stringify(
        SUPABASE_MOCK_MODE
          ? { userId: mockUserId, photoId: analysis.photoId, sourceImageUrl: photos.front, styleId, details }
          : { photoId: analysis.photoId, styleId, details }
      ),
    });
    const data = await res.json();
    if (res.status === 401) {
      window.location.assign(loginUrl("/#upload"));
      return { ok: false, noAllowance: false, rejected: false, message: "Please log in again to continue." };
    }
    if (res.status === 402) return { ok: false, noAllowance: true, rejected: false, message: "" };
    if (!res.ok) {
      return {
        ok: false,
        noAllowance: false,
        // previewRejected: the picture was made but failed the check against
        // the customer's photo twice, so it was not shown or counted.
        rejected: Boolean(data.previewRejected),
        message: data.previewRejected
          ? "This one didn't come out true to you, so we haven't shown it or counted it."
          : data.error || "This hairstyle couldn't be created. Please try again.",
      };
    }
    const left = typeof data.previewsLeft === "number" && !data.samplePreview ? data.previewsLeft : null;
    return { ok: true, imageUrl: data.resultImageUrl, sample: Boolean(data.samplePreview), previewsLeft: left, paid: Boolean(data.paid) };
  }

  /** 12.10.2026: the left side, right side and back of a paid preview. */
  async function makeViews(styleId: string): Promise<ViewsOutcome> {
    if (!analysis) throw new Error("no analysis");
    const res = await fetch("/api/generate/views", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(await authHeaders()) },
      body: JSON.stringify(
        SUPABASE_MOCK_MODE ? { userId: mockUserId, photoId: analysis.photoId, styleId } : { photoId: analysis.photoId, styleId }
      ),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, message: data.error || "The side and back views couldn't be made." };
    return { ok: true, state: data.state === "making" ? "making" : "done", views: data.views, message: data.error ?? null };
  }

  function startOver() {
    setStep("capture");
    setPhotos({ front: null, left: null, right: null });
    blobs.current = { front: null, left: null, right: null };
    original.current = null;
    setBgState("idle");
    setAnalysis(null);
    setEarlier([]);
    remember(null);
    setFresh(true);
    setConsent(false);
    setError(null);
    window.setTimeout(() => card.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  const missing = !gender
    ? "Choose men's or women's hairstyles to continue."
    : !allUploaded
      ? "Add your selfie to continue."
      : !consent
        ? "Tick the box above to continue."
        : "";

  // 13.10.2026 (owner): on a phone the whole upload card, button included,
  // must be on screen when a customer arrives here. So on phones only the
  // heading sits above the card; the intro and tips move below it. On a
  // computer the two-column layout is unchanged.
  const intro = (
    <>
      <p className="lead mt-5 max-w-[44ch]">
        One selfie, looking straight at the camera. Take it now, or upload one you already have.
        Your list of matched hairstyles is free.
      </p>
      <div className="mt-8 max-w-[44ch]">
        <h3 className="text-[17px] font-semibold">For a good result</h3>
        <ul className="mt-3 flex flex-col gap-2.5 text-[15.5px] leading-[1.55]">
          {TIPS.map((tip) => (
            <li key={tip} className="flex gap-3">
              <span className="mt-[9px] h-[6px] w-[6px] shrink-0 rounded-full bg-mint" aria-hidden="true" />
              <span>{tip}</span>
            </li>
          ))}
        </ul>
      </div>
    </>
  );

  return (
    <section id="upload" className="bg-mint-pale text-ink-body max-sm:!scroll-mt-[66px]">
      <div className="frame pb-12 pt-5 sm:py-20 lg:py-28">
        <div className="grid gap-x-16 gap-y-4 sm:gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-x-24">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="h-display max-sm:!text-[28px] max-sm:!leading-tight">Try it on your own face.</h2>
            <div className="hidden sm:block">{intro}</div>
          </div>

          <div ref={card} className="min-w-0 scroll-mt-24 rounded-[28px] bg-surface p-5 shadow-card sm:p-8 lg:p-10">
            {error && (
              <div className="mb-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[14.5px] font-medium text-danger">{error}</div>
            )}

            {step === "capture" && (sessionLoading || restoring) && (
              // Real mode only (mock mode never "loads"): hold the space for a
              // moment while we check whether the visitor is already logged in,
              // rather than flashing the upload frames and then swapping them out.
              <div className="flex min-h-[260px] items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
              </div>
            )}

            {step === "capture" && needsLogin && !restoring && (
              <div className="mx-auto max-w-[460px] py-8 text-center">
                <h3 className="mb-2 text-[24px] font-semibold">Log in to get your hairstyle list</h3>
                <p className="mb-7 text-[15.5px] leading-[1.6] text-ink-muted">
                  It takes a few seconds. Your photos and your hairstyle list are kept safely in your own account.
                </p>
                <a href={loginUrl("/#upload")} className="btn-primary w-full">
                  Log in or create an account
                </a>
              </div>
            )}

            {step === "capture" && !sessionLoading && !needsLogin && !restoring && (
              <div>
                <fieldset className="mb-4 sm:mb-7">
                  <legend className="text-[16px] font-semibold text-ink-heading sm:text-[17px]">Which hairstyles do you want to see?</legend>
                  <div role="radiogroup" aria-label="Which hairstyles do you want to see?" className="mt-2.5 grid grid-cols-2 gap-3 sm:mt-3">
                    {GENDER_OPTIONS.map((option) => {
                      const selected = gender === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          role="radio"
                          aria-checked={selected}
                          onClick={() => chooseGender(option.value)}
                          className={`rounded-[16px] border-[1.5px] px-3 py-2.5 font-heading text-[16px] sm:py-3.5 font-semibold leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-deep ${
                            selected
                              ? "border-mint bg-mint text-white"
                              : "border-line bg-surface text-ink-heading hover:border-ink-heading"
                          }`}
                        >
                          <span className="sm:hidden">{option.short}</span>
                          <span className="hidden sm:inline">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                {/* 12.10.2026: one selfie, so the frame sits beside its two
                    buttons instead of a tall frame with empty space beside it.
                    The frame and "Upload a photo" both open the same file
                    picker (on a phone: gallery or camera). */}
                <div className="border-t border-line pt-4 sm:pt-7">
                  <p className="text-[16px] font-semibold text-ink-heading sm:text-[17px]">Your selfie</p>
                  <div className="mt-2.5 flex items-stretch gap-4 sm:gap-6">
                    <label
                      htmlFor="selfieInput"
                      className={`group relative flex aspect-[3/4] w-[108px] shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-[18px] border-[1.5px] bg-bg-soft transition hover:border-mint sm:w-[168px] ${
                        photos.front ? "border-mint" : "border-dashed border-ink-muted/50"
                      }`}
                    >
                      {photos.front ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={photos.front} alt="Your selfie" className="absolute inset-0 h-full w-full object-cover" />
                          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-mint text-[13px] font-extrabold text-white shadow-card">
                            ✓
                          </span>
                        </>
                      ) : (
                        // A face-and-shoulders guide: what the photo should look like.
                        <svg viewBox="0 0 120 160" className="h-[82%] text-ink-muted/45" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="5 5" aria-hidden="true">
                          <ellipse cx="60" cy="64" rx="30" ry="38" />
                          <path d="M8 160c4-34 26-50 52-50s48 16 52 50" />
                        </svg>
                      )}
                    </label>
                    <div className="flex min-w-0 flex-1 flex-col justify-center gap-3">
                      <button type="button" className="btn-secondary w-full gap-2.5 !px-4 !py-3 max-sm:!text-[15px]" onClick={openCamera}>
                        <CameraIcon />
                        {allUploaded ? "Retake selfie" : "Take a selfie now"}
                      </button>
                      <label
                        htmlFor="selfieInput"
                        className="cursor-pointer text-center text-[14.5px] font-semibold text-mint-deep underline decoration-mint/40 underline-offset-4 hover:decoration-mint-deep"
                      >
                        {allUploaded ? "Choose a different photo" : "or upload a photo"}
                      </label>
                      {allUploaded && bgState !== "done" && (
                        <button
                          type="button"
                          className="btn-secondary w-full gap-2 !px-4 !py-2.5 max-sm:!text-[14.5px]"
                          disabled={bgState === "working"}
                          onClick={removeBackground}
                        >
                          {bgState === "working" ? "Removing background…" : "Remove background"}
                        </button>
                      )}
                      {allUploaded && bgState === "done" && (
                        <p className="text-center text-[13.5px] font-semibold text-mint-deep">
                          Background removed ·{" "}
                          <button type="button" className="font-semibold underline underline-offset-4" onClick={keepOriginalBackground}>
                            Undo
                          </button>
                        </p>
                      )}
                      <p className="text-center text-[13px] leading-[1.45] text-ink-muted">
                        Phone at arm&apos;s length, looking straight at it, head and shoulders in the picture.
                        {allUploaded && bgState === "idle" && " Busy background? Tap Remove background."}
                      </p>
                    </div>
                  </div>
                  <input
                    id="selfieInput"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile("front", file);
                      e.target.value = "";
                    }}
                  />
                </div>

                <div className="mt-4 flex items-start gap-3 rounded-[16px] bg-bg-soft p-3 sm:mt-7 sm:p-4">
                  <input
                    type="checkbox"
                    id="consentBox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-mint-deep"
                  />
                  <label htmlFor="consentBox" className="text-[14px] leading-[1.45] text-ink-body sm:text-[15px] sm:leading-[1.5]">
                    I agree to Tressform analysing my photo to recommend hairstyles suited to me.
                  </label>
                </div>

                <div className="mt-4 sm:mt-6">
                  <button className="btn-primary w-full" disabled={!canSubmit} onClick={handleSubmit}>
                    See my hairstyles
                  </button>
                  <p className="mt-2 min-h-[20px] text-center text-[13.5px] text-ink-muted sm:mt-3" aria-live="polite">
                    {missing}
                  </p>
                </div>
              </div>
            )}

            {step === "analyzing" && (
              <div className="flex flex-col items-center gap-7 py-6 sm:flex-row sm:justify-center sm:gap-10 sm:py-12">
                <div className="relative aspect-[3/4] w-[150px] shrink-0 overflow-hidden rounded-[18px] bg-bg-soft shadow-card sm:w-[170px]">
                  {photos.front && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos.front} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 h-[24%] animate-[scan-down_2.2s_ease-in-out_infinite] border-b-2 border-white/90 bg-gradient-to-b from-transparent to-mint/45 motion-reduce:hidden"
                  />
                </div>
                <div>
                  <ol className="flex flex-col gap-4" aria-live="polite">
                    {STAGES.map((label, i) => {
                      const state = i < stage ? "done" : i === stage ? "active" : "todo";
                      return (
                        <li key={label} className="flex items-center gap-3.5">
                          {state === "done" && (
                            <span className="flex h-7 w-7 shrink-0 animate-[pop-in_0.25s_ease-out] items-center justify-center rounded-full bg-mint text-white">
                              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                                <path d="m5 10.5 3.2 3.2L15 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </span>
                          )}
                          {state === "active" && (
                            <span className="h-7 w-7 shrink-0 animate-spin rounded-full border-[3px] border-mint-pale border-t-mint-deep" />
                          )}
                          {state === "todo" && <span className="h-7 w-7 shrink-0 rounded-full border-2 border-line" />}
                          <span
                            className={`text-[17px] leading-tight transition-colors duration-300 ${
                              state === "active"
                                ? "font-heading font-semibold text-ink-heading"
                                : state === "done"
                                  ? "text-ink-body"
                                  : "text-ink-muted"
                            }`}
                          >
                            {label}
                            <span className="sr-only">{state === "done" ? " (done)" : state === "active" ? " (in progress)" : ""}</span>
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                  <p className="mt-6 text-[14.5px] text-ink-muted">This takes a few seconds. Please keep this page open.</p>
                </div>
              </div>
            )}

            {step === "results" && analysis && gender && (
              <StylePicks
                gender={gender}
                frontPhoto={photos.front}
                initial={analysis.details}
                previewsLeft={analysis.previewsLeft}
                makePreview={makePreview}
                onStartOver={startOver}
                earlier={earlier}
                makeViews={makeViews}
                onDetails={(confirmed) => {
                  const saved = recall();
                  if (saved && saved.photoId === analysis.photoId) remember({ ...saved, confirmed });
                }}
              />
            )}
          </div>
          {step === "capture" && <div className="sm:hidden">{intro}</div>}
        </div>
      </div>
      {cameraSlots && (
        <SelfieCamera slots={cameraSlots} onCapture={handleFile} onClose={() => setCameraSlots(null)} />
      )}
    </section>
  );
}
