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

import { useMemo, useState } from "react";

type Slot = "front" | "left" | "right";
type Step = "capture" | "analyzing" | "results";

const OPTIONS = [
  "Everyday",
  "Professional",
  "Look Younger",
  "Wedding",
  "Trendy",
  "Low Maintenance",
  "Bold",
  "Classic",
];

const STYLE_NAMES = ["Textured Quiff — Low Taper", "Classic Crop — Mid Fade", "Curl Definition Crop"];

const SLOT_LABEL: Record<Slot, string> = { front: "Front", left: "Left", right: "Right" };

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
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [faceShape, setFaceShape] = useState<string | null>(null);
  const [results, setResults] = useState<{ styleName: string; imageUrl: string | null }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // One mock user id per browser session, so repeated visits exercise the
  // free-preview cap the same way a real logged-in user would.
  const userId = useMemo(() => {
    if (typeof window === "undefined") return "ssr-user";
    const existing = window.localStorage?.getItem("tressform_mock_user_id");
    if (existing) return existing;
    const id = `demo_${Math.random().toString(36).slice(2, 10)}`;
    try {
      window.localStorage?.setItem("tressform_mock_user_id", id);
    } catch {
      /* private browsing / storage blocked — fine, just not persisted */
    }
    return id;
  }, []);

  const allUploaded = photos.front && photos.left && photos.right;
  const canSubmit = allUploaded && consent;

  function toggleOption(opt: string) {
    setSelectedOptions((prev) => (prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]));
  }

  function PillRow({
    options,
    selected,
    onToggle,
  }: {
    options: string[];
    selected: string[];
    onToggle: (v: string) => void;
  }) {
    return (
      <div className="flex flex-wrap justify-center gap-2.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-full border-[1.5px] px-[18px] py-2.5 text-[13.5px] font-semibold ${
              selected.includes(opt)
                ? "border-ink-heading bg-ink-heading text-white"
                : "border-line bg-white text-ink-heading"
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    );
  }

  function handleFile(slot: Slot, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setPhotos((prev) => ({ ...prev, [slot]: e.target?.result as string }));
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    setError(null);
    setStep("analyzing");
    try {
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, consentGiven: consent, photoUrl: photos.front }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error || "Analysis failed.");
      setFaceShape(analyzeData.faceShape);

      const generated: { styleName: string; imageUrl: string | null }[] = [];
      for (const styleName of STYLE_NAMES) {
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            photoId: "demo-photo",
            sourceImageUrl: photos.front,
            styleName,
            faceShape: analyzeData.faceShape,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          // Free-preview cap hit mid-loop — stop and show what we have, with
          // a clear message rather than a silent failure.
          setError(data.error || "Could not generate more previews.");
          break;
        }
        generated.push({ styleName, imageUrl: data.resultImageUrl });
      }
      setResults(generated);
      setStep("results");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong analyzing your photos.");
      setStep("capture");
    }
  }

  return (
    <section id="upload" className="wrap py-8 pb-[70px]">
      <div className="rounded-lg2 bg-surface p-6 shadow-card md:p-11">
        {error && (
          <div className="mb-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[13.5px] font-medium text-danger">{error}</div>
        )}

        {step === "capture" && (
          <div>
            <div className="mx-auto mb-2 max-w-[560px] text-center">
              <h3 className="mb-2 text-[22px]">Take 3 Selfies or Upload Your Photos</h3>
              <p className="text-[13px] font-semibold text-ink-muted">
                Good lighting &bull; No glasses/sunglasses &bull; No cap or hat &bull; Face clearly visible
              </p>
            </div>

            {/* 24.09.2026: per feedback, these buttons were greyed out / not
                clickable — the "Upload / Click Selfie" pill sat OUTSIDE the
                <label> that wraps the file input, so it was purely
                decorative text, not an actual control. The whole column
                (frame + pill) is now one <label>, so clicking either part
                opens the file picker. */}
            <div className="mx-auto mb-[10px] mt-[26px] grid max-w-[720px] gap-5 sm:grid-cols-3">
              {(["front", "left", "right"] as Slot[]).map((slot) => (
                <label key={slot} className="flex cursor-pointer flex-col items-center gap-2.5">
                  <div
                    className={`relative flex aspect-[3/4] w-full flex-col items-center justify-center gap-2.5 overflow-hidden rounded-md2 border-[1.5px] bg-bg-soft p-4 text-center transition ${
                      photos[slot] ? "border-mint" : "border-dashed border-line"
                    }`}
                  >
                    {photos[slot] && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={photos[slot]!}
                        alt={`${SLOT_LABEL[slot]} preview`}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    )}
                    <div
                      className={`relative z-[2] flex flex-col items-center gap-2 ${
                        photos[slot] ? "h-full w-full justify-center rounded-[16px] bg-black/40" : ""
                      }`}
                    >
                      <span
                        className={`flex h-9 w-9 items-center justify-center rounded-full ${
                          photos[slot] ? "bg-mint text-[#12281f]" : "bg-white text-ink-muted"
                        }`}
                      >
                        {photos[slot] ? <span className="text-[14px] font-extrabold">✓</span> : <CameraIcon />}
                      </span>
                      <span className={`text-[14px] font-semibold ${photos[slot] ? "text-white" : "text-ink-heading"}`}>
                        {SLOT_LABEL[slot]}
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink-heading">
                    {photos[slot] ? "Replace photo" : "Upload / Click Selfie"}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="user"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(slot, file);
                    }}
                  />
                </label>
              ))}
            </div>

            <p className="mt-3 text-center text-[12.5px] text-ink-muted">
              We&apos;ll analyse all three views together for a more accurate hairstyle match.
            </p>

            <div className="mx-auto mt-7 max-w-[640px]">
              <PillRow options={OPTIONS} selected={selectedOptions} onToggle={toggleOption} />
            </div>

            <div className="mx-auto mb-[22px] mt-6 flex max-w-[640px] items-start gap-3 rounded-sm2 bg-bg-soft p-4">
              <input
                type="checkbox"
                id="consentBox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-mint-deep"
              />
              <label htmlFor="consentBox" className="text-[13.5px] font-semibold leading-[1.5] text-ink-body">
                I agree to Tressform analysing my photos to recommend hairstyles suited to me.
              </label>
            </div>

            <div className="mx-auto max-w-[420px]">
              <button className="btn-primary w-full" disabled={!canSubmit} onClick={handleSubmit}>
                Upload
              </button>
            </div>
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-[50px] text-center">
            <div className="mx-auto mb-[18px] h-11 w-11 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
            <h3 className="mb-1.5 text-[17px]">Analyzing your face shape…</h3>
            <p className="text-[13.5px] text-ink-muted">This takes just a few seconds.</p>
          </div>
        )}

        {step === "results" && (
          <div>
            <div className="mx-auto mb-[26px] max-w-[560px] text-center">
              <h3 className="mb-2 text-[22px]">Your matched styles</h3>
              <p className="text-[14.5px] text-ink-muted">
                Based on your {faceShape ? faceShape.toLowerCase() : ""} face shape and preferences.
              </p>
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              {results.map((r) => (
                <div key={r.styleName} className="card">
                  {r.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.imageUrl} alt={r.styleName} className="mb-3 w-full rounded-sm2" />
                  )}
                  <p className="text-[13.5px] font-semibold text-ink-heading">{r.styleName}</p>
                </div>
              ))}
            </div>
            <button
              className="btn-secondary mt-6 w-full"
              onClick={() => {
                setStep("capture");
                setPhotos({ front: null, left: null, right: null });
                setConsent(false);
                setResults([]);
                setError(null);
                setSelectedOptions([]);
              }}
            >
              Start over
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
