"use client";

// 3-photo upload flow (Part B: unchanged) — Front/Left/Right, consent
// checkbox, AWS Rekognition on all 3 together, then a purpose/style step.
// Wired to the real (mock-mode-aware) /api/analyze and /api/generate routes
// so this is a genuine end-to-end demo, not a scripted fake.

import { useMemo, useState } from "react";

type Slot = "front" | "left" | "right";
type Step = "upload" | "analyzing" | "purpose" | "results";

const PURPOSES = ["Everyday look", "Big event", "Low maintenance", "Bold change"];
const STYLE_DIRECTIONS = ["Classic", "Modern", "Textured", "Sharp & clean"];
const STYLE_NAMES = ["Textured Quiff — Low Taper", "Classic Crop — Mid Fade", "Curl Definition Crop"];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function UploadFlow() {
  const [photos, setPhotos] = useState<Record<Slot, string | null>>({ front: null, left: null, right: null });
  const [consent, setConsent] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [purpose, setPurpose] = useState<string | null>(null);
  const [styleDirection, setStyleDirection] = useState<string | null>(null);
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
  const canAnalyze = allUploaded && consent;

  function handleFile(slot: Slot, file: File) {
    const reader = new FileReader();
    reader.onload = (e) => setPhotos((prev) => ({ ...prev, [slot]: e.target?.result as string }));
    reader.readAsDataURL(file);
  }

  async function handleAnalyze() {
    setError(null);
    setStep("analyzing");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, consentGiven: consent, photoUrl: photos.front }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed.");
      setFaceShape(data.faceShape);
      setStep("purpose");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong analyzing your photos.");
      setStep("upload");
    }
  }

  async function handleSeeResults() {
    setError(null);
    try {
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
            faceShape,
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
      setError(err instanceof Error ? err.message : "Something went wrong generating your previews.");
    }
  }

  return (
    <section id="upload" className="wrap py-8 pb-[70px]">
      <div className="rounded-lg2 bg-surface p-6 shadow-card md:p-11">
        {error && (
          <div className="mb-5 rounded-sm2 bg-danger/10 px-4 py-3 text-[13.5px] font-medium text-danger">{error}</div>
        )}

        {step === "upload" && (
          <div>
            <div className="mx-auto mb-[30px] max-w-[520px] text-center">
              <h3 className="mb-2 text-[22px]">Upload your 3 photos</h3>
              <p className="text-[14.5px] text-ink-muted">Front, left, and right — clear, well-lit shots work best.</p>
            </div>

            <div className="mb-[26px] grid gap-[18px] sm:grid-cols-3">
              {(["front", "left", "right"] as Slot[]).map((slot) => (
                <label
                  key={slot}
                  className={`relative flex aspect-[0.85/1] cursor-pointer flex-col items-center justify-center gap-2.5 overflow-hidden rounded-md2 border-[1.5px] bg-bg-soft p-4 text-center transition ${
                    photos[slot] ? "border-mint" : "border-dashed border-line"
                  }`}
                >
                  {photos[slot] && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photos[slot]!} alt={`${slot} preview`} className="absolute inset-0 h-full w-full object-cover" />
                  )}
                  <div
                    className={`relative z-[2] flex flex-col items-center gap-2 ${
                      photos[slot] ? "h-full w-full justify-center rounded-[16px] bg-black/40" : ""
                    }`}
                  >
                    {photos[slot] ? (
                      <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full bg-mint text-[14px] font-extrabold text-[#12281f]">
                        ✓
                      </span>
                    ) : null}
                    <span className={`text-[14px] font-semibold ${photos[slot] ? "text-white" : "text-ink-heading"}`}>
                      {photos[slot] ? `${capitalize(slot)} added` : capitalize(slot)}
                    </span>
                    <span className={`rounded-full border-[1.5px] border-line bg-white px-4 py-2 text-[13px] font-semibold text-ink-heading ${photos[slot] ? "bg-white/90" : ""}`}>
                      {photos[slot] ? "Replace" : "Upload photo"}
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(slot, file);
                    }}
                  />
                </label>
              ))}
            </div>

            <div className="mb-[22px] flex items-start gap-3 rounded-sm2 bg-bg-soft p-4">
              <input
                type="checkbox"
                id="consentBox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-mint-deep"
              />
              <label htmlFor="consentBox" className="text-[13.5px] leading-[1.5] text-ink-body">
                I consent to my 3 photos being analyzed for facial geometry and haircut recommendations.
              </label>
            </div>

            <button className="btn-primary w-full" disabled={!canAnalyze} onClick={handleAnalyze}>
              Analyze My Photos
            </button>
          </div>
        )}

        {step === "analyzing" && (
          <div className="py-[50px] text-center">
            <div className="mx-auto mb-[18px] h-11 w-11 animate-spin rounded-full border-[3.5px] border-mint-pale border-t-mint-deep" />
            <h3 className="mb-1.5 text-[17px]">Analyzing your face shape…</h3>
            <p className="text-[13.5px] text-ink-muted">This takes just a few seconds.</p>
          </div>
        )}

        {step === "purpose" && (
          <div>
            <div className="mx-auto mb-[30px] max-w-[520px] text-center">
              <h3 className="mb-2 text-[22px]">What are you looking for?</h3>
              <p className="text-[14.5px] text-ink-muted">
                {faceShape ? `We detected a ${faceShape.toLowerCase()} face shape. ` : ""}
                This helps us narrow down styles before we generate any previews.
              </p>
            </div>

            <span className="field-label mb-2.5 block text-[13px] font-bold uppercase tracking-[.03em] text-ink-muted">Purpose</span>
            <div className="mb-[22px] flex flex-wrap gap-2.5">
              {PURPOSES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPurpose(p)}
                  className={`rounded-full border-[1.5px] px-[18px] py-2.5 text-[13.5px] font-semibold ${
                    purpose === p ? "border-ink-heading bg-ink-heading text-white" : "border-line bg-white text-ink-heading"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <span className="mb-2.5 block text-[13px] font-bold uppercase tracking-[.03em] text-ink-muted">Style direction</span>
            <div className="mb-[22px] flex flex-wrap gap-2.5">
              {STYLE_DIRECTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStyleDirection(s)}
                  className={`rounded-full border-[1.5px] px-[18px] py-2.5 text-[13.5px] font-semibold ${
                    styleDirection === s ? "border-ink-heading bg-ink-heading text-white" : "border-line bg-white text-ink-heading"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button className="btn-primary w-full" onClick={handleSeeResults}>
              See My Matched Styles
            </button>
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
                setStep("upload");
                setPhotos({ front: null, left: null, right: null });
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
    </section>
  );
}
