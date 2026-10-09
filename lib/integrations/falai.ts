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
  "fal-ai/flux-pro/kontext": "edit-single",
  "fal-ai/flux-pulid": "identity",
} as const;
export type FalaiModel = keyof typeof FALAI_MODELS;

const DEFAULT_MODEL: FalaiModel = "fal-ai/nano-banana/edit";

function resolveModel(): FalaiModel {
  const requested = process.env.FAL_AI_MODEL;
  if (!requested) return DEFAULT_MODEL;
  if (requested in FALAI_MODELS) return requested as FalaiModel;
  console.error(`[Tressform] FAL_AI_MODEL "${requested}" isn't one this code knows — using ${DEFAULT_MODEL}.`);
  return DEFAULT_MODEL;
}

export const FALAI_MODEL: FalaiModel = resolveModel();
export const FALAI_COST_PER_IMAGE_PAISE = 350; // ≈₹3.50/image, see Part H / Part I

export interface GenerateHairstyleParams {
  sourceImageUrl: string; // a link FAL can open: a signed storage URL, or a data: URL
  styleName: string; // e.g. "Textured Quiff — Low Taper"
  faceShape?: string | null;
  addonKind?: "BACKGROUND" | "OUTFIT" | null;
}

export interface GenerateHairstyleResult {
  status: "SUCCEEDED" | "FAILED";
  resultImageUrl: string | null; // on FAL's storage — copy it, don't show it to customers
  contentType: string | null;
  costPaise: number;
  providerRequestId: string;
  model: string;
  errorMessage?: string;
  mock: boolean;
}

// What each catalogue style actually looks like, in barber's terms — the
// name alone ("Classic Crop — Mid Fade") is too terse for an image model.
// A style that isn't listed here falls back to its name.
const STYLE_DESCRIPTIONS: Record<string, string> = {
  "Textured Quiff — Low Taper":
    "a short textured quiff: hair on top about 5–7 cm, lifted up and slightly back at the front with visible, piecey texture, and a low taper fade on the sides and at the nape",
  "Classic Crop — Mid Fade":
    "a short classic crop: neat, even hair on top about 3–4 cm with a short straight fringe sitting high on the forehead, and a clean mid fade on the sides and back",
  "Curl Definition Crop":
    "a short cropped cut that shows off defined natural curls on top, about 4–6 cm, with tidy tapered sides and a clean neckline",
};

export function describeStyle(styleName: string): string {
  return STYLE_DESCRIPTIONS[styleName] ?? styleName;
}

/** The instruction for the two editing models: change the hair, touch nothing else. */
export function buildEditPrompt(params: GenerateHairstyleParams): string {
  const shape = params.faceShape ? ` It should suit their ${params.faceShape.toLowerCase()} face shape.` : "";
  return (
    `Change only this person's hairstyle to ${describeStyle(params.styleName)}.${shape} ` +
    "Keep everything else exactly as it is in the photo: the same person, face, facial features, skin tone, " +
    "expression, any beard or moustache, head position, camera angle, clothing, background and lighting. " +
    "Keep their natural hair colour. The new haircut must look photorealistic — like a real photograph taken " +
    "just after a professional barber finished the cut, with natural hair texture and a realistic hairline. " +
    "Do not add text, logos, watermarks, borders or other people."
  );
}

/** The description for PuLID, which paints a new portrait from the reference face. */
export function buildIdentityPrompt(params: GenerateHairstyleParams): string {
  return (
    `Photorealistic head-and-shoulders portrait photograph of this person with ${describeStyle(params.styleName)}, ` +
    "facing the camera, natural expression, their natural hair colour, soft even daylight, plain neutral background, " +
    "sharp focus, realistic skin and hair texture, shot on a 50mm lens."
  );
}

function buildInput(model: FalaiModel, params: GenerateHairstyleParams): Record<string, unknown> {
  switch (FALAI_MODELS[model]) {
    case "edit-multi":
      return { prompt: buildEditPrompt(params), image_urls: [params.sourceImageUrl], num_images: 1, output_format: "jpeg" };
    case "edit-single":
      return { prompt: buildEditPrompt(params), image_url: params.sourceImageUrl, num_images: 1, output_format: "jpeg" };
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

function failure(model: string, message: string, requestId = ""): GenerateHairstyleResult {
  return {
    status: "FAILED",
    resultImageUrl: null,
    contentType: null,
    costPaise: 0,
    providerRequestId: requestId,
    model,
    errorMessage: message,
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
    return "We couldn't create a preview from that photo — please try a different, clearer photo.";
  }
  if (status === 429) return "We're a little busy right now — please try again in a moment.";
  return "Preview generation isn't available right now — please try again shortly.";
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

  const model = FALAI_MODEL;
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
    return failure(model, describeFalError(err));
  }

  const data = (response.data ?? {}) as {
    images?: { url?: string; content_type?: string }[];
    has_nsfw_concepts?: boolean[];
  };
  if (data.has_nsfw_concepts?.some(Boolean)) {
    return failure(model, "We couldn't create a preview from that photo — please try a different one.", response.requestId);
  }
  const image = data.images?.[0];
  if (!image?.url) {
    console.error("[Tressform] FAL returned no image:", JSON.stringify(response.data ?? "").slice(0, 600));
    return failure(model, "Preview generation didn't return an image — please try again.", response.requestId);
  }

  return {
    status: "SUCCEEDED",
    resultImageUrl: image.url,
    contentType: image.content_type ?? null,
    costPaise: FALAI_COST_PER_IMAGE_PAISE,
    providerRequestId: response.requestId,
    model,
    mock: false,
  };
}
