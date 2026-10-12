// Tressform — reading a customer's photo the way a stylist would.
//
// 11.10.2026. WHY THIS EXISTS. The face-shape reading was built on the face
// service's jawline points (lib/faceShape.ts). Looking back over the first
// 23 real photos, 22 were called "Oval": the jaw measurement came out as
// 0.81 and the forehead measurement as 0.80 for every single face. Those
// points are placed by the service's own face template, not traced from the
// photo, so they carry nothing about the person. Hairstyle picks built on
// that reading would be the same for everybody.
//
// So the photo is now also read by a vision model, which is asked the three
// things the picker needs (lib/recommend.ts) and that the face service
// cannot give:
//   - face shape, with a second guess and how sure it is
//   - how long the hair is now
//   - whether the hair is straight, wavy or curly
//
// It runs through the FAL account the site already uses for pictures (FAL
// passes the request to the model), so there is no new account or key. The
// model is asked to write down what it sees first (which part of the face
// is widest, the jaw, length against width) and only then to name a shape:
// asked for a shape straight off, these models say "oval" far too often.
//
// A READING IS A STARTING POINT, NEVER THE LAST WORD. The customer sees
// what was read and can correct each item with one tap on the result
// screen. And when the reading fails for any reason (the model is down, it
// answers with something unusable, it takes too long) the site carries on:
// the customer is simply asked instead. Nothing here can stop an upload.
//
// FIRST RUN ON REAL PHOTOS, 11.10.2026 (the owner's 28 earlier uploads,
// through /api/admin/reread, each read once with the men's question and
// once with the women's): it worked, at about 5 paise a reading, and where
// the old measurement had said "Oval" for nearly everyone the people now
// came out as Round, Oval, Long, Heart and Square. Three things it showed
// were then fixed here:
//   - the same photo got a different face shape from the two questions in
//     3 of 28 cases, with the model "highly sure" each time. So a photo is
//     now read twice, with two wordings, and a disagreement is what marks
//     the reading as unsure (readPhotoTwice);
//   - a man with a receding hairline was read as "Heart";
//   - two curly-haired men were read as having long hair.
// The second and third are changes to the question that have not been run
// yet; the same tool reads the photos again to check them.

import type { FaceShape } from "../faceShape";
import { MEN_LENGTHS, WOMEN_LENGTHS, type HairGender, type HairLength, type HairTexture } from "../content/hairstyles";

const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;

export const VISION_MOCK_MODE = !FAL_AI_API_KEY;

const ENDPOINT = "openrouter/router/vision";
// Both were on the service's list, with working endpoints, when checked on
// 11.10.2026 (about $0.30 per million tokens in for the first; a reading
// is roughly two thousand tokens). The second is only tried when the first
// cannot be reached at all, for example on the day it is retired.
const DEFAULT_MODEL = "google/gemini-2.5-flash";
const BACKUP_MODEL = "google/gemini-3.8-flash";
/** PHOTO_READING_MODEL in Vercel swaps the model without a code change. Unset on the live site. */
export const VISION_MODEL = process.env.PHOTO_READING_MODEL || DEFAULT_MODEL;

// Long enough for a slow answer, short enough that a customer is never
// left staring at the waiting screen because of it.
const TIMEOUT_MS = 20_000;
const RUPEES_PER_DOLLAR = 88;

export type Sureness = "high" | "medium" | "low";

/** 12.10.2026: what the face service can't tell apart — stubble from a beard. */
export type FacialHairRead = "none" | "stubble" | "beard" | "moustache";
const FACIAL_HAIR: FacialHairRead[] = ["none", "stubble", "beard", "moustache"];

export interface PhotoReading {
  /** True when a usable face shape came back. */
  ok: boolean;
  faceShape: FaceShape | null;
  secondFaceShape: FaceShape | null;
  sure: Sureness | null;
  /** null = could not be told from the photo (tied back, covered, cropped). */
  hairLength: HairLength | null;
  hairTexture: HairTexture | null;
  /** Men only; null = not asked or not answered. */
  facialHair: FacialHairRead | null;
  /** What the model said it saw, kept for tuning. */
  observations: Record<string, string> | null;
  model: string;
  /** What this reading cost, when the service reported it. */
  costPaise: number | null;
  /** Why there is no reading, when ok is false. */
  note: string;
  mock: boolean;
}

const FACE_SHAPES: FaceShape[] = ["Oval", "Round", "Square", "Heart", "Diamond", "Long"];
const TEXTURES: HairTexture[] = ["straight", "wavy", "curly"];

const SYSTEM_PROMPT =
  "You are an experienced hairstylist looking at a client's front-facing photo before a haircut. " +
  "You answer with one JSON object and nothing else: no explanation, no markdown.";

// How curly hair is to be judged, said in both lists. In the first run on
// real photos (11.10.2026) both curly-haired men were read as "long" when
// their hair stops above the ears: curls stand out from the head, and the
// model took the volume for length.
const CURLS_NOTE = "  Judge curly hair by where it ends, not by how much it stands out from the head.";

function lengthGuide(gender: HairGender): string {
  if (gender === "men") {
    return (
      '"hair_length": how long the hair on TOP of the head is now. One of:\n' +
      '  "very-short" = clipped close to the scalp, under 2 cm\n' +
      '  "short" = about 2 to 5 cm, lying close to the head, ears completely clear\n' +
      '  "medium" = about 5 to 10 cm, enough to comb over, sweep back or stand up; ends at or above the ears\n' +
      '  "long" = hangs down over the ears to the jaw, the collar or lower\n' +
      "  null = cannot be judged (covered by a cap or turban, tied back, or cut off by the frame)\n" +
      CURLS_NOTE +
      // 12.10.2026: a man with about 4 cm on top, pushed up a little, was
      // read as "medium"; his previews then grew his hair to 7–9 cm.
      "\n  Judge the length of the hair itself, not how high it is pushed up. If it is between two, choose the shorter one."
    );
  }
  return (
    '"hair_length": where the hair reaches when it is left open. One of:\n' +
    '  "ear" = ends around the ears\n' +
    '  "chin" = ends around the chin or jaw\n' +
    '  "shoulder" = rests on or just above the shoulders\n' +
    '  "below-shoulder" = clearly longer than the shoulders\n' +
    "  null = cannot be judged (tied back in a bun or ponytail, covered, or cut off by the frame)\n" +
    CURLS_NOTE
  );
}

const SHAPE_LINES = [
  '  "Round" = about as wide as it is long, full cheeks, soft rounded jaw',
  '  "Square" = about as wide as it is long, forehead and jaw of similar width, strong angular jaw',
  '  "Oval" = a little longer than wide, cheekbones the widest part, jaw gently narrower and rounded',
  '  "Long" = clearly longer than wide, forehead, cheeks and jaw of similar width',
  '  "Heart" = forehead the widest part, narrowing to a small or pointed chin',
  '  "Diamond" = cheekbones the widest part, forehead and jaw both narrower, pointed chin',
];

/**
 * The question put to the model. There are two wordings of it (`variant`),
 * asking for exactly the same things: the second lists the six shapes in
 * the opposite order and asks about the hair first. A photo is read with
 * both (readPhotoTwice below), because the first run on real photos showed
 * that a small change in the question can change the answer for a face
 * that sits between two shapes, and that the model calls itself "highly
 * sure" either way. Two answers that agree are worth trusting; two that
 * differ tell us to ask the customer.
 */
export function buildReadingPrompt(gender: HairGender, variant: 0 | 1 = 0): string {
  const face =
    "What you see of the face outline. Where hair or a beard covers it, estimate the outline underneath. " +
    // 11.10.2026: a man with a receding hairline and a full jaw was read
    // as "Heart": the bare forehead was taken for a wide one.
    "Judge the forehead by its width at the temples, not by its height: a high or receding hairline does not make the forehead the widest part.\n" +
    '"widest_part": "forehead", "cheekbones", "jaw" or "all similar"\n' +
    '"jaw": "rounded", "angular" or "pointed"\n' +
    '"length_vs_width": the face from hairline to chin against its width: "about equal", "a little longer" or "much longer"\n\n' +
    "The face shape that fits what you wrote:\n" +
    '"face_shape": one of\n' +
    `${(variant === 0 ? SHAPE_LINES : [...SHAPE_LINES].reverse()).join("\n")}\n` +
    "  Do not choose Oval as a safe answer. Choose it only when the description of Oval fits better than the other five.\n" +
    '"second_shape": the next closest of the same six, different from face_shape\n' +
    '"sure": how sure you are of face_shape: "high", "medium" or "low"';
  const hair =
    "The hair:\n" +
    `${lengthGuide(gender)}\n` +
    '"hair_type": the natural texture: "straight", "wavy" or "curly"; null if it cannot be judged' +
    (gender === "men"
      ? "\n" +
        '"facial_hair": one of\n' +
        '  "none" = clean-shaven, no visible hair growth\n' +
        '  "stubble" = short stubble only, a few days\' growth, skin clearly visible through it\n' +
        '  "beard" = a grown beard covering the jaw or chin, skin not visible through it\n' +
        '  "moustache" = a moustache with the cheeks and chin clean-shaven or only stubbled\n' +
        "  If it is between stubble and beard, choose stubble."
      : "");
  return (
    "Look at the person in this photo and fill in this JSON object, in this order.\n\n" +
    `${variant === 0 ? `${face}\n\n${hair}` : `${hair}\n\n${face}`}\n\n` +
    "Answer with the JSON object only."
  );
}

function pickFrom<T extends string>(value: unknown, allowed: readonly T[], aliases: Record<string, T> = {}): T | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase().replace(/[_\s]+/g, "-");
  const exact = allowed.find((option) => option.toLowerCase() === cleaned);
  return exact ?? aliases[cleaned] ?? null;
}

const SHAPE_ALIASES: Record<string, FaceShape> = {
  oblong: "Long",
  rectangle: "Long",
  rectangular: "Long",
  "heart-shaped": "Heart",
  "diamond-shaped": "Diamond",
};

/**
 * Turn the model's answer into a reading. Anything that is not exactly one
 * of the allowed values is dropped, so a strange answer can make a reading
 * incomplete but never wrong in a new way.
 */
export function parseReading(output: string, gender: HairGender): Omit<PhotoReading, "model" | "costPaise" | "mock"> {
  const none = (note: string) => ({
    ok: false,
    faceShape: null,
    secondFaceShape: null,
    sure: null,
    hairLength: null,
    hairTexture: null,
    facialHair: null,
    observations: null,
    note,
  });

  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start < 0 || end <= start) return none("the answer was not JSON");
  let data: Record<string, unknown>;
  try {
    data = JSON.parse(output.slice(start, end + 1));
  } catch {
    return none("the answer was not valid JSON");
  }

  const faceShape = pickFrom(data.face_shape, FACE_SHAPES, SHAPE_ALIASES);
  const second = pickFrom(data.second_shape, FACE_SHAPES, SHAPE_ALIASES);
  const lengths: readonly HairLength[] = gender === "men" ? MEN_LENGTHS : WOMEN_LENGTHS;
  const observations: Record<string, string> = {};
  for (const key of ["widest_part", "jaw", "length_vs_width"]) {
    if (typeof data[key] === "string") observations[key] = (data[key] as string).slice(0, 40);
  }

  return {
    ok: faceShape !== null,
    faceShape,
    secondFaceShape: second && second !== faceShape ? second : null,
    sure: pickFrom(data.sure, ["high", "medium", "low"] as const),
    hairLength: pickFrom(data.hair_length, lengths),
    hairTexture: pickFrom(data.hair_type, TEXTURES),
    facialHair: gender === "men" ? pickFrom(data.facial_hair, FACIAL_HAIR) : null,
    observations,
    note: faceShape ? "" : "no usable face shape in the answer",
  };
}

// 12.10.2026: when the two readings differ, the smaller answer is used. A
// preview that grows hair or a beard the customer doesn't have is the
// mistake customers notice most; one that keeps things a little short is not.
const LENGTH_ORDER: readonly string[] = [...MEN_LENGTHS, ...WOMEN_LENGTHS];
export function shorterLength(a: HairLength | null, b: HairLength | null): HairLength | null {
  if (!a || !b) return a ?? b;
  return LENGTH_ORDER.indexOf(a) <= LENGTH_ORDER.indexOf(b) ? a : b;
}
const FACIAL_ORDER: FacialHairRead[] = ["none", "moustache", "stubble", "beard"];
export function lessFacialHair(a: FacialHairRead | null, b: FacialHairRead | null): FacialHairRead | null {
  if (!a || !b) return a ?? b;
  return FACIAL_ORDER.indexOf(a) <= FACIAL_ORDER.indexOf(b) ? a : b;
}

function withTimeout<T>(work: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`no answer after ${ms / 1000} seconds`)), ms);
    work.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

/**
 * Read a front photo. `imageUrl` must be a link the model can open (a
 * signed storage link) or a data: URL. Never throws: a failure comes back
 * as `ok: false` with the reason in `note`.
 */
export async function readPhoto(imageUrl: string, gender: HairGender, variant: 0 | 1 = 0): Promise<PhotoReading> {
  if (VISION_MOCK_MODE) {
    // No FAL key (local demo): a fixed, plausible reading so the whole
    // flow can be tried. PHOTO_READING_MOCK=fail tries the fallback path.
    if (process.env.PHOTO_READING_MOCK === "fail") {
      return {
        ok: false,
        faceShape: null,
        secondFaceShape: null,
        sure: null,
        hairLength: null,
        hairTexture: null,
        facialHair: null,
        observations: null,
        model: "mock",
        costPaise: 0,
        note: "mock failure",
        mock: true,
      };
    }
    return {
      ok: true,
      faceShape: gender === "men" ? "Square" : "Round",
      secondFaceShape: "Oval",
      sure: "medium",
      hairLength: gender === "men" ? "medium" : "below-shoulder",
      hairTexture: gender === "men" ? "straight" : "wavy",
      facialHair: gender === "men" ? "stubble" : null,
      observations: { widest_part: "all similar", jaw: gender === "men" ? "angular" : "rounded", length_vs_width: "about equal" },
      model: "mock",
      costPaise: 0,
      note: "",
      mock: true,
    };
  }

  const failed = (note: string): PhotoReading => ({
    ok: false,
    faceShape: null,
    secondFaceShape: null,
    sure: null,
    hairLength: null,
    hairTexture: null,
    facialHair: null,
    observations: null,
    model: VISION_MODEL,
    costPaise: null,
    note,
    mock: false,
  });

  const started = Date.now();
  let lastNote = "the reading service did not answer";
  for (const model of VISION_MODEL === BACKUP_MODEL ? [VISION_MODEL] : [VISION_MODEL, BACKUP_MODEL]) {
    const timeLeft = TIMEOUT_MS - (Date.now() - started);
    if (timeLeft < 3000) break;
    try {
      const { createFalClient } = await import("@fal-ai/client");
      const fal = createFalClient({ credentials: FAL_AI_API_KEY });
      const response = (await withTimeout(
        fal.subscribe(ENDPOINT as string, {
          input: {
            model,
            system_prompt: SYSTEM_PROMPT,
            prompt: buildReadingPrompt(gender, variant),
            image_urls: [imageUrl],
            // The same photo should give the same reading every time.
            temperature: 0,
            // The answer itself is about 100 tokens; the room is for a model
            // that thinks before it answers.
            max_tokens: 2000,
          },
          logs: false,
        }),
        timeLeft
      )) as { data?: { output?: unknown; usage?: { cost?: unknown } } };

      const output = response.data?.output;
      if (typeof output !== "string" || !output.trim()) {
        console.error("[Tressform] Photo reading came back empty:", model, JSON.stringify(response.data ?? "").slice(0, 400));
        return { ...failed("empty answer"), model };
      }
      const cost = response.data?.usage?.cost;
      const parsed = parseReading(output, gender);
      if (!parsed.ok) console.error("[Tressform] Photo reading not usable:", model, parsed.note, output.slice(0, 400));
      return {
        ...parsed,
        model,
        // Kept to a hundredth of a paisa: one reading costs a fraction of a rupee.
        costPaise: typeof cost === "number" ? Math.round(cost * RUPEES_PER_DOLLAR * 100 * 100) / 100 : null,
        mock: false,
      };
    } catch (err) {
      // The model could not be reached (retired, down, too slow): the next one is tried.
      const status = (err as { status?: number })?.status;
      const body = (err as { body?: unknown })?.body;
      console.error("[Tressform] Photo reading failed:", model, status ?? "", (err as Error)?.message ?? "", JSON.stringify(body ?? "").slice(0, 400));
      // The note is saved with the photo (never shown to a customer), so the
      // service's own explanation is kept in it.
      const detail = body ? ` ${JSON.stringify(body).slice(0, 200)}` : "";
      lastNote = `${model}: ${(err as Error)?.message || "no answer"}${status ? ` (${status})` : ""}${detail}`;
    }
  }
  return failed(lastNote);
}

export interface CheckedReading extends PhotoReading {
  /** Whether the two readings named the same face shape. null = only one reading came back. */
  agreed: boolean | null;
  /** The second reading's answer, kept for looking back at. */
  other: {
    faceShape: FaceShape | null;
    secondFaceShape: FaceShape | null;
    sure: Sureness | null;
    observations: Record<string, string> | null;
    note: string;
  } | null;
  /** How two different answers were settled: "observations" when what the model saw decided it. */
  settledBy?: "observations";
}

/**
 * The face shape that follows from what the model said it SAW, where that
 * is clear-cut; null where it is not.
 *
 * 11.10.2026, from the second run on the owner's photos. Asked twice, the
 * model often named two shapes for one face: "Long" with the first wording
 * and "Oval" with the second, for six of the nine people. Yet both times it
 * had written down the same observations, and those usually pointed to one
 * of the two: a face "a little longer than wide" is not a long face, which
 * is "clearly longer". What it saw is steadier than the name it gives, so a
 * disagreement is settled by the observations when they favour one side.
 */
export function shapeFromObservations(observations: Record<string, string> | null): FaceShape | null {
  if (!observations) return null;
  const length = (observations.length_vs_width ?? "").toLowerCase();
  const widest = (observations.widest_part ?? "").toLowerCase();
  const jaw = (observations.jaw ?? "").toLowerCase();
  if (length.includes("much")) return "Long";
  if (length.includes("equal")) return jaw.includes("angular") ? "Square" : jaw.includes("rounded") ? "Round" : null;
  if (length.includes("little")) {
    if (widest.includes("forehead")) return "Heart";
    if (widest.includes("cheek")) return jaw.includes("pointed") ? "Diamond" : "Oval";
    if (widest.includes("similar") && jaw.includes("rounded")) return "Oval";
  }
  return null;
}

/**
 * Read a photo with both wordings of the question, at the same moment, and
 * settle the two answers:
 *   - same face shape twice: that shape, as sure as the reading said;
 *   - two different shapes: if what the model said it saw points to one of
 *     them (shapeFromObservations), that one, with the other as the second
 *     guess, "medium" sure. Otherwise the first reading's shape with the
 *     other as the second guess, marked "low", so the page asks the
 *     customer to check and the picker leaves out styles that are wrong
 *     for either;
 *   - only one reading came back: that one, never more than "medium";
 *   - neither: no reading (the page asks the customer everything).
 * Hair length and type come from the first reading, or from the second
 * where the first could not tell. Costs two readings, a few paise each.
 */
export async function readPhotoTwice(imageUrl: string, gender: HairGender): Promise<CheckedReading> {
  const [a, b] = await Promise.all([readPhoto(imageUrl, gender, 0), readPhoto(imageUrl, gender, 1)]);
  return settleReadings(a, b);
}

/** The settling rule on its own, so it can be tested without calling a model. */
export function settleReadings(a: PhotoReading, b: PhotoReading): CheckedReading {
  const costPaise = a.costPaise === null && b.costPaise === null ? null : Math.round(((a.costPaise ?? 0) + (b.costPaise ?? 0)) * 100) / 100;
  const brief = (r: PhotoReading) => ({
    faceShape: r.faceShape,
    secondFaceShape: r.secondFaceShape,
    sure: r.sure,
    observations: r.observations,
    note: r.note,
  });

  if (!a.ok && !b.ok) return { ...a, costPaise, agreed: null, other: brief(b) };

  if (a.ok && b.ok) {
    const hair = {
      hairLength: shorterLength(a.hairLength, b.hairLength),
      hairTexture: a.hairTexture ?? b.hairTexture,
      facialHair: lessFacialHair(a.facialHair, b.facialHair),
    };
    if (a.faceShape === b.faceShape) return { ...a, ...hair, costPaise, agreed: true, other: brief(b) };
    // Two different shapes. What each reading saw may settle it: the two
    // sets of observations must not point to different shapes, and the
    // shape they point to must be one of the two that were named.
    const seenA = shapeFromObservations(a.observations);
    const seenB = shapeFromObservations(b.observations);
    const seen = seenA && seenB && seenA !== seenB ? null : (seenA ?? seenB);
    if (seen && (seen === a.faceShape || seen === b.faceShape)) {
      const other = seen === a.faceShape ? b.faceShape : a.faceShape;
      return {
        ...a,
        ...hair,
        faceShape: seen,
        secondFaceShape: other,
        sure: "medium",
        costPaise,
        agreed: false,
        settledBy: "observations",
        other: brief(b),
      };
    }
    return { ...a, ...hair, secondFaceShape: b.faceShape, sure: "low", costPaise, agreed: false, other: brief(b) };
  }

  const one = a.ok ? a : b;
  return { ...one, sure: one.sure === "low" ? "low" : "medium", costPaise, agreed: null, other: brief(a.ok ? b : a) };
}
