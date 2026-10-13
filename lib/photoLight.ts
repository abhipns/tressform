// Is the light on this photo good enough? (11.10.2026)
//
// The owner took a selfie in poor light and the site accepted it. The face
// analysis only rejected photos with no face, two faces, sunglasses, a tiny
// face or a turned head; nothing looked at the light. And the brightness
// score from the face service cannot do it alone: his poor selfie scored
// 69.7 and a well-lit studio portrait scored 71.0.
//
// So the light is measured here, from the pixels, in the customer's own
// browser — live in the selfie camera, and again on every photo added.
//
// The rules are written so a person's skin tone cannot fail them. A face is
// never judged by how bright it is on average. It is judged by:
//   - its brightest parts (highlights on the forehead, nose and cheeks, the
//     whites of the eyes): in usable light every face has some, whatever
//     its colour; in a dark room or with the light behind the head, none;
//   - the two sides of the face against each other;
//   - how much of it is burnt out to pure white.
//
// All numbers are 0–255 brightness. They were set by measuring three
// well-lit portraits (a young man, a man in his fifties, a woman; each at
// three distances from the camera — all must pass) and darkened,
// half-shadowed, backlit and over-lit versions of them (which must fail).
// tests/photoLight.test.ts keeps the rules honest with drawn pictures.
// Still to do: tune against real selfies taken in poor light.

export type LightProblem = "dark" | "backlit" | "uneven" | "glare";

export interface FaceRegion {
  /** Centre and radii of an ellipse over the face, as fractions of the picture's width and height. */
  cx: number;
  cy: number;
  rx: number;
  ry: number;
}

/**
 * Where the selfie camera's dashed outline sits (components/SelfieCamera.tsx).
 * 13.10.2026: made smaller and higher, with a shoulder line under it, so a
 * customer stands back far enough for the shoulders to be in the photo (the
 * owner found previews cut off at the chin when the face filled the frame).
 */
export const GUIDE_OVAL: FaceRegion = { cx: 0.5, cy: 0.375, rx: 0.22, ry: 0.215 };

export interface LightReading {
  problem: LightProblem | null;
  /** What to tell the customer, or null when the light is fine. */
  message: string | null;
  stats: {
    frameMean: number;
    frameBright: number; // 95th percentile of the whole picture
    faceBright: number | null; // 90th percentile inside the face
    faceMean: number | null;
    sideRatio: number | null; // brighter cheek ÷ darker cheek
    faceBurnt: number | null; // share of the face at pure white
    surroundMean: number | null;
  };
}

export const LIGHT_MESSAGES: Record<LightProblem, string> = {
  dark: "It is too dark. Face a window or switch on a light in front of you.",
  backlit: "The light is behind you. Turn around so the light falls on your face.",
  uneven: "One side of your face is in shadow. Turn to face the light.",
  glare: "There is too much light on your face. Move out of direct sun or away from the lamp.",
};

// A face needs highlights at least this bright …
const FACE_BRIGHT_MIN = 96;
// … and a picture with no face outline needs something this bright in it.
const FRAME_BRIGHT_MIN = 90;
const FRAME_MEAN_MIN = 42;
// "Behind you": the face is dark while its surroundings are much brighter.
const BACKLIT_SURROUND_RATIO = 1.9;
const BACKLIT_SURROUND_MIN = 150;
// One cheek this many times brighter than the other, and visibly so. Set
// high on purpose: hair over one cheek or a slightly turned head makes the
// two sides differ a little in perfectly good light.
const SIDE_RATIO_MAX = 2.0;
const SIDE_DIFF_MIN = 40;
// More than this share of the face burnt out to white.
const FACE_BURNT_MAX = 0.22;
const BURNT = 250;

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * p)))];
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (const v of values) sum += v;
  return sum / values.length;
}

/**
 * Measure the light in a picture.
 *
 * `data` is RGBA, as a canvas gives it. A small picture is enough and is
 * what callers pass (about 60 × 80). `face` says where the face is; pass
 * null when that is not known (a photo chosen from the gallery) and only
 * the whole-picture darkness rule is applied.
 */
export function readLight(
  data: ArrayLike<number>,
  width: number,
  height: number,
  face: FaceRegion | null,
  /** `sides: false` skips the two-cheeks rule: for a side-on photo, where one "cheek" is hair. */
  options: { sides?: boolean } = {}
): LightReading {
  const frame: number[] = [];
  const faceAll: number[] = [];
  const left: number[] = [];
  const right: number[] = [];
  const surround: number[] = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const lum = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
      frame.push(lum);
      if (!face) continue;
      const dx = ((x + 0.5) / width - face.cx) / face.rx;
      const dy = ((y + 0.5) / height - face.cy) / face.ry;
      const d = dx * dx + dy * dy;
      // The inner part of the outline is skin; its rim is hair and ears.
      if (d <= 0.62) {
        faceAll.push(lum);
        // The cheeks: the middle band of the face, either side of the nose,
        // kept away from the edge where hair and ears begin.
        if (d <= 0.45 && dy > -0.1 && dy < 0.5 && Math.abs(dx) > 0.15) (dx < 0 ? left : right).push(lum);
      } else if (d >= 1.7 && dy < 1.05) {
        // Beside and above the head, not the clothes below it.
        surround.push(lum);
      }
    }
  }

  frame.sort((a, b) => a - b);
  const frameMean = mean(frame);
  const frameBright = percentile(frame, 0.95);

  let faceBright: number | null = null;
  let faceMean: number | null = null;
  let sideRatio: number | null = null;
  let faceBurnt: number | null = null;
  let surroundMean: number | null = null;
  let problem: LightProblem | null = null;

  if (face && faceAll.length > 0) {
    faceAll.sort((a, b) => a - b);
    faceBright = percentile(faceAll, 0.9);
    faceMean = mean(faceAll);
    faceBurnt = faceAll.filter((v) => v >= BURNT).length / faceAll.length;
    surroundMean = surround.length > 0 ? mean(surround) : null;
    // The brighter skin of each cheek, so a strand of dark hair across one
    // of them does not count as shadow.
    left.sort((a, b) => a - b);
    right.sort((a, b) => a - b);
    const l = percentile(left, 0.75);
    const r = percentile(right, 0.75);
    const lo = Math.max(1, Math.min(l, r));
    const hi = Math.max(l, r);
    sideRatio = left.length > 0 && right.length > 0 ? hi / lo : null;

    if (faceBright < FACE_BRIGHT_MIN) {
      const behind =
        surroundMean !== null && surroundMean >= BACKLIT_SURROUND_MIN && surroundMean >= faceMean * BACKLIT_SURROUND_RATIO;
      problem = behind ? "backlit" : "dark";
    } else if (faceBurnt > FACE_BURNT_MAX) {
      problem = "glare";
    } else if (options.sides !== false && sideRatio !== null && sideRatio > SIDE_RATIO_MAX && hi - lo > SIDE_DIFF_MIN) {
      problem = "uneven";
    }
  } else if (frameBright < FRAME_BRIGHT_MIN || frameMean < FRAME_MEAN_MIN) {
    problem = "dark";
  }

  const round = (v: number | null) => (v === null ? null : Math.round(v * 100) / 100);
  return {
    problem,
    message: problem ? LIGHT_MESSAGES[problem] : null,
    stats: {
      frameMean: Math.round(frameMean),
      frameBright: Math.round(frameBright),
      faceBright: faceBright === null ? null : Math.round(faceBright),
      faceMean: faceMean === null ? null : Math.round(faceMean),
      sideRatio: round(sideRatio),
      faceBurnt: round(faceBurnt),
      surroundMean: surroundMean === null ? null : Math.round(surroundMean),
    },
  };
}

/** Measure a picture that is on a canvas-drawable source (a video frame, an image, another canvas). */
export function readLightFrom(
  source: CanvasImageSource,
  crop: { sx: number; sy: number; sw: number; sh: number },
  face: FaceRegion | null,
  options: { sides?: boolean } = {}
): LightReading | null {
  const width = 60;
  const height = Math.max(1, Math.round((width * crop.sh) / crop.sw));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(source, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
  try {
    return readLight(ctx.getImageData(0, 0, width, height).data, width, height, face, options);
  } catch {
    return null;
  }
}
