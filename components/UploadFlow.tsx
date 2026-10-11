"use client";

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

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { SUPABASE_MOCK_MODE, authHeaders, getMockUserId, loginUrl, useSession } from "@/lib/authClient";
import SelfieCamera from "./SelfieCamera";
import { readLight } from "@/lib/photoLight";

type Slot = "front" | "left" | "right";
type Step = "capture" | "analyzing" | "results";
type PreviewCard = { styleName: string; imageUrl: string | null; state: "loading" | "done" | "failed" };

const TIPS = [
  "Face a window or a light, so your face is evenly lit.",
  "Hold the phone at eye level, not from below.",
  "No glasses, cap or hat, and keep your hair off your face.",
];

const STYLE_NAMES = ["Textured Quiff — Low Taper", "Classic Crop — Mid Fade", "Curl Definition Crop"];

const SLOT_LABEL: Record<Slot, string> = { front: "Front", left: "Left", right: "Right" };
const SLOTS: Slot[] = ["front", "left", "right"];

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
  const [faceShape, setFaceShape] = useState<string | null>(null);
  const [results, setResults] = useState<PreviewCard[]>([]);
  // True when the customer got fewer previews than there are styles because
  // their free allowance ran out — shown as a friendly note, not an error.
  const [allowanceSpent, setAllowanceSpent] = useState(false);
  // Real mode: how many free previews this account has left, looked up when
  // the page loads. null = not known (logged out, mock mode, or still loading).
  const [previewsLeft, setPreviewsLeft] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [samplePreviews, setSamplePreviews] = useState(false);
  // What the spinner screen says — real previews take 10–30 seconds each, so
  // "Analyzing…" alone would sit there long enough to look stuck.
  // Which of STAGES the waiting screen is on.
  const [stage, setStage] = useState(0);
  // The photos the on-page camera is about to take; null while it is closed.
  const [cameraSlots, setCameraSlots] = useState<Slot[] | null>(null);
  // The shrunk JPEGs that actually get uploaded (photos{} above only holds
  // their data: URLs, for the on-screen previews).
  const blobs = useRef<Record<Slot, Blob | null>>({ front: null, left: null, right: null });

  const { session, loading: sessionLoading } = useSession();
  const needsLogin = !SUPABASE_MOCK_MODE && !sessionLoading && !session;

  // Mock mode only: one demo id per browser, so repeated visits exercise
  // the free-preview cap the same way a real logged-in user would.
  const mockUserId = useMemo(() => getMockUserId(), []);

  const userId = session?.user.id ?? null;
  useEffect(() => {
    if (SUPABASE_MOCK_MODE || !userId) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("free_previews_used, free_previews_limit")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled || !data) return;
        setPreviewsLeft(Math.max(0, data.free_previews_limit - data.free_previews_used));
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const noPreviewsLeft = previewsLeft === 0;
  const allUploaded = photos.front && photos.left && photos.right;
  const canSubmit = allUploaded && consent && !noPreviewsLeft;

  async function handleFile(slot: Slot, file: Blob) {
    setError(null);
    try {
      const { dataUrl, blob, lightMessage } = await shrinkPhoto(file);
      if (lightMessage) {
        setError(`Your ${SLOT_LABEL[slot]} photo can't be used. ${lightMessage}`);
        return;
      }
      blobs.current[slot] = blob;
      setPhotos((prev) => ({ ...prev, [slot]: dataUrl }));
    } catch {
      setError("We couldn't read that photo. Please try a JPG or PNG image.");
    }
  }

  /** Open the camera for the photos still missing, or for all three to redo them. */
  function openCamera() {
    setError(null);
    const empty = SLOTS.filter((slot) => !photos[slot]);
    setCameraSlots(empty.length > 0 ? empty : SLOTS);
  }

  /** Real mode: put the three photos in the customer's private storage folder. */
  async function uploadToStorage(userId: string): Promise<Record<Slot, string>> {
    const batch = crypto.randomUUID();
    const slots = ["front", "left", "right"] as Slot[];
    const uploaded = await Promise.all(
      slots.map(async (slot) => {
        const blob = blobs.current[slot];
        if (!blob) throw new Error("Please add all three photos first.");
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
    setError(null);
    setSamplePreviews(false);
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
      const headers = { "Content-Type": "application/json", ...(await authHeaders()) };

      let analyzeBody: Record<string, unknown>;
      if (SUPABASE_MOCK_MODE) {
        analyzeBody = { userId: mockUserId, consentGiven: consent, photoUrl: photos.front };
      } else {
        if (!session) {
          window.location.assign(loginUrl("/#upload"));
          return;
        }
        const paths = await uploadToStorage(session.user.id);
        analyzeBody = { consentGiven: consent, storagePath: paths.front, extraPaths: [paths.left, paths.right] };
      }

      await nextStage(1);
      const analyzeRes = await fetch("/api/analyze", { method: "POST", headers, body: JSON.stringify(analyzeBody) });
      const analyzeData = await analyzeRes.json();
      if (analyzeRes.status === 401) {
        window.location.assign(loginUrl("/#upload"));
        return;
      }
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analysis failed.");
      setFaceShape(analyzeData.faceShape);
      await nextStage(2);
      await pause(STAGE_MIN_MS);

      // How many previews to start: all of them, unless the analysis says
      // the customer has fewer free ones left than there are styles.
      const left: number | null = typeof analyzeData.previewsLeft === "number" ? analyzeData.previewsLeft : null;
      const styles = left === null ? STYLE_NAMES : STYLE_NAMES.slice(0, left);
      setAllowanceSpent(styles.length < STYLE_NAMES.length);
      setResults(styles.map((styleName) => ({ styleName, imageUrl: null, state: "loading" })));
      setStep("results");

      const finish = (styleName: string, patch: Partial<PreviewCard>) =>
        setResults((prev) => prev.map((r) => (r.styleName === styleName ? { ...r, ...patch } : r)));

      // All previews at once; each card fills in as soon as its image is ready.
      await Promise.all(
        styles.map(async (styleName) => {
          try {
            const res = await fetch("/api/generate", {
              method: "POST",
              headers,
              body: JSON.stringify(
                SUPABASE_MOCK_MODE
                  ? {
                      userId: mockUserId,
                      photoId: "demo-photo",
                      sourceImageUrl: photos.front,
                      styleName,
                      faceShape: analyzeData.faceShape,
                    }
                  : { photoId: analyzeData.photoId, styleName, faceShape: analyzeData.faceShape }
              ),
            });
            const data = await res.json();
            if (res.status === 402) {
              // Allowance ran out between the analysis and this request —
              // drop the card and show the same friendly note.
              setResults((prev) => prev.filter((r) => r.styleName !== styleName));
              setAllowanceSpent(true);
              return;
            }
            if (!res.ok) {
              finish(styleName, { state: "failed" });
              setError(data.error || "One of your previews couldn't be created.");
              return;
            }
            finish(styleName, { state: "done", imageUrl: data.resultImageUrl });
            if (data.samplePreview) setSamplePreviews(true);
            if (typeof data.freePreviewsUsed === "number" && typeof data.freePreviewsLimit === "number" && !data.samplePreview) {
              setPreviewsLeft(Math.max(0, data.freePreviewsLimit - data.freePreviewsUsed));
            }
          } catch {
            finish(styleName, { state: "failed" });
            setError("One of your previews couldn't be created. Please check your connection and try again.");
          }
        })
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong analyzing your photos.");
      setStep("capture");
    }
  }

  const missing = !allUploaded
    ? "Add all three photos to continue."
    : !consent
      ? "Tick the box above to continue."
      : "";

  return (
    <section id="upload" className="bg-mint-pale text-ink-body">
      <div className="frame py-16 sm:py-20 lg:py-28">
        <div className="grid gap-x-16 gap-y-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] xl:gap-x-24">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <h2 className="h-display">Try it on your own face.</h2>
            <p className="lead mt-5 max-w-[44ch]">
              Three photos: front, left and right. Take them now with your camera, or upload ones you already have.
              Your first preview is free.
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
          </div>

          <div className="min-w-0 rounded-[28px] bg-surface p-5 shadow-card sm:p-8 lg:p-10">
            {error && (
              <div className="mb-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[14.5px] font-medium text-danger">{error}</div>
            )}

            {step === "capture" && sessionLoading && (
              // Real mode only (mock mode never "loads"): hold the space for a
              // moment while we check whether the visitor is already logged in,
              // rather than flashing the upload frames and then swapping them out.
              <div className="flex min-h-[260px] items-center justify-center">
                <div className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
              </div>
            )}

            {step === "capture" && needsLogin && (
              <div className="mx-auto max-w-[460px] py-8 text-center">
                <h3 className="mb-2 text-[24px] font-semibold">Log in to get your free previews</h3>
                <p className="mb-7 text-[15.5px] leading-[1.6] text-ink-muted">
                  It takes a few seconds. Your free previews and your photos are kept safely in your own account.
                </p>
                <a href={loginUrl("/#upload")} className="btn-primary w-full">
                  Log in or create an account
                </a>
              </div>
            )}

            {step === "capture" && !sessionLoading && !needsLogin && (
              <div>
                <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2 sm:mb-6">
                  <button type="button" className="btn-secondary gap-2.5 !px-6 !py-3" onClick={openCamera}>
                    <CameraIcon />
                    {allUploaded ? "Retake selfies" : "Take selfies now"}
                  </button>
                  <span className="text-[14.5px] text-ink-muted">or tap a frame to upload a photo</span>
                </div>

                {/* The whole column (frame + caption) is one <label>, so a tap
                    anywhere on it opens the file picker (on a phone: gallery
                    or camera, the customer's choice). */}
                <div className="grid grid-cols-3 gap-3 sm:gap-5">
                  {(["front", "left", "right"] as Slot[]).map((slot) => (
                    <label key={slot} className="group flex cursor-pointer flex-col gap-2.5 text-center">
                      <div
                        className={`relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2 overflow-hidden rounded-[18px] border-[1.5px] bg-bg-soft transition group-hover:border-mint group-focus-within:border-mint ${
                          photos[slot] ? "border-mint" : "border-dashed border-ink-muted/50"
                        }`}
                      >
                        {photos[slot] ? (
                          <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={photos[slot]!}
                              alt={`${SLOT_LABEL[slot]} photo`}
                              className="absolute inset-0 h-full w-full object-cover"
                            />
                            <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-mint text-[13px] font-extrabold text-white shadow-card">
                              ✓
                            </span>
                          </>
                        ) : (
                          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-ink-muted shadow-card">
                            <CameraIcon />
                          </span>
                        )}
                      </div>
                      <span className="text-[15px] font-semibold leading-tight text-ink-heading">{SLOT_LABEL[slot]}</span>
                      <span className="-mt-1.5 text-[13.5px] font-medium text-mint-deep underline decoration-mint/40 underline-offset-4">
                        {photos[slot] ? "Change photo" : "Upload photo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFile(slot, file);
                          e.target.value = "";
                        }}
                      />
                    </label>
                  ))}
                </div>

                <div className="mt-7 flex items-start gap-3 rounded-[16px] bg-bg-soft p-4">
                  <input
                    type="checkbox"
                    id="consentBox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-0.5 h-5 w-5 shrink-0 accent-mint-deep"
                  />
                  <label htmlFor="consentBox" className="text-[15px] leading-[1.5] text-ink-body">
                    I agree to Tressform analysing my photos to recommend hairstyles suited to me.
                  </label>
                </div>

                <div className="mt-6">
                  {noPreviewsLeft ? (
                    <div className="rounded-[16px] bg-bg-soft px-5 py-5 text-center">
                      <p className="mb-4 text-[15px] font-medium text-ink-body">
                        You&apos;ve used your free previews. Choose a pack to see more styles on your own photo.
                      </p>
                      <a href="#pricing" className="btn-primary w-full sm:w-auto">
                        See packs
                      </a>
                    </div>
                  ) : (
                    <>
                      <button className="btn-primary w-full" disabled={!canSubmit} onClick={handleSubmit}>
                        See my preview
                      </button>
                      <p className="mt-3 min-h-[20px] text-center text-[13.5px] text-ink-muted" aria-live="polite">
                        {missing}
                      </p>
                    </>
                  )}
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

            {step === "results" && (
              <div>
                <div className="mb-6">
                  <h3 className="text-[26px] font-semibold leading-tight">
                    {results.length === 1 ? "Your preview" : "Your previews"}
                  </h3>
                  {faceShape && (
                    <p className="mt-1.5 text-[15.5px] text-ink-muted">
                      Chosen for your {faceShape.toLowerCase()} face shape.
                    </p>
                  )}
                  {samplePreviews && !SUPABASE_MOCK_MODE && (
                    <p className="mt-3 rounded-sm2 bg-bg-soft px-4 py-2.5 text-[13.5px] font-medium text-ink-muted">
                      These are placeholder images while we finish switching on live previews. They don&apos;t use
                      up your free previews.
                    </p>
                  )}
                </div>
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map((r) => (
                    <figure key={r.styleName}>
                      {r.state === "done" && r.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.imageUrl} alt={r.styleName} className="w-full rounded-[18px]" />
                      ) : (
                        <div className="flex aspect-[3/4] w-full flex-col items-center justify-center gap-3 rounded-[18px] bg-bg-soft px-4 text-center">
                          {r.state === "loading" ? (
                            <>
                              <div className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
                              <p className="text-[14px] font-medium text-ink-muted">Creating your preview…</p>
                            </>
                          ) : (
                            <p className="text-[14px] font-medium text-ink-muted">
                              This preview couldn&apos;t be created. Start over to try again.
                            </p>
                          )}
                        </div>
                      )}
                      <figcaption className="mt-3 text-[15px] font-semibold text-ink-heading">{r.styleName}</figcaption>
                    </figure>
                  ))}
                </div>
                {allowanceSpent && !results.some((r) => r.state === "loading") && (
                  <div className="mt-7 rounded-[16px] bg-bg-soft px-5 py-5 text-center">
                    <p className="mb-4 text-[15px] font-medium text-ink-body">
                      {results.length > 0
                        ? "Those were your free previews. Choose a pack to see more styles on your own photo."
                        : "You've already used your free previews. Choose a pack to see more styles on your own photo."}
                    </p>
                    <a href="#pricing" className="btn-primary">
                      See packs
                    </a>
                  </div>
                )}
                <button
                  className="btn-secondary mt-6 w-full"
                  onClick={() => {
                    setStep("capture");
                    setPhotos({ front: null, left: null, right: null });
                    blobs.current = { front: null, left: null, right: null };
                    setSamplePreviews(false);
                    setAllowanceSpent(false);
                    setConsent(false);
                    setResults([]);
                    setError(null);
                  }}
                >
                  Start over
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      {cameraSlots && (
        <SelfieCamera slots={cameraSlots} onCapture={handleFile} onClose={() => setCameraSlots(null)} />
      )}
    </section>
  );
}
