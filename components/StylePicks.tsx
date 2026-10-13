"use client";

// The customer's result screen (11.10.2026).
//
// Until now every customer was shown the same three men's cuts. This screen
// shows each customer their own list, chosen from the 60 styles by the
// owner's rules (lib/recommend.ts):
//
//   1. "About you": what was read from the photo (face shape, hair length
//      now, hair type). The reading is a starting point, so each item can
//      be corrected with one tap and the list below changes at once. When
//      something could not be read, the customer is asked for it before any
//      list is shown, because a list built on a guess would be wrong.
//   2. The top picks: cuts they can get today, best match first, each with
//      a match score and why it suits them (lib/pickReasons.ts). What to
//      ask the barber for appears with a style once its preview is made.
//   3. "See it on me" on each style. The customer chooses which styles to
//      see on their own photo; no picture is made that was not asked for.
//   4. Up to five more styles that suit them, some of which need growing.
//
// 11.10.2026 (paid previews): the count shown is every preview the customer
// has left, free or from a pack. With none left, each style's button
// becomes a link to the packs. The screen can also be given previews that
// were made earlier (`earlier`), so a customer who went away to buy a pack,
// or reloaded the page, finds their pictures where they left them; and it
// reports every correction the customer makes (`onDetails`) so the page can
// remember those too.
//
// 11.10.2026 (later still): free previews were switched off, so most
// customers arrive here with no previews. The packs are therefore offered
// on this screen, above the list, with a button each that goes straight to
// checkout; the customer comes back to this same screen after paying. Each
// style's button points up at that offer.
//
// 12.10.2026 (four views): a preview from a pack is shown from four sides.
// The front picture arrives first; the page then asks for the left side,
// right side and back (makeViews), which take about 20 seconds more. A
// finished card shows all four pictures large (two by two on a computer, a
// row to swipe on a phone), a save button on every picture, "Download all
// 4" and "Send to my barber" (the four pictures plus the cutting points).
// One "Share my styles" button above the list makes a single picture for
// friends: the customer's photo and up to four styles, numbered for votes —
// see lib/shareTools.ts.
//
// This component only shows things and asks for previews. Which styles are
// picked is decided in lib/recommend.ts; making a preview is done by the
// function the upload flow passes in.

import { useEffect, useMemo, useState } from "react";
import CareBox, { useCareProducts } from "@/components/CareBox";
import RateBox from "@/components/RateBox";
import type { FaceShape } from "@/lib/faceShape";
import {
  HAIRSTYLES,
  MEN_LENGTHS,
  WOMEN_LENGTHS,
  barberName,
  barberPoints,
  type HairGender,
  type HairLength,
  type HairTexture,
  type Hairstyle,
} from "@/lib/content/hairstyles";
import { pickStyles, type CustomerHair, type StylePick } from "@/lib/recommend";
import { reasonsFor, UPKEEP_LABEL } from "@/lib/pickReasons";
import { PACK_TIERS, getCurrentPackPricePaise, paiseToRupees, type PackTier } from "@/lib/pricing";
import {
  barberMessage,
  friendsMessage,
  makeSharePicture,
  pictureFile,
  saveFile,
  savePicture,
  shareFiles,
  slug,
} from "@/lib/shareTools";

// The two packs on sale, offered right on the result screen.
const PACKS_ON_SALE: PackTier[] = ["STARTER", "STYLE"];

export interface PhotoDetails {
  faceShape: FaceShape;
  secondFaceShape: FaceShape | null;
  sure: "high" | "medium" | "low";
  /** "measurement" = the reading failed and the old face measurement was used instead. */
  readBy: "reading" | "measurement";
  hair: { length: HairLength | null; texture: HairTexture | null };
}

export interface ConfirmedDetails {
  faceShape: FaceShape;
  length: HairLength;
  texture: HairTexture;
}

export type PreviewOutcome =
  | { ok: true; imageUrl: string; sample: boolean; previewsLeft: number | null; paid: boolean }
  | { ok: false; noAllowance: boolean; rejected: boolean; message: string };

/** The left side, right side and back of a paid preview. */
export type Views = { left: string | null; right: string | null; back: string | null };
export type ViewsOutcome =
  | { ok: true; state: "making" | "done"; views: Views; message: string | null }
  | { ok: false; message: string };
export type EarlierPreview = { styleName: string; url: string; views?: Views | null };

type PreviewState = {
  state: "loading" | "done" | "failed";
  imageUrl?: string;
  message?: string;
  style: Hairstyle;
  /** Side and back views: none asked for yet (undefined), being made, made, or failed. */
  viewsState?: "loading" | "done" | "failed";
  views?: Views;
  viewsMessage?: string | null;
};

const VIEW_ORDER: { key: "front" | keyof Views; label: string }[] = [
  { key: "front", label: "Front" },
  { key: "left", label: "Left side" },
  { key: "right", label: "Right side" },
  { key: "back", label: "Back" },
];

function DownloadIcon({ className = "h-[18px] w-[18px]" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <path d="M10 3v10m0 0-4-4m4 4 4-4M4 16h12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      <circle cx="15" cy="4.5" r="2.2" />
      <circle cx="5" cy="10" r="2.2" />
      <circle cx="15" cy="15.5" r="2.2" />
      <path d="m7 9 6-3.3M7 11l6 3.3" />
    </svg>
  );
}

const FACE_SHAPES: { shape: FaceShape; hint: string }[] = [
  { shape: "Oval", hint: "A little longer than wide, soft jaw" },
  { shape: "Round", hint: "As wide as it is long, full cheeks" },
  { shape: "Square", hint: "As wide as it is long, strong jaw" },
  { shape: "Long", hint: "Clearly longer than wide" },
  { shape: "Heart", hint: "Wide forehead, narrow chin" },
  { shape: "Diamond", hint: "Wide cheekbones, narrow forehead and chin" },
];

const LENGTH_OPTIONS: Record<HairGender, { value: HairLength; label: string; hint?: string }[]> = {
  men: [
    { value: "very-short", label: "Very short", hint: "under 2 cm" },
    { value: "short", label: "Short", hint: "2 to 5 cm" },
    { value: "medium", label: "Medium", hint: "5 to 10 cm" },
    { value: "long", label: "Long", hint: "covers the ears" },
  ],
  women: [
    { value: "ear", label: "Ear" },
    { value: "chin", label: "Chin" },
    { value: "shoulder", label: "Shoulder" },
    { value: "below-shoulder", label: "Below shoulder" },
    { value: "mid-back", label: "Mid-back" },
    { value: "waist", label: "Waist" },
  ],
};

const TEXTURE_OPTIONS: { value: HairTexture; label: string }[] = [
  { value: "straight", label: "Straight" },
  { value: "wavy", label: "Wavy" },
  { value: "curly", label: "Curly" },
];

/** A plain outline of each face shape, so the six names mean something. */
function FaceOutline({ shape, className }: { shape: FaceShape; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2.2, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 40 52" className={className} aria-hidden="true">
      {shape === "Oval" && <ellipse cx="20" cy="26" rx="13" ry="20" {...common} />}
      {shape === "Round" && <ellipse cx="20" cy="27" rx="16.5" ry="17.5" {...common} />}
      {shape === "Square" && <rect x="4.5" y="8" width="31" height="37" rx="9" {...common} />}
      {shape === "Long" && <rect x="8.5" y="3" width="23" height="46" rx="11" {...common} />}
      {shape === "Heart" && (
        <path d="M20 49C12 44 4 32 4 19 4 9 11 5 20 5s16 4 16 14c0 13-8 25-16 30Z" {...common} />
      )}
      {shape === "Diamond" && (
        <path d="M20 3c6 0 9 5 11 12 2 5 5 8 5 12 0 6-8 17-16 22C12 44 4 33 4 27c0-4 3-7 5-12C11 8 14 3 20 3Z" {...common} />
      )}
    </svg>
  );
}

function Tick() {
  return (
    <svg viewBox="0 0 20 20" fill="none" className="mt-[3px] h-4 w-4 shrink-0 text-mint" aria-hidden="true">
      <path d="m4.5 10.5 3.4 3.4L15.5 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function OptionPill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-left text-[15px] font-semibold leading-tight transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-deep ${
        selected ? "border-mint bg-mint text-white" : "border-line bg-surface text-ink-heading hover:border-ink-heading"
      }`}
    >
      {children}
    </button>
  );
}

export default function StylePicks({
  gender,
  frontPhoto,
  initial,
  previewsLeft: previewsLeftAtStart,
  makePreview,
  makeViews,
  onStartOver,
  earlier,
  onDetails,
}: {
  gender: HairGender;
  frontPhoto: string | null;
  initial: PhotoDetails;
  /** null = previews are not being counted (placeholder images). */
  previewsLeft: number | null;
  makePreview: (styleId: string, details: ConfirmedDetails) => Promise<PreviewOutcome>;
  /** Asks for the side and back views of a paid preview. */
  makeViews?: (styleId: string) => Promise<ViewsOutcome>;
  onStartOver: () => void;
  /** Previews already made from this photo, by style name. */
  earlier?: EarlierPreview[];
  /** Told each time the customer's details are complete or change. */
  onDetails?: (details: ConfirmedDetails) => void;
}) {
  const lengths: readonly string[] = gender === "men" ? MEN_LENGTHS : WOMEN_LENGTHS;
  const [faceShape, setFaceShape] = useState<FaceShape>(initial.faceShape);
  const [faceChanged, setFaceChanged] = useState(false);
  const [length, setLength] = useState<HairLength | null>(
    initial.hair.length && lengths.includes(initial.hair.length) ? initial.hair.length : null
  );
  const [texture, setTexture] = useState<HairTexture | null>(initial.hair.texture);
  const careProducts = useCareProducts();

  // The face shape needs a look from the customer when the reading was not
  // sure of it, or failed and the old measurement stood in.
  const faceUnsure = initial.readBy === "measurement" || initial.sure === "low";
  const hairMissing = initial.hair.length === null || initial.hair.texture === null;
  const [editing, setEditing] = useState(faceUnsure || hairMissing);

  const [previews, setPreviews] = useState<Record<string, PreviewState>>(() => {
    const made: Record<string, PreviewState> = {};
    for (const item of earlier ?? []) {
      const style = HAIRSTYLES.find((h) => h.gender === gender && h.name === item.styleName);
      if (style) {
        made[style.id] = item.views
          ? { state: "done", imageUrl: item.url, style, viewsState: "done", views: item.views }
          : { state: "done", imageUrl: item.url, style };
      }
    }
    return made;
  });
  const [left, setLeft] = useState<number | null>(previewsLeftAtStart);
  // The page learns a new balance (after a purchase, say) and passes it down.
  useEffect(() => setLeft(previewsLeftAtStart), [previewsLeftAtStart]);
  const [samples, setSamples] = useState(false);
  const [showMore, setShowMore] = useState(false);

  const customer: CustomerHair | null = useMemo(
    () =>
      length && texture
        ? {
            gender,
            faceShape,
            // The second guess only counts while the customer has not set the shape themselves.
            secondFaceShape: !faceChanged && initial.sure === "low" ? initial.secondFaceShape : null,
            length,
            texture,
          }
        : null,
    [gender, faceShape, faceChanged, initial.sure, initial.secondFaceShape, length, texture]
  );
  const picks = useMemo(() => (customer ? pickStyles(customer) : null), [customer]);

  useEffect(() => {
    if (length && texture) onDetails?.({ faceShape, length, texture });
    // onDetails is the page's own function; only a change in the details matters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faceShape, length, texture]);

  const loadingCount = Object.values(previews).filter((p) => p.state === "loading").length;
  const canStart = left === null || left - loadingCount > 0;
  const allowanceSpent = left !== null && left <= 0 && loadingCount === 0;

  /** Ask for the side and back views; while another request is making them, check again shortly. */
  async function requestViews(style: Hairstyle, tries = 0) {
    if (!makeViews) return;
    setPreviews((prev) => (prev[style.id] ? { ...prev, [style.id]: { ...prev[style.id], viewsState: "loading", viewsMessage: null } } : prev));
    let outcome: ViewsOutcome;
    try {
      outcome = await makeViews(style.id);
    } catch {
      outcome = { ok: false, message: "The side and back views couldn't be made. Please check your connection." };
    }
    if (outcome.ok && outcome.state === "making" && tries < 12) {
      window.setTimeout(() => requestViews(style, tries + 1), 5000);
      return;
    }
    setPreviews((prev) => {
      const current = prev[style.id];
      if (!current) return prev;
      if (!outcome.ok) return { ...prev, [style.id]: { ...current, viewsState: "failed", viewsMessage: outcome.message } };
      const missing = !outcome.views.left || !outcome.views.right || !outcome.views.back;
      return {
        ...prev,
        [style.id]: {
          ...current,
          viewsState: missing ? "failed" : "done",
          views: outcome.views,
          viewsMessage: missing ? outcome.message ?? "Some views couldn't be made." : null,
        },
      };
    });
  }

  async function seeItOnMe(style: Hairstyle) {
    if (!customer || !canStart || previews[style.id]?.state === "loading") return;
    setPreviews((prev) => ({ ...prev, [style.id]: { state: "loading", style } }));
    // The picture appears at the top of the card, above the button that was
    // just tapped; bring it into view so the customer sees it arrive.
    window.setTimeout(
      () => document.getElementById(`pick-${style.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
      60
    );
    let outcome: PreviewOutcome;
    try {
      outcome = await makePreview(style.id, { faceShape: customer.faceShape, length: customer.length, texture: customer.texture });
    } catch {
      outcome = {
        ok: false,
        noAllowance: false,
        rejected: false,
        message: "This hairstyle couldn't be created. Please check your connection and try again.",
      };
    }
    if (outcome.ok) {
      const done = outcome;
      setPreviews((prev) => ({ ...prev, [style.id]: { state: "done", imageUrl: done.imageUrl, style } }));
      if (done.sample) setSamples(true);
      else if (done.previewsLeft !== null) setLeft(done.previewsLeft);
      // A preview from a pack comes with its side and back views.
      if (done.paid) void requestViews(style);
      return;
    }
    if (outcome.noAllowance) {
      // The allowance ran out between the list being shown and this request.
      setLeft(0);
      setPreviews((prev) => {
        const next = { ...prev };
        delete next[style.id];
        return next;
      });
      return;
    }
    const failed = outcome;
    setPreviews((prev) => ({ ...prev, [style.id]: { state: "failed", message: failed.message, style } }));
  }

  // Previews already made for styles that a later correction took off the list.
  const listed = new Set([...(picks?.top ?? []), ...(picks?.more ?? [])].map((p) => p.style.id));
  const offList = Object.values(previews).filter((p) => !listed.has(p.style.id) && p.state !== "failed");

  // Plain functions, not components: a component declared in here would be
  // a new one on every render, which would reload every picture each time
  // anything changed.
  /** The four pictures of a finished preview, with what is still on its way. */
  function pictures(preview: PreviewState): { key: string; label: string; url: string | null; waiting: boolean }[] {
    const hasViews = preview.viewsState !== undefined;
    return VIEW_ORDER.filter((v) => v.key === "front" || hasViews).map((v) => ({
      key: v.key,
      label: v.label,
      url: v.key === "front" ? preview.imageUrl ?? null : preview.views?.[v.key] ?? null,
      waiting: v.key !== "front" && preview.viewsState === "loading",
    }));
  }

  async function downloadAll(preview: PreviewState) {
    for (const pic of pictures(preview)) {
      if (!pic.url) continue;
      await savePicture(pic.url, `${slug(preview.style.name)}-${slug(pic.label)}.jpg`);
      await new Promise((r) => window.setTimeout(r, 350)); // browsers block a burst of downloads
    }
  }

  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ styleId: string; text: string } | null>(null);

  async function sendToBarber(preview: PreviewState) {
    const style = preview.style;
    const text = barberMessage(style.name, barberName(style), barberPoints(style));
    setBusy(`barber-${style.id}`);
    try {
      const pics = pictures(preview).filter((p) => p.url);
      const files = await Promise.all(pics.map((p) => pictureFile(p.url!, `${slug(style.name)}-${slug(p.label)}.jpg`)));
      const result = await shareFiles(files, text, style.name);
      if (result === "unsupported") {
        // Computers: save the pictures, copy the words, open WhatsApp with them.
        for (const f of files) {
          saveFile(f, f.name);
          await new Promise((r) => window.setTimeout(r, 350));
        }
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* not allowed here — WhatsApp still gets the words below */
        }
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
        setNotice({ styleId: style.id, text: "The 4 pictures are saved and the words are in WhatsApp. Attach the pictures there." });
      }
    } catch {
      setNotice({ styleId: style.id, text: "That didn't work. Try “Download all 4” and send them yourself." });
    } finally {
      setBusy(null);
    }
  }

  function renderDone(pick: StylePick | null, preview: PreviewState, rank: number | null) {
    const style = preview.style;
    const reasons = pick && customer ? reasonsFor(pick, customer) : [];
    const pics = pictures(preview);
    const single = pics.length === 1;
    return (
      <li key={style.id} id={`pick-${style.id}`} className="scroll-mt-24 rounded-[20px] bg-bg-soft p-4 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <h4 className="text-[20px] font-semibold leading-snug">
            {rank !== null && <span className="mr-2 text-mint">{rank}.</span>}
            {style.name}
          </h4>
          {pick && (
            <p className="shrink-0 text-right leading-none">
              <span className="font-heading text-[22px] font-semibold text-ink-heading">{pick.score}%</span>
              <span className="mt-1 block text-[12.5px] font-medium text-ink-muted">match</span>
            </p>
          )}
        </div>
        <p className="mt-1.5 text-[15.5px] leading-[1.5]">{style.line}</p>

        {/* Phones: one picture at a time, swipe for the others. Computers: two by two. */}
        <div
          className={`mt-4 ${
            single
              ? "max-w-[380px]"
              : "-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden"
          }`}
        >
          {pics.map((pic) => (
            <figure key={pic.key} className={single ? "" : "w-[84%] shrink-0 snap-center sm:w-auto"}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-[16px] bg-line">
                {pic.url ? (
                  <a href={pic.url} target="_blank" rel="noreferrer" title="Open the full picture">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={pic.url} alt={`${style.name}, ${pic.label.toLowerCase()}`} className="absolute inset-0 h-full w-full object-cover" />
                  </a>
                ) : pic.waiting ? (
                  <>
                    {preview.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={preview.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-25 blur-[2px]" />
                    )}
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 top-0 h-[24%] animate-[scan-down_2.2s_ease-in-out_infinite] border-b-2 border-white/90 bg-gradient-to-b from-transparent to-mint/45 motion-reduce:hidden"
                    />
                    <p className="absolute inset-x-0 bottom-0 bg-header-dark/75 px-3 py-2.5 text-center text-[13px] font-medium text-white">
                      Making the {pic.label.toLowerCase()}…
                    </p>
                  </>
                ) : (
                  <p className="absolute inset-0 flex items-center justify-center p-4 text-center text-[13.5px] text-ink-muted">
                    Not made yet
                  </p>
                )}
                <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[12px] font-semibold text-ink-heading">
                  {pic.label}
                  {pic.key !== "front" && <span className="font-medium text-ink-muted"> · AI estimate</span>}
                </span>
                {pic.url && (
                  <button
                    type="button"
                    onClick={() => savePicture(pic.url!, `${slug(style.name)}-${slug(pic.label)}.jpg`)}
                    aria-label={`Save the ${pic.label.toLowerCase()} picture`}
                    title="Save this picture"
                    className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-ink-heading shadow-card"
                  >
                    <DownloadIcon />
                  </button>
                )}
              </div>
            </figure>
          ))}
        </div>
        {!single && <p className="mt-2 text-center text-[12.5px] text-ink-muted sm:hidden">Swipe for the sides and back · tap a picture to open it</p>}
        {preview.viewsState === "loading" && (
          <p className="mt-2 text-[13.5px] text-ink-muted" role="status">
            Your side and back views are on their way, about 20 seconds.
          </p>
        )}
        {preview.viewsState === "failed" && (
          <p className="mt-2 text-[13.5px] text-danger" role="status">
            {preview.viewsMessage ?? "The side and back views couldn't be made."}{" "}
            <button type="button" className="font-semibold underline" onClick={() => requestViews(style)}>
              Try again
            </button>
          </p>
        )}
        {preview.viewsState === undefined && makeViews && !samples && (
          // 13.10.2026: a real button, not a text link (owner's request).
          <button type="button" className="btn-secondary mt-3 w-full gap-2 !py-3 !text-[15.5px] sm:w-auto sm:!px-6" onClick={() => requestViews(style)}>
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
              <path d="M4 12a8 8 0 0 1 13.7-5.6M20 12a8 8 0 0 1-13.7 5.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M18 3v3.6h-3.6M6 21v-3.6h3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            See the sides and back
          </button>
        )}

        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className="btn-primary gap-2 !px-5 !py-2.5 !text-[15px]" onClick={() => downloadAll(preview)}>
            <DownloadIcon />
            {single ? "Download" : `Download all ${pics.filter((p) => p.url).length}`}
          </button>
          <button
            type="button"
            className="btn-secondary gap-2 !px-5 !py-2.5 !text-[15px]"
            disabled={busy === `barber-${style.id}`}
            onClick={() => sendToBarber(preview)}
          >
            <ShareIcon />
            {busy === `barber-${style.id}` ? "Getting it ready…" : "Send to my barber"}
          </button>
          {/* 12.10.2026: the owner looked for a social share button on the
              card itself; "Share my styles" sits above the list and was
              missed. This one shares just this style: the photo of the
              customer now beside this preview, with the message for friends. */}
          {frontPhoto && (
            <button
              type="button"
              className="btn-amber gap-2 !px-5 !py-2.5 !text-[15px] !shadow-none"
              disabled={busy === `share-${style.id}`}
              onClick={() => shareStyles([style.id], `share-${style.id}`, style.id)}
            >
              <ShareIcon />
              {busy === `share-${style.id}` ? "Making it…" : "Share"}
            </button>
          )}
        </div>
        {notice?.styleId === style.id && <p className="mt-2 text-[13.5px] text-ink-muted">{notice.text}</p>}

        {reasons.length > 0 && (
          <ul className="mt-5 flex flex-col gap-1.5 text-[14.5px] leading-[1.45]">
            {reasons.map((reason) => (
              <li key={reason} className="flex gap-2">
                <Tick />
                <span>{reason}</span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-[13.5px] font-medium text-ink-muted">{UPKEEP_LABEL[style.upkeep]}</p>

        <div className="mt-4 rounded-[14px] bg-surface p-4">
          <p className="text-[15px] font-semibold text-ink-heading">What to tell your barber</p>
          <p className="mt-1.5 text-[14.5px]">
            Ask for <strong className="font-semibold text-ink-heading">{barberName(style)}</strong>:
          </p>
          <ul className="mt-2 flex flex-col gap-1.5 text-[14.5px] leading-[1.45]">
            {barberPoints(style).map((point) => (
              <li key={point} className="flex gap-2.5">
                <span className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full bg-mint" aria-hidden="true" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[13.5px] text-ink-muted">
            {single ? "Showing them the picture as well works best." : "Show them all four pictures as well — it works best."}
          </p>
        </div>
        {texture && <CareBox style={style} texture={texture} products={careProducts} open from="preview" />}
      </li>
    );
  }

  // ------------------------------------------------------- share my styles
  const madeStyles = Object.values(previews).filter((p) => p.state === "done" && p.imageUrl);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareIds, setShareIds] = useState<string[]>([]);
  const chosen = shareIds.filter((id) => previews[id]?.state === "done");
  const shareList = chosen.length > 0 ? chosen : madeStyles.slice(0, 4).map((p) => p.style.id);

  async function shareMyStyles() {
    await shareStyles(shareList, "share", "share");
  }

  /** One picture for friends: the customer now, then the chosen styles numbered. */
  async function shareStyles(ids: string[], busyKey: string, noticeKey: string) {
    if (!frontPhoto || ids.length === 0) return;
    setBusy(busyKey);
    try {
      const styles = ids.map((id) => ({ name: previews[id].style.name, url: previews[id].imageUrl! }));
      const file = await makeSharePicture(frontPhoto, styles);
      const text = friendsMessage(styles.length);
      const result = await shareFiles([file], text, "My hairstyles");
      if (result === "unsupported") {
        saveFile(file, file.name);
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          /* fine */
        }
        setNotice({ styleId: noticeKey, text: "Your picture is saved and the message is copied — paste both wherever you like." });
      }
    } catch {
      setNotice({ styleId: noticeKey, text: "The picture couldn't be made. Please try again." });
    } finally {
      setBusy(null);
    }
  }

  function renderShare() {
    if (madeStyles.length === 0 || !frontPhoto) return null;
    const many = madeStyles.length > 4;
    return (
      <div className="mt-5 rounded-[20px] border border-line p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[16px] font-semibold text-ink-heading">Can&apos;t decide? Ask your friends.</p>
            <p className="mt-0.5 text-[13.5px] text-ink-muted">
              One picture of you now and {Math.min(4, madeStyles.length) === 1 ? "your style" : `your styles, numbered 1–${Math.min(4, madeStyles.length)}`}, ready for WhatsApp. Includes your photo.
            </p>
          </div>
          <div className="flex gap-2">
            {many && (
              <button type="button" className="btn-secondary !px-4 !py-2.5 !text-[14.5px]" onClick={() => setShareOpen((o) => !o)}>
                Choose 4
              </button>
            )}
            <button type="button" className="btn-amber gap-2 !px-5 !py-2.5 !text-[15px] !shadow-none" disabled={busy === "share"} onClick={shareMyStyles}>
              <ShareIcon />
              {busy === "share" ? "Making it…" : "Share my styles"}
            </button>
          </div>
        </div>
        {many && shareOpen && (
          <div className="mt-3 flex flex-wrap gap-2">
            {madeStyles.map((p) => {
              const on = shareList.includes(p.style.id);
              return (
                <button
                  key={p.style.id}
                  type="button"
                  onClick={() =>
                    setShareIds(() => {
                      const base = shareList.filter((id) => id !== p.style.id);
                      return on ? base : [...base, p.style.id].slice(-4);
                    })
                  }
                  className={`rounded-full border px-3.5 py-1.5 text-[14px] font-semibold ${on ? "border-mint bg-mint text-white" : "border-line bg-surface text-ink-heading"}`}
                >
                  {p.style.name}
                </button>
              );
            })}
          </div>
        )}
        {notice?.styleId === "share" && <p className="mt-2 text-[13.5px] text-ink-muted">{notice.text}</p>}
      </div>
    );
  }

  function renderPick(pick: StylePick, rank: number | null) {
    const preview = previews[pick.style.id];
    if (preview?.state === "done" && preview.imageUrl) return renderDone(pick, preview, rank);
    const reasons = customer ? reasonsFor(pick, customer) : [];
    return (
      <li key={pick.style.id} id={`pick-${pick.style.id}`} className="scroll-mt-24 rounded-[20px] bg-bg-soft p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:gap-5">
          {preview && preview.state !== "failed" && renderFrame(preview)}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h4 className="text-[19px] font-semibold leading-snug">
                {rank !== null && <span className="mr-2 text-mint">{rank}.</span>}
                {pick.style.name}
              </h4>
              <p className="shrink-0 text-right leading-none">
                <span className="font-heading text-[22px] font-semibold text-ink-heading">{pick.score}%</span>
                <span className="mt-1 block text-[12.5px] font-medium text-ink-muted">match</span>
              </p>
            </div>
            <p className="mt-1.5 text-[15.5px] leading-[1.5]">{pick.style.line}</p>
            <ul className="mt-3 flex flex-col gap-1.5 text-[14.5px] leading-[1.45]">
              {reasons.map((reason) => (
                <li key={reason} className="flex gap-2">
                  <Tick />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
              {!preview && !allowanceSpent && (
                <button
                  type="button"
                  className="btn-primary !px-6 !py-2.5 !text-[15px]"
                  disabled={!canStart}
                  onClick={() => seeItOnMe(pick.style)}
                >
                  See it on me
                </button>
              )}
              {!preview && allowanceSpent && (
                <a href="#get-previews" className="btn-secondary !px-6 !py-2.5 !text-[15px]">
                  Get a pack to see this
                </a>
              )}
              {preview?.state === "failed" && (
                <button
                  type="button"
                  className="btn-secondary !px-6 !py-2.5 !text-[15px]"
                  disabled={!canStart}
                  onClick={() => seeItOnMe(pick.style)}
                >
                  Try again
                </button>
              )}
              <span className="text-[13.5px] font-medium text-ink-muted">{UPKEEP_LABEL[pick.style.upkeep]}</span>
            </div>
            {preview?.state === "failed" && (
              <p className="mt-3 text-[14px] font-medium text-danger" role="status">
                {preview.message}
              </p>
            )}
            {/* The barber wording comes with the preview (free or paid): the
                packs are sold as "barber instructions with every hairstyle",
                and the two belong together at the barber's anyway. */}
            {preview?.state === "done" ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-[14.5px] font-semibold text-ink-heading">What to tell your barber</p>
                {/* 12.10.2026: as points, not a paragraph (owner's request). */}
                <p className="mt-1.5 text-[14.5px]">
                  Ask for <strong className="font-semibold text-ink-heading">{barberName(pick.style)}</strong>:
                </p>
                <ul className="mt-1.5 flex flex-col gap-1 text-[14.5px] leading-[1.45]">
                  {barberPoints(pick.style).map((point) => (
                    <li key={point} className="flex gap-2.5">
                      <span className="mt-[8px] h-[6px] w-[6px] shrink-0 rounded-full bg-mint" aria-hidden="true" />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[13.5px] text-ink-muted">Showing them the picture as well works best.</p>
              </div>
            ) : (
              <p className="mt-4 border-t border-line pt-3 text-[13.5px] text-ink-muted">
                What to tell your barber comes with the AI hairstyle.
              </p>
            )}
            {texture && <CareBox style={pick.style} texture={texture} products={careProducts} from="list" />}
          </div>
        </div>
      </li>
    );
  }

  function renderFrame(preview: PreviewState) {
    if (preview.state === "done" && preview.imageUrl) {
      return (
        <a
          href={preview.imageUrl}
          target="_blank"
          rel="noreferrer"
          className="block w-full shrink-0 self-start overflow-hidden rounded-[16px] sm:w-[210px]"
          title="Open the full picture"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview.imageUrl} alt={`${preview.style.name} on your photo`} className="w-full" />
        </a>
      );
    }
    return (
      <div className="relative aspect-[3/4] w-full shrink-0 self-start overflow-hidden rounded-[16px] bg-line sm:w-[210px]">
        {frontPhoto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={frontPhoto} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
        )}
        <span
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-[24%] animate-[scan-down_2.2s_ease-in-out_infinite] border-b-2 border-white/90 bg-gradient-to-b from-transparent to-mint/45 motion-reduce:hidden"
        />
        <p
          className="absolute inset-x-0 bottom-0 bg-header-dark/75 px-3 py-2.5 text-center text-[13.5px] font-medium leading-snug text-white"
          role="status"
        >
          Creating your hairstyle. About 20 seconds.
        </p>
      </div>
    );
  }

  const about: { label: string; value: string }[] = [
    { label: "Face shape", value: faceShape },
    { label: "Hair now", value: LENGTH_OPTIONS[gender].find((o) => o.value === length)?.label ?? "Not set" },
    { label: "Hair type", value: TEXTURE_OPTIONS.find((o) => o.value === texture)?.label ?? "Not set" },
  ];

  return (
    <div>
      <h3 className="text-[26px] font-semibold leading-tight">Your hairstyles</h3>

      {/* ---------------------------------------------------- About you */}
      <div className="mt-5 rounded-[20px] border border-line p-4 sm:p-5">
        <div className="flex items-center gap-4">
          {frontPhoto && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={frontPhoto} alt="Your front photo" className="h-[68px] w-[52px] shrink-0 rounded-[10px] object-cover" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold uppercase tracking-[.08em] text-ink-muted">About you</p>
            <dl className="mt-1 flex flex-wrap gap-x-5 gap-y-1 text-[15px] leading-snug">
              {about.map((item) => (
                <div key={item.label} className="flex gap-1.5">
                  <dt className="text-ink-muted">{item.label}</dt>
                  <dd className="font-semibold text-ink-heading">{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          {!editing && (
            <button
              type="button"
              className="shrink-0 text-[14.5px] font-semibold text-mint-deep underline decoration-mint/40 underline-offset-4"
              onClick={() => setEditing(true)}
            >
              Change
            </button>
          )}
        </div>

        {!editing && (
          <p className="mt-3 text-[14px] leading-[1.5] text-ink-muted">
            We read this from your photo. If anything is wrong, change it and your list updates.
          </p>
        )}

        {editing && (
          <div className="mt-4 flex flex-col gap-5 border-t border-line pt-4">
            {(faceUnsure || hairMissing) && (
              <p className="rounded-sm2 bg-mint-pale px-4 py-3 text-[14.5px] font-medium leading-[1.5] text-ink-heading">
                {/* 12.10.2026 (owner): say what we read, confidently, and ask for a quick check. */}
                {faceUnsure && (
                  <>
                    Your face reads as <strong>{initial.faceShape}</strong>
                    {initial.secondFaceShape && initial.secondFaceShape !== initial.faceShape ? (
                      <>, close to {initial.secondFaceShape}</>
                    ) : null}
                    .{" "}
                  </>
                )}
                {hairMissing && faceUnsure
                  ? "Take a quick look below, then add your hair length and type so we can match your cuts."
                  : hairMissing
                    ? "Add your hair length and type below so we can match your cuts."
                    : "Take a quick look below and tap another shape if it fits you better."}
              </p>
            )}

            <fieldset>
              <legend className="text-[15.5px] font-semibold text-ink-heading">Face shape</legend>
              <div role="radiogroup" aria-label="Face shape" className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-6">
                {FACE_SHAPES.map(({ shape, hint }) => {
                  const selected = faceShape === shape;
                  return (
                    <button
                      key={shape}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      title={hint}
                      onClick={() => {
                        setFaceShape(shape);
                        setFaceChanged(true);
                      }}
                      className={`flex flex-col items-center gap-1.5 rounded-[14px] border px-1 py-2.5 text-[14px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint-deep ${
                        selected
                          ? "border-mint bg-mint text-white"
                          : "border-line bg-surface text-ink-heading hover:border-ink-heading"
                      }`}
                    >
                      <FaceOutline shape={shape} className="h-10 w-8" />
                      {shape}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[13.5px] text-ink-muted">
                {FACE_SHAPES.find((f) => f.shape === faceShape)?.hint}.
              </p>
            </fieldset>

            <fieldset>
              <legend className="text-[15.5px] font-semibold text-ink-heading">
                {gender === "men" ? "How long is your hair on top now?" : "Where does your hair reach when it is left open?"}
              </legend>
              <div role="radiogroup" aria-label="Hair length now" className="mt-2.5 flex flex-wrap gap-2">
                {LENGTH_OPTIONS[gender].map((option) => (
                  <OptionPill key={option.value} selected={length === option.value} onClick={() => setLength(option.value)}>
                    {option.label}
                    {option.hint && <span className="ml-1.5 font-normal opacity-80">{option.hint}</span>}
                  </OptionPill>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-[15.5px] font-semibold text-ink-heading">Your natural hair type</legend>
              <div role="radiogroup" aria-label="Hair type" className="mt-2.5 flex flex-wrap gap-2">
                {TEXTURE_OPTIONS.map((option) => (
                  <OptionPill key={option.value} selected={texture === option.value} onClick={() => setTexture(option.value)}>
                    {option.label}
                  </OptionPill>
                ))}
              </div>
            </fieldset>

            {customer && (
              <button type="button" className="btn-secondary self-start !px-6 !py-2.5 !text-[15px]" onClick={() => setEditing(false)}>
                Done
              </button>
            )}
          </div>
        )}
      </div>

      {/* ---------------------------------------------------- The picks */}
      {!picks && (
        <p className="mt-6 rounded-[16px] bg-bg-soft px-5 py-5 text-[15.5px] font-medium leading-[1.5]" role="status">
          Choose your hair length and hair type above to see your hairstyles.
        </p>
      )}

      {picks && customer && (
        <div className="mt-7">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div>
              <h4 className="text-[21px] font-semibold leading-tight">
                {picks.top.length === 0
                  ? "No cuts match today"
                  : picks.top.length === 1
                    ? "Your best haircut"
                    : "Your best-matched haircuts"}
              </h4>
              {picks.top.length > 0 && (
                <p className="mt-1 text-[15px] text-ink-muted">
                  {/* 12.10.2026: the list is free and can be longer than a pack (5 here, 4 in the
                      Starter Pack); the heading no longer puts a number on it. */}
                  {picks.top.length} cuts you can get today, best match first. Choose which ones to see on you.
                </p>
              )}
            </div>
            {left !== null && left > 0 && (
              <p className="rounded-full bg-mint-pale px-4 py-1.5 text-[14px] font-semibold text-ink-heading" role="status">
                {left} {left === 1 ? "hairstyle" : "hairstyles"} left
              </p>
            )}
          </div>

          {picks.top.length > 0 && picks.top.length < 5 && (
            <p className="mt-3 text-[14.5px] leading-[1.5] text-ink-muted">
              With your hair as it is now, {picks.top.length === 1 ? "this is the one cut" : `these are the ${picks.top.length} cuts`} that
              suit you without growing it first.
            </p>
          )}
          {picks.top.length === 0 && (
            <p className="mt-3 text-[15px] leading-[1.5]">
              With your hair as it is now, the styles that suit you all need some growing first. They are listed below.
            </p>
          )}

          {samples && (
            <p className="mt-4 rounded-sm2 bg-bg-soft px-4 py-2.5 text-[13.5px] font-medium text-ink-muted">
              These are placeholder images while the AI is being switched on. They don&apos;t use up your
              hairstyles.
            </p>
          )}

          {allowanceSpent && (
            <div id="get-previews" className="mt-5 scroll-mt-24 rounded-[20px] bg-[#16261C] px-5 py-6 text-white sm:px-7">
              <h4 className="text-[20px] font-semibold leading-tight text-white">See them on your own photo</h4>
              <p className="mt-2 max-w-[56ch] text-[15px] leading-[1.5] text-white/75">
                Your list is free. To see a style on your own photo, pick a pack and then choose which styles to use it
                on. Each AI hairstyle shows the cut from the front, both sides and the back, with the words to give your
                barber.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {PACKS_ON_SALE.map((tier, i) => (
                  <a
                    key={tier}
                    href={`/checkout?tier=${tier}`}
                    className={`${i === 0 ? "btn-secondary" : "btn-amber"} w-full !px-5 !py-3 !text-[15.5px]`}
                  >
                    {PACK_TIERS[tier].imageCount} hairstyles · ₹{paiseToRupees(getCurrentPackPricePaise(tier)).split(".")[0]}
                  </a>
                ))}
              </div>
              <p className="mt-3 text-[13.5px] text-white/55">One-time payment. You come back to this list afterwards.</p>
            </div>
          )}

          {renderShare()}

          <ol className="mt-5 flex flex-col gap-4">
            {picks.top.map((pick, i) => renderPick(pick, i + 1))}
          </ol>

          {picks.more.length > 0 && (
            <div className="mt-8">
              <h4 className="text-[19px] font-semibold leading-tight">
                {picks.more.length} more that suit you
              </h4>
              <p className="mt-1 text-[15px] text-ink-muted">
                The next best matches. Some need your hair to grow first, and say so.
              </p>
              {showMore || picks.top.length === 0 ? (
                <ul className="mt-4 flex flex-col gap-4">
                  {picks.more.map((pick) => renderPick(pick, null))}
                </ul>
              ) : (
                <button type="button" className="btn-secondary mt-4 !px-6 !py-2.5 !text-[15px]" onClick={() => setShowMore(true)}>
                  Show them
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {offList.length > 0 && (
        <div className="mt-8">
          <h4 className="text-[19px] font-semibold leading-tight">Hairstyles you made earlier</h4>
          <ul className="mt-4 flex flex-col gap-4">
            {offList.map((preview) =>
              preview.state === "done" && preview.imageUrl ? (
                renderDone(null, preview, null)
              ) : (
                <li key={preview.style.id}>
                  {renderFrame(preview)}
                  <p className="mt-2 text-[15px] font-semibold text-ink-heading">{preview.style.name}</p>
                </li>
              )
            )}
          </ul>
        </div>
      )}

      {/* 13.10.2026: customer ratings. The paid part once a paid hairstyle's
          four views are ready; the free list always. */}
      {!samples && Object.values(previews).some((p) => p.viewsState === "done") && <RateBox section="hairstyles" />}
      <RateBox section="list" />

      <p className="mt-8 text-[13.5px] leading-[1.5] text-ink-muted">
        An AI hairstyle shows how a cut is likely to look on you. Your own hair and your barber&apos;s hand will make the real
        cut a little different.
      </p>
      <button type="button" className="btn-secondary mt-4 w-full" onClick={onStartOver}>
        Start over with new photos
      </button>
    </div>
  );
}
