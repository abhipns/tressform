// Tressform — FAL AI integration (hairstyle preview generation).
//
// MOCK MODE: when FAL_AI_API_KEY is absent, generateHairstyle() "succeeds"
// after a short simulated delay and returns a placeholder image URL, so the
// full generate → display flow works without a FAL account.
//
// 09.10.2026: real implementation wired up (was a commented-out sketch).
//
// WHICH MODEL — a change from spec Part H, worth knowing about. The spec
// names PuLID Flux. PuLID *generates a brand-new portrait* of someone who
// looks like the reference face: different clothes, background, pose and
// lighting every time. Tressform's promise is "this haircut on YOUR photo",
// which is an *edit* of the customer's own picture, not a new picture. So
// the default here is an image-EDITING model (it takes the customer's photo
// plus an instruction and changes only the hair). PuLID is still supported:
// set FAL_AI_MODEL to "fal-ai/flux-pulid" in Vercel to switch, no code
// change needed. The three supported models and their list prices on
// fal.ai as checked on 09.10.2026:
//   fal-ai/nano-banana/edit   $0.039 / image   (default)
//   fal-ai/flux-pro/kontext   $0.04  / image
//   fal-ai/flux-pulid         see fal.ai pricing
// At ~₹88/USD the default is about ₹3.45 an image — in line with the
// ₹3.50 the Part I P&L assumes (FALAI_COST_PER_IMAGE_PAISE below).
//
// The generated image comes back as a link on FAL's own file storage. The
// caller (/api/generate) copies it into Tressform's private "results"
// storage rather than handing that link to the customer.

const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;

export const FALAI_MOCK_MODE = !FAL_AI_API_KEY;

export const FALAI_MODELS = {
  "fal-ai/nano-banana/edit": "edit-multi",
  // 10.10.2026: the higher-quality sibling, $0.15 / image (about four times
  // the default). Added so the owner can compare it in the Studio; takes
  // the same input as the default.
  "fal-ai/nano-banana-pro/edit": "edit-multi",
  // 10.10.2026 (later): two more candidates for the Studio. The owner's
  // tests showed the default model redrawing the customer's face while Pro
  // edits the photo in place — so these are tried in the hope of Pro's
  // faithfulness for less. Nano Banana 2 is Google's newer mid-priced
  // model ($0.08 at its default 1K size); Seedream 4 is ByteDance's editor
  // ($0.03). Prices and inputs read from fal.ai on the day.
  "fal-ai/nano-banana-2/edit": "edit-multi",
  "fal-ai/bytedance/seedream/v4/edit": "edit-seedream",
  "fal-ai/flux-pro/kontext": "edit-single",
  "fal-ai/flux-pulid": "identity",
} as const;
export type FalaiModel = keyof typeof FALAI_MODELS;

const DEFAULT_MODEL: FalaiModel = "fal-ai/nano-banana/edit";

/** FAL_AI_MODEL in Vercel, when it names a model this code knows. Unset on the live site. */
function modelOverride(): FalaiModel | null {
  const requested = process.env.FAL_AI_MODEL;
  if (!requested) return null;
  if (requested in FALAI_MODELS) return requested as FalaiModel;
  console.error(`[Tressform] FAL_AI_MODEL "${requested}" isn't one this code knows, so it is ignored.`);
  return null;
}

/** The model used when nothing says whose hairstyle it is. */
export const FALAI_MODEL: FalaiModel = modelOverride() ?? DEFAULT_MODEL;

// WHICH MODEL FOR WHOM.
//
// 10.10.2026: after making all 12 Studio styles on both models for one
// man's and one woman's photo, the owner chose Nano Banana for women (it
// gave the cut that was asked for and kept her face; Flux cut most styles
// down to a short bob with a fringe nobody asked for) and Flux for men
// (clearer fades and tapers).
//
// 11.10.2026: Flux dropped for men too. The owner made eight styles for a
// second man — in his fifties, grey curly hair — and Flux returned eight
// pictures with dark straight hair, five of them with a different, younger
// man's face. A shorter, identity-first instruction (buildKontextPrompt)
// gave him his age back but still not his face, eye colour or grey hair.
// Nano Banana, on the same photo and style, returned the same man. A
// preview of somebody else is worth nothing to a customer, so keeping the
// person comes before a sharper fade.
//
// Both genders are still listed separately so one can be moved without
// touching the other. Setting FAL_AI_MODEL in Vercel overrides this for
// everyone (a way back if a model has an outage). Flux stays available in
// the owner's Studio for comparison.
export type HairGender = "men" | "women";
export const FALAI_MODEL_BY_GENDER: Record<HairGender, FalaiModel> = {
  men: "fal-ai/nano-banana/edit",
  women: "fal-ai/nano-banana/edit",
};

export function modelForGender(gender: HairGender | null | undefined): FalaiModel {
  const override = modelOverride();
  if (override) return override;
  return gender === "men" || gender === "women" ? FALAI_MODEL_BY_GENDER[gender] : DEFAULT_MODEL;
}

export const FALAI_COST_PER_IMAGE_PAISE = 350; // ≈₹3.50/image, see Part H / Part I
/** What one image costs on each model, in paise, at about ₹88 to the dollar (list prices checked 10.10.2026). */
export const FALAI_COST_BY_MODEL_PAISE: Record<FalaiModel, number> = {
  "fal-ai/nano-banana/edit": 350, // $0.039
  "fal-ai/nano-banana-pro/edit": 1320, // $0.15
  "fal-ai/nano-banana-2/edit": 704, // $0.08 at 1K
  "fal-ai/bytedance/seedream/v4/edit": 264, // $0.03
  "fal-ai/flux-pro/kontext": 350, // $0.04
  "fal-ai/flux-pulid": 350, // not checked — treated as the default
};

export interface GenerateHairstyleParams {
  sourceImageUrl: string; // a link FAL can open: a signed storage URL, or a data: URL
  styleName: string; // e.g. "Textured Quiff — Low Taper"
  faceShape?: string | null;
  /** From face analysis: tells the model what to do about facial hair instead of leaving it to guess. */
  facialHair?: "beard" | "moustache" | "clean" | "stubble" | null;
  addonKind?: "BACKGROUND" | "OUTFIT" | null;
  /**
   * 14.10.2026: for a cut the customer can get today, how long their hair
   * is now (a sentence from LENGTH_NOW). The picture must not come out
   * with more hair than that. Left out for a style they must grow into.
   */
  lengthNow?: string | null;
  /**
   * The owner's Studio page only (10.10.2026): the hairstyle in the owner's
   * own words, used instead of the built-in description for `styleName`.
   */
  styleDescription?: string | null;
  /** Whose hairstyle this is. Decides which image model is used (see FALAI_MODEL_BY_GENDER). */
  gender?: HairGender | null;
  /** Studio only: try a different one of the supported models for this one image. */
  model?: FalaiModel | null;
  /**
   * Whether to ask for the "flattering photograph" finish. Defaults to true
   * (what customers get today). 10.10.2026: the owner's first side-by-side
   * test showed the default model using that request as licence to redraw
   * the person — smoother, lighter skin, a fuller face, larger earrings, a
   * tighter crop — while the photo was meant to stay untouched. `false`
   * swaps the finish for a strict "change the hair and nothing else"
   * instruction, so the two can be compared in the Studio.
   */
  polish?: boolean;
  /**
   * The source photo's size in pixels, when known. Only Seedream uses it:
   * that model makes a square picture unless told the size, so it is asked
   * for the same shape as the photo it was given.
   */
  imageSize?: { width: number; height: number } | null;
  /**
   * 13.10.2026, Studio test only (owner): replace the room behind the person
   * with a plain, soft light-grey backdrop, so a messy room is hidden and the
   * hair's outline is easy to judge. 20.10.2026: switched on for every
   * customer picture (/api/generate), owner's decision.
   */
  greyBackground?: boolean;
  /**
   * 13.10.2026 (Studio test; for customers from 20.10.2026): light the face evenly from both
   * sides, for selfies taken in poor light, with the skin tone kept exactly
   * as it is (the models tend to make skin fairer when asked to relight).
   */
  evenLight?: boolean;
}

/** The backdrop line, when asked for (see GenerateHairstyleParams.greyBackground). */
function backgroundLine(params: GenerateHairstyleParams): string {
  return params.greyBackground
    ? "Replace the background behind them with a plain, soft light-grey studio backdrop, smooth and evenly lit, with nothing else in it. " +
        "Keep the outline of their hair, ears and shoulders natural against it. "
    : "";
}

/** The lighting line, when asked for (see GenerateHairstyleParams.evenLight). */
function lightLine(params: GenerateHairstyleParams): string {
  return params.evenLight
    ? "Light their face softly and evenly from the front, so that neither side of the face is in shadow and nothing is too dark or too bright. " +
        "Keep their skin tone exactly as it is in the photo: do not make their skin lighter, fairer, smoother or more even in colour. "
    : "";
}

export interface GenerateHairstyleResult {
  status: "SUCCEEDED" | "FAILED";
  resultImageUrl: string | null; // on FAL's storage — copy it, don't show it to customers
  contentType: string | null;
  costPaise: number;
  providerRequestId: string;
  model: string;
  errorMessage?: string;
  /** 20.10.2026: fal.ai's HTTP status when it refused the request (401/403 = account locked or out of credit). */
  providerStatus?: number;
  mock: boolean;
}

/** fal.ai's HTTP status on a failed request, if it gave one. */
function falStatus(err: unknown): number | undefined {
  const s = (err as { status?: unknown })?.status;
  return typeof s === "number" ? s : undefined;
}

// What each catalogue style actually looks like, in barber's terms — the
// name alone ("Classic Crop — Mid Fade") is too terse for an image model.
// A style that isn't listed here falls back to its name.
// 11.10.2026: these describe the FRONT view only — no back, nape or
// neckline — because asking for those turned the customer's head to the
// side (see FRONT_VIEW in lib/content/hairstyles.ts).
const STYLE_DESCRIPTIONS: Record<string, string> = {
  "Textured Quiff — Low Taper":
    "a short textured quiff: hair on top about 5–7 cm, lifted up and slightly back at the front with visible, piecey texture, and a low taper fade on the sides",
  "Classic Crop — Mid Fade":
    "a short classic crop: neat, even hair on top about 3–4 cm with a short straight fringe sitting high on the forehead, and a clean mid fade on the sides",
  "Curl Definition Crop":
    "a short cropped cut that shows off defined natural curls on top, about 4–6 cm, with tidy tapered sides",
};

export function describeStyle(styleName: string): string {
  return STYLE_DESCRIPTIONS[styleName] ?? styleName;
}

// 09.10.2026, after the first real previews: one of two came back with a
// beard the customer doesn't have. The first version of this prompt said
// "keep … any beard or moustache", and naming a beard is enough to make
// these models paint one. The facial-hair line is now a plain statement of
// fact taken from the face analysis.
//
// 11.10.2026: the same mistake in a new form. A man with a goatee (hair on the chin
// and upper lip, bare cheeks) came back from the Studio with a full beard
// in some pictures. The face service only says "beard: yes", and the line
// then read "Keep their beard and moustache exactly as they are now" — the
// same trap as before: the word "beard" with nothing said about where it
// stops. The lines below no longer name what the person has. They point at
// the photo, and say outright that bare skin stays bare.
function facialHairLine(facialHair: GenerateHairstyleParams["facialHair"]): string {
  switch (facialHair) {
    case "clean":
      return "They are clean-shaven: keep the face clean-shaven, with no beard, moustache or stubble added.";
    case "stubble":
      // 12.10.2026: a man with a few days' stubble came back with a full,
      // dark beard in his paid preview (and so in all four views).
      return (
        "They have only short stubble, a few days' growth with the skin showing through it. " +
        "Keep exactly that: the same short, light stubble, no longer, no darker and no thicker, with the skin still showing through. " +
        "Do not turn it into a beard."
      );
    case "beard":
      return (
        "Leave their facial hair exactly as it is in the photo: the same shape, the same edges, the same length and the same colour, grey included. " +
        "It must not come out longer, darker or fuller than in the photo. " +
        "Skin that is bare or only stubbled in the photo, on the cheeks, jaw or neck, stays that way: do not grow, thicken, extend or join up the facial hair."
      );
    case "moustache":
      return (
        "Leave their moustache exactly as it is in the photo, and keep the rest of the face as bare as it is in the photo: " +
        "do not add a beard or stubble."
      );
    default:
      return "Leave any facial hair exactly as it is in the photo: do not add, remove, grow, thicken or reshape it.";
  }
}

// 14.10.2026: the owner (7–10 cm on top) got carousel pictures with
// noticeably more hair than he has, on cuts marked "ready now". The style
// descriptions give a length (say 8–10 cm) and the model drew that much,
// with nothing telling it how much hair there is to cut from. A haircut can
// only take hair away, so the customer's present length is now given as
// the limit.
export function lengthLimitLine(params: GenerateHairstyleParams): string {
  if (!params.lengthNow) return "";
  return (
    `${params.lengthNow} This is a haircut made from the hair they have today, so it can only take length away: ` +
    "the finished hair must not be longer or thicker anywhere than their own hair in the photo. " +
    "Where the style describes more length than they have, keep the length they have and shape it into the style. Never add hair. "
  );
}

/**
 * The instruction for the two editing models: change the hair, keep the
 * person. Also asks for a flattering, well-lit, sharp result (requested
 * 09.10.2026) — but explicitly NOT by altering features, face shape or
 * skin tone: the site promises a realistic preview, not a retouched one.
 */
export function buildEditPrompt(params: GenerateHairstyleParams): string {
  const shape = params.faceShape ? ` It should suit their ${params.faceShape.toLowerCase()} face shape.` : "";
  return (
    `Change only this person's hairstyle to ${params.styleDescription?.trim() || describeStyle(params.styleName)}.${shape} ` +
    // 11.10.2026: on a man with thick, curly grey hair the standard model
    // kept his face perfectly but barely cut the hair: a "classic side
    // part" came back as a light trim. Telling it outright to cut made a
    // real side part on the same man. The first attempt at that wording
    // also asked for "both ears fully visible", and the model turned his
    // head to show one; so the cut is asked for by length only, and the
    // pose is pinned in the same breath. The owner's Studio test of that
    // second wording (typed into the description box for one style) gave
    // the same man, facing the camera, with a real side part. The two
    // lines below say the same thing for every style; they still need one
    // check with the ordinary style buttons.
    "Cut the hair to the lengths described, clearly shorter than in the photo wherever the style is shorter than " +
    "their hair is now, so the new haircut is plain to see. " +
    lengthLimitLine(params) +
    "They keep facing the camera exactly as in the photo: do not turn or tilt their head. " +
    `${facialHairLine(params.facialHair)} ` +
    "Keep everything else the same as in the photo: the same person, face, facial features, face shape, skin tone, " +
    `expression, head position, camera angle, clothing${params.greyBackground ? "" : " and background"}. ` +
    backgroundLine(params) +
    lightLine(params) +
    // 11.10.2026: a grey-haired man in his fifties came back from Flux
    // with dark hair and a younger man's face. Age and grey hair are now
    // named outright, for every model.
    "Keep them the same age, with the same lines and skin texture: do not make them look younger. " +
    "Keep their natural hair colour, including any grey or white hair. " +
    // 11.10.2026: a man whose hairline has receded at the temples came
    // back with a full, dark hairline in a side part and a textured crop.
    // No haircut does that, so a preview that shows it promises something
    // the barber cannot deliver. Not yet checked against the model when
    // written: the owner's next Studio pictures of that man are the test.
    "Keep their hairline where it is, and their hair as thick or as thin as it is in the photo: " +
    "do not fill in a receding hairline or thinning areas. " +
    // 10.10.2026: in the owner's test a curly-haired man came back with
    // straight hair from two of the three models. A haircut changes length
    // and shape, not texture, so a preview that straightens curls shows
    // something a barber cannot deliver.
    "Work with their natural hair texture: do not straighten curly or wavy hair and do not curl straight hair, " +
    "unless the hairstyle itself is described as curly, wavy or straight. " +
    (params.polish === false
      ? `Do not retouch, ${params.evenLight ? "" : "relight, "}smooth, slim, lighten or reframe anything: the face, skin texture, skin tone, ` +
        `jewellery, clothing, ${params.greyBackground ? "" : "background, "}framing and image size must stay exactly as they are in the photo. ` +
        "The new hair should look freshly and neatly cut, with natural hair texture and a realistic hairline. "
      : // 10.10.2026: in the side-by-side sheets both models made the
        // person a little fairer when asked for a flattering photo, so
        // the request now says outright that skin tone is not part of it.
        "Make it a flattering, high-quality photograph: soft, even, natural light on the face, crisp focus and clean detail, " +
        "with the hair on their head looking neatly styled and freshly finished by a professional barber, natural hair texture and a " +
        "realistic hairline. Do not make their skin lighter or change the shape of their face. ") +
    "Do not add text, logos, watermarks, borders or other people."
  );
}

/**
 * The instruction for Flux Kontext (11.10.2026).
 *
 * Flux was given the same long instruction as Nano Banana until the owner
 * made eight styles for a grey-haired, curly-haired man in his fifties: all
 * eight came back with dark, straight hair, and five of them with another,
 * younger man's face. Two things in that instruction work against Flux.
 * It is long, and Kontext follows short, direct edits best. And it asks for
 * "a flattering, high-quality photograph" with new light on the face, which
 * invites the model to paint the whole picture again; the day before, the
 * same model kept a man's face when that request was left out.
 *
 * So Flux gets its own instruction: short, the haircut first, then a plain
 * list of what must stay, and never the "flattering photograph" request
 * (the Studio's Polish box does nothing for this model).
 */
export function buildKontextPrompt(params: GenerateHairstyleParams): string {
  return (
    `Give this person a new haircut: ${params.styleDescription?.trim() || describeStyle(params.styleName)}. ` +
    "Change only the hair on their head. " +
    lengthLimitLine(params) +
    "Keep the exact same person: the same face, facial features, age, wrinkles and skin texture, skin tone, eye colour and expression. " +
    "Keep their natural hair colour, including any grey or white hair, and their natural hair texture: curly hair stays curly. " +
    `${facialHairLine(params.facialHair)} ` +
    backgroundLine(params) +
    lightLine(params) +
    `Keep the clothing, ${params.greyBackground ? "" : "background, "}${params.evenLight ? "" : "lighting, "}camera angle and framing exactly as they are.`
  );
}

/** The description for PuLID, which paints a new portrait from the reference face. */
export function buildIdentityPrompt(params: GenerateHairstyleParams): string {
  return (
    `Photorealistic head-and-shoulders portrait photograph of this person with ${params.styleDescription?.trim() || describeStyle(params.styleName)}, ` +
    "facing the camera, natural expression, their natural hair colour, soft even daylight, plain neutral background, " +
    "sharp focus, realistic skin and hair texture, shot on a 50mm lens."
  );
}

function buildInput(model: FalaiModel, params: GenerateHairstyleParams): Record<string, unknown> {
  switch (FALAI_MODELS[model]) {
    case "edit-multi":
      return { prompt: buildEditPrompt(params), image_urls: [params.sourceImageUrl], num_images: 1, output_format: "jpeg" };
    case "edit-seedream": {
      const size = params.imageSize;
      const sized = size && size.width > 0 && size.height > 0 ? { image_size: { width: size.width, height: size.height } } : {};
      return { prompt: buildEditPrompt(params), image_urls: [params.sourceImageUrl], num_images: 1, ...sized };
    }
    case "edit-single":
      return { prompt: buildKontextPrompt(params), image_url: params.sourceImageUrl, num_images: 1, output_format: "jpeg" };
    case "identity":
      return {
        prompt: buildIdentityPrompt(params),
        reference_image_url: params.sourceImageUrl,
        image_size: "portrait_4_3",
        negative_prompt: "cartoon, illustration, painting, deformed, extra people, text, watermark",
      };
  }
}

function mockPlaceholderImage(seed: string): string {
  // A stable, deterministic placeholder image per (style, source) pair so
  // repeated calls in dev/tests are reproducible.
  const encoded = encodeURIComponent(seed).slice(0, 64);
  return `https://placehold.co/768x1024/png?text=${encoded}`;
}

function failure(model: string, message: string, requestId = "", providerStatus?: number): GenerateHairstyleResult {
  return {
    status: "FAILED",
    resultImageUrl: null,
    contentType: null,
    costPaise: 0,
    providerRequestId: requestId,
    model,
    errorMessage: message,
    providerStatus,
    mock: false,
  };
}

/** Friendly wording for a FAL failure; the real reason goes to the server log. */
function describeFalError(err: unknown): string {
  const status = (err as { status?: number })?.status;
  const body = (err as { body?: unknown })?.body;
  console.error("[Tressform] FAL generation failed:", status ?? "", (err as Error)?.message ?? "", JSON.stringify(body ?? "").slice(0, 600));
  if (status === 422) {
    // Input the model wouldn't accept — most often its content filter.
    return "We couldn't create a hairstyle from that photo — please try a different, clearer photo.";
  }
  if (status === 429) return "We're a little busy right now — please try again in a moment.";
  return "Hairstyle generation isn't available right now — please try again shortly.";
}

export async function generateHairstyle(params: GenerateHairstyleParams): Promise<GenerateHairstyleResult> {
  if (FALAI_MOCK_MODE) {
    // Simulate provider latency without slowing down test suites too much.
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      status: "SUCCEEDED",
      resultImageUrl: mockPlaceholderImage(`${params.styleName} (${params.faceShape ?? "unknown"})`),
      contentType: "image/png",
      costPaise: FALAI_COST_PER_IMAGE_PAISE,
      providerRequestId: `mock_falai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      model: "mock",
      mock: true,
    };
  }

  const model = params.model && params.model in FALAI_MODELS ? params.model : modelForGender(params.gender);
  const { createFalClient } = await import("@fal-ai/client");
  const fal = createFalClient({ credentials: FAL_AI_API_KEY });

  let response: { data: unknown; requestId: string };
  try {
    // `as string`: the client's types only know FAL's own endpoint list at
    // the version it was published with; the input is built above.
    response = (await fal.subscribe(model as string, { input: buildInput(model, params), logs: false })) as {
      data: unknown;
      requestId: string;
    };
  } catch (err) {
    return failure(model, describeFalError(err), "", falStatus(err));
  }

  const data = (response.data ?? {}) as {
    images?: { url?: string; content_type?: string }[];
    has_nsfw_concepts?: boolean[];
  };
  if (data.has_nsfw_concepts?.some(Boolean)) {
    return failure(model, "We couldn't create a hairstyle from that photo — please try a different one.", response.requestId);
  }
  const image = data.images?.[0];
  if (!image?.url) {
    console.error("[Tressform] FAL returned no image:", JSON.stringify(response.data ?? "").slice(0, 600));
    return failure(model, "Hairstyle generation didn't return an image — please try again.", response.requestId);
  }

  return {
    status: "SUCCEEDED",
    resultImageUrl: image.url,
    contentType: image.content_type ?? null,
    costPaise: FALAI_COST_BY_MODEL_PAISE[model] ?? FALAI_COST_PER_IMAGE_PAISE,
    providerRequestId: response.requestId,
    model,
    mock: false,
  };
}

// ---------------------------------------------------------------------------
// SIDE AND BACK VIEWS. 12.10.2026, owner's plan: a paid preview shows the
// style from four sides. Only the front selfie exists, so the left, right
// and back pictures are made FROM THE FRONT PREVIEW (which already has the
// new haircut): the model is shown that picture and asked for the same
// person and haircut from another angle. They are estimates, and are
// labelled so to customers. First tried in the owner's Studio before any
// customer sees them.

export type HairView = "left" | "right" | "back";
export const HAIR_VIEWS: HairView[] = ["left", "right", "back"];

// "Their left side" means the camera stands at the person's left, so their
// nose points to the left edge of the picture; said both ways, because a
// model told only one of them may turn the head the wrong way.
const VIEW_ANGLE: Record<HairView, string> = {
  left:
    "from their left side: a true side profile, the head turned a full 90 degrees, so the camera sees their left ear " +
    "and the whole left side of the haircut, and their face points to the left edge of the picture",
  right:
    "from their right side: a true side profile, the head turned a full 90 degrees, so the camera sees their right ear " +
    "and the whole right side of the haircut, and their face points to the right edge of the picture",
  back:
    "from directly behind: the back of the head, the crown, the nape and the neckline fill the picture, " +
    "showing how the back of the haircut is cut and blended; their face is not visible",
};

export function buildViewPrompt(view: HairView, styleDescription: string): string {
  return (
    "The picture shows a person with a freshly cut hairstyle. Make a new, realistic photograph of the same person " +
    `with exactly the same haircut, seen ${VIEW_ANGLE[view]}. ` +
    `The haircut is ${styleDescription.trim()}. ` +
    "Keep the haircut identical to the picture: the same hair colour, including any grey, the same length on top, " +
    "the same texture, parting, fade or taper and the same volume. " +
    // 12.10.2026: the owner's first back view showed a pale, thin-looking
    // patch at the crown that the front picture gives no reason for.
    "The hair at the crown and the back is as thick and full as on the rest of the head, unless the picture clearly shows thinning. " +
    "Keep the same person: the same age, skin tone, build, ears, facial hair and clothing. " +
    "Head and shoulders in the frame, the same plain background and soft even light as the picture, sharp focus on the hair. " +
    "Do not add text, logos, watermarks, borders or other people."
  );
}

export interface GenerateViewParams {
  /** A link FAL can open to the FRONT preview (the picture with the new haircut). */
  frontImageUrl: string;
  view: HairView;
  /** The full style description, including the back and the neckline. */
  styleDescription: string;
  model?: FalaiModel | null;
}

export async function generateView(params: GenerateViewParams): Promise<GenerateHairstyleResult> {
  if (FALAI_MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      status: "SUCCEEDED",
      resultImageUrl: mockPlaceholderImage(`${params.view} view`),
      contentType: "image/png",
      costPaise: FALAI_COST_PER_IMAGE_PAISE,
      providerRequestId: `mock_view_${Date.now()}`,
      model: "mock",
      mock: true,
    };
  }
  // Views only use the editing models that take an image list; others fall back to the default.
  const model: FalaiModel =
    params.model && FALAI_MODELS[params.model] === "edit-multi" ? params.model : "fal-ai/nano-banana/edit";
  const { createFalClient } = await import("@fal-ai/client");
  const fal = createFalClient({ credentials: FAL_AI_API_KEY });
  let response: { data: unknown; requestId: string };
  try {
    response = (await fal.subscribe(model as string, {
      input: {
        prompt: buildViewPrompt(params.view, params.styleDescription),
        image_urls: [params.frontImageUrl],
        num_images: 1,
        output_format: "jpeg",
      },
      logs: false,
    })) as { data: unknown; requestId: string };
  } catch (err) {
    return failure(model, describeFalError(err), "", falStatus(err));
  }
  const data = (response.data ?? {}) as { images?: { url?: string; content_type?: string }[]; has_nsfw_concepts?: boolean[] };
  if (data.has_nsfw_concepts?.some(Boolean)) return failure(model, "The model refused this picture.", response.requestId);
  const image = data.images?.[0];
  if (!image?.url) return failure(model, "No picture came back — please try again.", response.requestId);
  return {
    status: "SUCCEEDED",
    resultImageUrl: image.url,
    contentType: image.content_type ?? null,
    costPaise: FALAI_COST_BY_MODEL_PAISE[model] ?? FALAI_COST_PER_IMAGE_PAISE,
    providerRequestId: response.requestId,
    model,
    mock: false,
  };
}

// ---------------------------------------------------------------------------
// 26.10.2026: "Hairstyles of the World" (/hairstyles). The owner's Studio
// makes one plain "before" photo of an invented model per region and gender
// from a description alone (lib/content/worldHairstyles.ts, modelPrompt);
// each style's picture is then made from that photo with generateHairstyle,
// exactly as a customer's would be. Nano Banana's text-to-picture model,
// the same price as its editor.
export const PORTRAIT_MODEL = "fal-ai/nano-banana";

export async function generatePortrait(prompt: string): Promise<GenerateHairstyleResult> {
  if (FALAI_MOCK_MODE) {
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      status: "SUCCEEDED",
      resultImageUrl: mockPlaceholderImage("model photo"),
      contentType: "image/png",
      costPaise: FALAI_COST_PER_IMAGE_PAISE,
      providerRequestId: `mock_portrait_${Date.now()}`,
      model: "mock",
      mock: true,
    };
  }
  const { createFalClient } = await import("@fal-ai/client");
  const fal = createFalClient({ credentials: FAL_AI_API_KEY });
  let response: { data: unknown; requestId: string };
  try {
    response = (await fal.subscribe(PORTRAIT_MODEL, {
      input: { prompt, num_images: 1, output_format: "jpeg", aspect_ratio: "4:5" },
      logs: false,
    })) as { data: unknown; requestId: string };
  } catch (err) {
    return failure(PORTRAIT_MODEL as FalaiModel, describeFalError(err), "", falStatus(err));
  }
  const data = (response.data ?? {}) as { images?: { url?: string; content_type?: string }[] };
  const image = data.images?.[0];
  if (!image?.url) return failure(PORTRAIT_MODEL as FalaiModel, "No picture came back — please try again.", response.requestId);
  return {
    status: "SUCCEEDED",
    resultImageUrl: image.url,
    contentType: image.content_type ?? null,
    costPaise: FALAI_COST_PER_IMAGE_PAISE,
    providerRequestId: response.requestId,
    model: PORTRAIT_MODEL,
    mock: false,
  };
}
