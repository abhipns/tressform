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
// This component only shows things and asks for previews. Which styles are
// picked is decided in lib/recommend.ts; making a preview is done by the
// function the upload flow passes in.

import { useEffect, useMemo, useState } from "react";
import type { FaceShape } from "@/lib/faceShape";
import {
  HAIRSTYLES,
  MEN_LENGTHS,
  WOMEN_LENGTHS,
  barberLine,
  type HairGender,
  type HairLength,
  type HairTexture,
  type Hairstyle,
} from "@/lib/content/hairstyles";
import { pickStyles, type CustomerHair, type StylePick } from "@/lib/recommend";
import { reasonsFor, UPKEEP_LABEL } from "@/lib/pickReasons";

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
  | { ok: true; imageUrl: string; sample: boolean; previewsLeft: number | null }
  | { ok: false; noAllowance: boolean; rejected: boolean; message: string };

type PreviewState = { state: "loading" | "done" | "failed"; imageUrl?: string; message?: string; style: Hairstyle };

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
  onStartOver: () => void;
  /** Previews already made from this photo, by style name. */
  earlier?: { styleName: string; url: string }[];
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

  // The face shape needs a look from the customer when the reading was not
  // sure of it, or failed and the old measurement stood in.
  const faceUnsure = initial.readBy === "measurement" || initial.sure === "low";
  const hairMissing = initial.hair.length === null || initial.hair.texture === null;
  const [editing, setEditing] = useState(faceUnsure || hairMissing);

  const [previews, setPreviews] = useState<Record<string, PreviewState>>(() => {
    const made: Record<string, PreviewState> = {};
    for (const item of earlier ?? []) {
      const style = HAIRSTYLES.find((h) => h.gender === gender && h.name === item.styleName);
      if (style) made[style.id] = { state: "done", imageUrl: item.url, style };
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
        message: "This preview couldn't be created. Please check your connection and try again.",
      };
    }
    if (outcome.ok) {
      const done = outcome;
      setPreviews((prev) => ({ ...prev, [style.id]: { state: "done", imageUrl: done.imageUrl, style } }));
      if (done.sample) setSamples(true);
      else if (done.previewsLeft !== null) setLeft(done.previewsLeft);
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
  function renderPick(pick: StylePick, rank: number | null) {
    const preview = previews[pick.style.id];
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
                <a href="#pricing" className="btn-secondary !px-6 !py-2.5 !text-[15px]">
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
                packs are sold as "barber instructions with every preview",
                and the two belong together at the barber's anyway. */}
            {preview?.state === "done" ? (
              <div className="mt-4 border-t border-line pt-3">
                <p className="text-[14.5px] font-semibold text-ink-heading">What to tell your barber</p>
                <p className="mt-1.5 text-[14.5px] leading-[1.55]">{barberLine(pick.style)}</p>
                <p className="mt-1.5 text-[13.5px] text-ink-muted">Showing them the picture as well works best.</p>
              </div>
            ) : (
              <p className="mt-4 border-t border-line pt-3 text-[13.5px] text-ink-muted">
                What to tell your barber comes with the preview.
              </p>
            )}
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
          Creating your preview. About 20 seconds.
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
                {hairMissing && faceUnsure
                  ? "We couldn't read everything from your photo. Please check your face shape and tell us about your hair."
                  : hairMissing
                    ? "We couldn't tell everything about your hair from the photo. Please fill in what is missing."
                    : "We weren't sure of your face shape from the photo. Please check it."}
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
                    : `Your top ${picks.top.length} haircuts`}
              </h4>
              {picks.top.length > 0 && (
                <p className="mt-1 text-[15px] text-ink-muted">Cuts you can get today, best match first.</p>
              )}
            </div>
            {left !== null && left > 0 && (
              <p className="rounded-full bg-mint-pale px-4 py-1.5 text-[14px] font-semibold text-ink-heading" role="status">
                {left} {left === 1 ? "preview" : "previews"} left
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
              These are placeholder images while live previews are being switched on. They don&apos;t use up your free
              previews.
            </p>
          )}

          <ol className="mt-5 flex flex-col gap-4">
            {picks.top.map((pick, i) => renderPick(pick, i + 1))}
          </ol>

          {allowanceSpent && (
            <div className="mt-6 rounded-[16px] bg-mint-pale px-5 py-5 text-center">
              <p className="mb-4 text-[15px] font-medium text-ink-heading">
                You have no previews left. Choose a pack to see more of these styles on your own photo.
              </p>
              <a href="#pricing" className="btn-primary">
                See packs
              </a>
            </div>
          )}

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
          <h4 className="text-[19px] font-semibold leading-tight">Previews you made earlier</h4>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {offList.map((preview) => (
              <li key={preview.style.id}>
                {renderFrame(preview)}
                <p className="mt-2 text-[15px] font-semibold text-ink-heading">{preview.style.name}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-8 text-[13.5px] leading-[1.5] text-ink-muted">
        A preview shows how a cut is likely to look on you. Your own hair and your barber&apos;s hand will make the real
        cut a little different.
      </p>
      <button type="button" className="btn-secondary mt-4 w-full" onClick={onStartOver}>
        Start over with new photos
      </button>
    </div>
  );
}
