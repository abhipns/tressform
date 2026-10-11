"use client";

// The in-page selfie camera (11.10.2026, asked for by the owner: "the photo
// upload section should also have a click selfie button").
//
// Before this, a customer on a computer could only pick a file, and a
// customer on a phone was sent to the phone's camera app three separate
// times. This opens the camera on the page itself and walks through the
// photos one after another: look straight, turn left, turn right.
//
// Three things it does on purpose:
//   - A 3-second countdown before every photo. For the two side photos the
//     customer has turned their head and cannot see the screen, so they
//     need time to press the button and then pose.
//   - An outline to line the face up with, so the three photos are framed
//     the same way and the face is large enough to analyse.
//   - The picture on screen is mirrored, the way a selfie camera always is,
//     but the photo that is saved is not: left stays left.
//
// 11.10.2026 (later): it also watches the light. Twice a second it measures
// the picture (lib/photoLight.ts) and says, on the picture itself, whether
// the light is good or what is wrong with it: too dark, light behind the
// head, one side in shadow, too much light. The button will not take a
// photo while the light is poor, and a photo that turns out poor anyway
// (the light changed during the countdown) can only be retaken. The owner
// asked for this after the site accepted a selfie he took in bad light.
//
// If the browser will not open the camera (permission refused, no camera,
// or an in-app browser that does not allow it), it says so in plain words
// and the customer can still upload photos from the frames underneath.

import { useCallback, useEffect, useRef, useState } from "react";
import { GUIDE_OVAL, readLightFrom, type LightReading } from "@/lib/photoLight";

export type SelfieSlot = "front" | "left" | "right";

const STEPS: Record<SelfieSlot, { label: string; title: string; hint: string }> = {
  front: {
    label: "Front",
    title: "Look straight at the camera",
    hint: "Keep your whole face and your hair inside the outline.",
  },
  left: {
    label: "Left",
    title: "Turn your head to your left",
    hint: "Show the side of your face, with your ear and the hair around it.",
  },
  right: {
    label: "Right",
    title: "Turn your head to your right",
    hint: "Show the other side of your face, with your ear and the hair around it.",
  },
};

const COUNTDOWN_FROM = 3;
const PHOTO_RATIO = 3 / 4; // width / height — the same shape as the frames on the page
const LIGHT_CHECK_MS = 450;

/** The middle of the camera picture, in the 3:4 shape that is shown and saved. */
function visibleArea(video: HTMLVideoElement) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  let sw = vw;
  let sh = vh;
  if (vw / vh > PHOTO_RATIO) sw = Math.round(vh * PHOTO_RATIO);
  else sh = Math.round(vw / PHOTO_RATIO);
  return { sx: (vw - sw) / 2, sy: (vh - sh) / 2, sw, sh };
}

type Status = "starting" | "live" | "denied" | "unavailable";

export default function SelfieCamera({
  slots,
  onCapture,
  onClose,
}: {
  /** The photos to take, in order. */
  slots: SelfieSlot[];
  onCapture: (slot: SelfieSlot, photo: Blob) => void;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const shutterRef = useRef<HTMLButtonElement>(null);
  const [status, setStatus] = useState<Status>("starting");
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState<number | null>(null);
  const [shot, setShot] = useState<{ blob: Blob; url: string; lightMessage: string | null } | null>(null);
  // What the light looks like right now; null until the first measurement.
  const [light, setLight] = useState<LightReading | null>(null);
  const [attempt, setAttempt] = useState(0);

  const slot = slots[index];
  const step = STEPS[slot];

  // Open the camera; close it again when this screen goes away.
  useEffect(() => {
    let cancelled = false;
    setStatus("starting");
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unavailable");
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: "user", width: { ideal: 1920 }, height: { ideal: 1080 } },
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play().catch(() => undefined);
        }
        setStatus("live");
      } catch (err) {
        if (cancelled) return;
        const name = (err as { name?: string })?.name;
        setStatus(name === "NotAllowedError" || name === "SecurityError" ? "denied" : "unavailable");
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  // The page behind must not scroll, and Esc closes.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  useEffect(() => {
    if (status === "live" && !shot && count === null) shutterRef.current?.focus();
  }, [status, shot, count, index]);

  // The front photo is judged on both cheeks; a side-on photo is not,
  // because there one "cheek" is hair.
  const judgeSides = slot === "front";

  // Watch the light while the camera is showing.
  useEffect(() => {
    if (status !== "live" || shot) return;
    let last: string | null | undefined;
    const measure = () => {
      const video = videoRef.current;
      if (!video || !video.videoWidth) return;
      const reading = readLightFrom(video, visibleArea(video), GUIDE_OVAL, { sides: judgeSides });
      if (!reading) return;
      // Only change what the screen says when two measurements in a row
      // agree, so it does not flicker as the customer moves.
      if (last === undefined || reading.problem === last) setLight(reading);
      last = reading.problem;
    };
    measure();
    const timer = window.setInterval(measure, LIGHT_CHECK_MS);
    return () => window.clearInterval(timer);
  }, [status, shot, judgeSides]);

  const takePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    // Save the part of the picture the customer could see: the middle,
    // in the same 3:4 shape as the frame on screen.
    const area = visibleArea(video);
    const canvas = document.createElement("canvas");
    canvas.width = area.sw;
    canvas.height = area.sh;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, area.sx, area.sy, area.sw, area.sh, 0, 0, area.sw, area.sh);
    // Measure the light on the photo itself: it may have changed during the countdown.
    const reading = readLightFrom(canvas, { sx: 0, sy: 0, sw: area.sw, sh: area.sh }, GUIDE_OVAL, { sides: judgeSides });
    canvas.toBlob(
      (blob) => {
        if (blob) setShot({ blob, url: URL.createObjectURL(blob), lightMessage: reading?.message ?? null });
      },
      "image/jpeg",
      0.92
    );
  }, [judgeSides]);

  // 3 … 2 … 1 … photo.
  useEffect(() => {
    if (count === null) return;
    if (count === 0) {
      takePhoto();
      setCount(null);
      return;
    }
    const timer = window.setTimeout(() => setCount((c) => (c === null ? null : c - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [count, takePhoto]);

  function discardShot() {
    if (shot) URL.revokeObjectURL(shot.url);
    setShot(null);
  }

  function keepShot() {
    if (!shot || shot.lightMessage) return;
    onCapture(slot, shot.blob);
    URL.revokeObjectURL(shot.url);
    setShot(null);
    if (index + 1 >= slots.length) onClose();
    else setIndex(index + 1);
  }

  const blocked = status === "denied" || status === "unavailable";
  const lightMessage = !shot && status === "live" ? (light?.message ?? null) : null;
  const lightKnown = !shot && status === "live" && light !== null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Take your photos"
      className="fixed inset-0 z-[100] flex flex-col bg-[#0B120E] text-white"
    >
      <div className="mx-auto flex h-full w-full max-w-[560px] flex-col px-4 pb-5 pt-3 sm:px-6 sm:pb-7 sm:pt-5">
        <div className="flex items-center justify-between gap-4">
          <p className="text-[14.5px] font-semibold text-white/70">
            {blocked ? "Camera" : `Photo ${index + 1} of ${slots.length}: ${step.label}`}
          </p>
          <button
            type="button"
            onClick={onClose}
            className="-mr-2 rounded-full px-3 py-2 text-[15px] font-semibold text-white/80 transition hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-white"
          >
            Close
          </button>
        </div>

        {blocked ? (
          <div className="flex flex-1 flex-col items-center justify-center text-center">
            <h2 className="font-heading text-[26px] font-semibold leading-tight text-white">We couldn&apos;t open your camera</h2>
            <p className="mt-3 max-w-[40ch] text-[16px] leading-[1.6] text-white/70">
              {status === "denied"
                ? "Your browser blocked the camera. Allow camera access for this site in the address bar, then try again."
                : "This browser can't use the camera here. You can still upload photos you already have."}
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button type="button" className="btn-amber !px-7 !py-3.5" onClick={() => setAttempt((n) => n + 1)}>
                Try again
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-full border border-white/30 px-7 py-3.5 font-heading text-[17px] font-semibold text-white transition hover:bg-white/10"
              >
                Upload photos instead
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative mx-auto mt-3 min-h-0 w-full flex-1">
              {/* The frame keeps the 3:4 shape of the saved photo at whatever
                  size fits the screen. */}
              <div className="relative mx-auto aspect-[3/4] h-full max-w-full overflow-hidden rounded-[24px] bg-black">
                {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${shot ? "invisible" : ""}`}
                />
                {shot && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={shot.url} alt={`Your ${step.label.toLowerCase()} photo`} className="absolute inset-0 h-full w-full -scale-x-100 object-cover" />
                )}
                {!shot && status === "live" && (
                  <svg viewBox="0 0 300 400" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
                    <ellipse cx="150" cy="178" rx="92" ry="128" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth="2.5" strokeDasharray="9 9" />
                  </svg>
                )}
                {lightKnown && count === null && (
                  <p
                    aria-live="polite"
                    className={`absolute inset-x-3 top-3 flex items-start gap-2.5 rounded-[14px] px-3.5 py-2.5 text-[14.5px] font-semibold leading-[1.35] shadow-card ${
                      lightMessage ? "bg-lilac text-header-dark" : "bg-black/55 text-white backdrop-blur-[2px]"
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`mt-[5px] h-2.5 w-2.5 shrink-0 rounded-full ${lightMessage ? "bg-header-dark" : "bg-[#7BE0A6]"}`}
                    />
                    {lightMessage ?? "The light is good"}
                  </p>
                )}
                {status === "starting" && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                    <div className="h-9 w-9 animate-spin rounded-full border-[3.5px] border-white/25 border-t-white" />
                    <p className="text-[15px] text-white/70">Opening your camera…</p>
                  </div>
                )}
                {count !== null && count > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/25" aria-live="assertive">
                    <span className="font-heading text-[120px] font-semibold leading-none text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]">
                      {count}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 text-center">
              <h2 className="font-heading text-[22px] font-semibold leading-tight text-white sm:text-[24px]">
                {shot ? (shot.lightMessage ? "The light changed. Please retake" : "Is this photo clear?") : step.title}
              </h2>
              <p className="mx-auto mt-1.5 max-w-[42ch] text-[15px] leading-[1.5] text-white/70">
                {shot ? (shot.lightMessage ?? "Your face should be sharp, well lit and not cut off.") : step.hint}
              </p>
            </div>

            <div className="mt-4 flex min-h-[76px] items-center justify-center gap-3">
              {shot ? (
                <>
                  <button
                    type="button"
                    onClick={discardShot}
                    className="rounded-full border border-white/30 px-7 py-3.5 font-heading text-[17px] font-semibold text-white transition hover:bg-white/10"
                  >
                    Retake
                  </button>
                  {!shot.lightMessage && (
                    <button type="button" className="btn-amber !px-7 !py-3.5" onClick={keepShot}>
                      {index + 1 >= slots.length ? "Use photo and finish" : "Use photo"}
                    </button>
                  )}
                </>
              ) : (
                <button
                  ref={shutterRef}
                  type="button"
                  disabled={status !== "live" || count !== null || light === null || Boolean(lightMessage)}
                  onClick={() => setCount(COUNTDOWN_FROM)}
                  aria-label={`Take the ${step.label.toLowerCase()} photo after a ${COUNTDOWN_FROM}-second countdown`}
                  className="group flex h-[76px] w-[76px] items-center justify-center rounded-full border-[4px] border-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:opacity-40"
                >
                  <span className="h-[56px] w-[56px] rounded-full bg-white transition group-hover:scale-95 group-active:scale-90" />
                </button>
              )}
            </div>
            <p className="mt-2 min-h-[20px] text-center text-[13.5px] text-white/55">
              {!shot && status === "live" && count === null
                ? lightMessage
                  ? "The button works once the light is good."
                  : `Press the button. The photo is taken after ${COUNTDOWN_FROM} seconds.`
                : ""}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
