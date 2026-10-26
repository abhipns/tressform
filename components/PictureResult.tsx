"use client";

// The result screen for single pictures (26.10.2026, owner's request).
//
// Shown on /results/[orderId] after paying for pictures of one hairstyle on
// the customer's own photo. The paid pictures are made here (the front by
// /api/generate, the sides and back by /api/generate/views — only the ones
// paid for), shown at full size with a download button each, with the words
// for the barber. Views not bought show as blurred, locked tiles, each
// "Add for ₹15". A picture that fails can be tried again for free; after 3
// failures it is marked for a refund and the customer is told so.

import { useCallback, useEffect, useState } from "react";
import BarberPointText from "@/components/BarberPointText";
import { SHARE_LINE } from "@/components/MyReferral";
import { SUPABASE_MOCK_MODE, authHeaders, getMockUserId } from "@/lib/authClient";
import { barberName, barberPoints, hairstyleById } from "@/lib/content/hairstyles";
import { PICTURE_PRICE_PAISE, paiseToRupees, type PictureView } from "@/lib/pricing";

type ViewState = "done" | "waiting" | "ready" | "refund" | "locked";
type Side = "left" | "right" | "back";

export interface PictureOrderSummary {
  styleId: string;
  styleName: string | null;
  photoId: string | null;
  bought: PictureView[];
  views: Record<PictureView, ViewState>;
  frontUrl: string | null;
}

const SIDES: Side[] = ["left", "right", "back"];
const LABEL: Record<PictureView, string> = { front: "Front", left: "Left side", right: "Right side", back: "Back" };
const rupees = (paise: number) => `₹${paiseToRupees(paise).split(".")[0]}`;

async function download(url: string, name: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  } catch {
    window.open(url, "_blank", "noopener");
  }
}

export default function PictureResult({ orderId, pictures }: { orderId: string; pictures: PictureOrderSummary }) {
  const style = hairstyleById(pictures.styleId);
  const [front, setFront] = useState<{ state: ViewState; url: string | null }>({
    state: pictures.views.front,
    url: pictures.frontUrl,
  });
  const [sides, setSides] = useState<Record<Side, { state: ViewState; url: string | null }>>(() => ({
    left: { state: pictures.views.left, url: null },
    right: { state: pictures.views.right, url: null },
    back: { state: pictures.views.back, url: null },
  }));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const mock = SUPABASE_MOCK_MODE ? { userId: getMockUserId() } : {};

  const makeFront = useCallback(async () => {
    if (!pictures.photoId) return;
    setBusy(true);
    setError(null);
    setFront((f) => ({ ...f, state: "waiting" }));
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeaders()) },
        body: JSON.stringify({ ...mock, photoId: pictures.photoId, styleId: pictures.styleId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.resultImageUrl) throw new Error(data.error || "The picture couldn't be made this time.");
      setFront({ state: "done", url: data.resultImageUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : "The picture couldn't be made this time.");
      // Ask again whether it can be tried again, or has now failed 3 times and is due a refund.
      let state: ViewState = "ready";
      try {
        const again = await fetch(`/api/payment/order/${orderId}`, { headers: await authHeaders(), cache: "no-store" });
        const data = await again.json();
        state = data?.order?.pictures?.views?.front ?? "ready";
      } catch {
        /* keep "Try again" */
      }
      setFront((f) => ({ ...f, state }));
    } finally {
      setBusy(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, pictures.photoId, pictures.styleId]);

  const makeSides = useCallback(
    async (tries = 0): Promise<void> => {
      if (!pictures.photoId) return;
      setBusy(true);
      try {
        const res = await fetch("/api/generate/views", {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(await authHeaders()) },
          body: JSON.stringify({ ...mock, photoId: pictures.photoId, styleId: pictures.styleId }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || "The side pictures couldn't be made this time.");
        const locked: string[] = data.locked ?? [];
        const refund: string[] = data.refund ?? [];
        setSides((now) => {
          const next = { ...now };
          for (const side of SIDES) {
            const url: string | null = data.views?.[side] ?? null;
            next[side] = url
              ? { state: "done", url }
              : locked.includes(side)
                ? { state: "locked", url: null }
                : refund.includes(side)
                  ? { state: "refund", url: null }
                  : { state: data.state === "making" ? "waiting" : "ready", url: null };
          }
          return next;
        });
        if (data.error) setError(data.error);
        if (data.state === "making" && tries < 12) {
          window.setTimeout(() => void makeSides(tries + 1), 5000);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "The side pictures couldn't be made this time.");
      } finally {
        setBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pictures.photoId, pictures.styleId]
  );

  // Make the front first (if paid and not made), then the paid sides.
  useEffect(() => {
    if (front.state === "ready" && !front.url && !error) void makeFront();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const anySidePaid = SIDES.some((s) => sides[s].state !== "locked");
  useEffect(() => {
    if (front.state === "done" && front.url) void makeSides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [front.state, front.url]);

  if (!style) return null;
  const addLink = (view: PictureView) =>
    `/checkout?style=${encodeURIComponent(pictures.styleId)}&photo=${encodeURIComponent(pictures.photoId ?? "")}&views=${view}`;
  const fileName = (view: PictureView) => `tressform-${style.id}-${view}.jpg`;

  function tile(view: PictureView, s: { state: ViewState; url: string | null }) {
    return (
      <li key={view} className="flex flex-col">
        <div className="relative aspect-[3/4] w-full overflow-hidden rounded-[16px] bg-header-dark">
          {s.state === "done" && s.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={s.url} alt={`${style!.name}, ${LABEL[view].toLowerCase()}, on your photo`} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              {front.url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={front.url} alt="" className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-[14px]" />
              )}
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center text-white">
                {s.state === "waiting" ? (
                  <>
                    <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/30 border-t-white" />
                    <span className="text-[13px] font-semibold">Making it… about 20 seconds</span>
                  </>
                ) : s.state === "refund" ? (
                  <span className="text-[13px] font-semibold leading-snug">
                    We couldn&apos;t make this picture, so you get its {rupees(PICTURE_PRICE_PAISE[view])} back.
                  </span>
                ) : s.state === "locked" ? (
                  <span className="text-[13.5px] font-semibold drop-shadow">🔒 {LABEL[view]}</span>
                ) : (
                  <span className="text-[13px] font-semibold">Not made yet</span>
                )}
              </span>
            </>
          )}
        </div>
        <p className="mt-2 text-[14.5px] font-semibold text-ink-heading">{LABEL[view]}</p>
        {s.state === "done" && s.url && (
          <button type="button" className="mt-1 self-start text-[13.5px] font-semibold text-mint-deep underline underline-offset-4" onClick={() => download(s.url!, fileName(view))}>
            Download
          </button>
        )}
        {s.state === "locked" && (
          <a href={addLink(view)} className="btn-secondary mt-1.5 !px-4 !py-2 !text-[14px]">
            Add for {rupees(PICTURE_PRICE_PAISE[view])}
          </a>
        )}
        {s.state === "ready" && (
          <button
            type="button"
            className="btn-secondary mt-1.5 !px-4 !py-2 !text-[14px]"
            disabled={busy}
            onClick={() => (view === "front" ? makeFront() : makeSides())}
          >
            Try again (free)
          </button>
        )}
      </li>
    );
  }

  const done = [
    ...(front.state === "done" && front.url ? [{ view: "front" as PictureView, url: front.url }] : []),
    ...SIDES.filter((s) => sides[s].state === "done" && sides[s].url).map((s) => ({ view: s as PictureView, url: sides[s].url! })),
  ];

  return (
    <section className="wrap pb-16">
      <div className="mx-auto max-w-[760px]">
        <h2 className="text-[22px]">{style.name}, on your photo</h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {tile("front", front)}
          {SIDES.map((s) => tile(s, sides[s]))}
        </ul>
        {error && (
          <p className="mt-3 rounded-sm2 bg-danger/10 px-4 py-2.5 text-[14px] font-medium text-danger" role="status">
            {error}
          </p>
        )}
        {done.length > 1 && (
          <button
            type="button"
            className="btn-primary mt-4"
            onClick={async () => {
              for (const d of done) await download(d.url, fileName(d.view));
            }}
          >
            Download all {done.length} pictures
          </button>
        )}
        {!anySidePaid && front.state === "done" && (
          <p className="mt-3 text-[14px] text-ink-muted">See it from every side: add the left side, right side or back for {rupees(PICTURE_PRICE_PAISE.left)} each.</p>
        )}

        <div className="mt-6 rounded-[16px] bg-bg-soft p-5">
          <p className="text-[15.5px] font-semibold text-ink-heading">What to tell your barber</p>
          <p className="mt-1.5 text-[14.5px]">
            Ask for <strong className="font-semibold text-ink-heading">{barberName(style)}</strong>:
          </p>
          <ul className="mt-1.5 flex flex-col gap-1 text-[14.5px] leading-[1.45]">
            {barberPoints(style).map((point) => (
              <li key={point} className="flex gap-2.5">
                <span className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full bg-mint" aria-hidden="true" />
                <BarberPointText point={point} />
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13.5px] text-ink-muted">Showing them the pictures as well works best.</p>
        </div>
        {/* 26.10.2026: the link-visitor credit (lib/linkVisits.ts). */}
        <p className="mt-4 text-[14px] font-semibold text-mint-deep">
          {SHARE_LINE}.{" "}
          <a href="/refer" className="underline underline-offset-4">
            Get your link
          </a>
        </p>
      </div>
    </section>
  );
}
