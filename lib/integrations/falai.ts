// Tressform — FAL AI integration (hairstyle image generation).
// Recommended model per spec Part H: PuLID Flux (≈₹3.50/image at ₹100/USD).
//
// MOCK MODE: when FAL_AI_API_KEY is absent, generateHairstyle() "succeeds"
// after a short simulated delay and returns a placeholder image URL, so the
// full generate → poll → display flow can be built and tested without a
// real FAL account.

const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;

export const FALAI_MOCK_MODE = !FAL_AI_API_KEY;

export const FALAI_MODEL = "fal-ai/pulid-flux" as const;
export const FALAI_COST_PER_IMAGE_PAISE = 350; // ≈₹3.50/image, see Part H

export interface GenerateHairstyleParams {
  sourceImageUrl: string; // signed URL to the user's uploaded photo
  styleName: string; // e.g. "Textured Crop", "Long Layers"
  faceShape?: string | null;
  addonKind?: "BACKGROUND" | "OUTFIT" | null;
}

export interface GenerateHairstyleResult {
  status: "SUCCEEDED" | "FAILED";
  resultImageUrl: string | null;
  costPaise: number;
  providerRequestId: string;
  errorMessage?: string;
  mock: boolean;
}

function mockPlaceholderImage(seed: string): string {
  // A stable, deterministic placeholder image per (style, source) pair so
  // repeated calls in dev/tests are reproducible.
  const encoded = encodeURIComponent(seed).slice(0, 64);
  return `https://placehold.co/768x1024/png?text=${encoded}`;
}

export async function generateHairstyle(params: GenerateHairstyleParams): Promise<GenerateHairstyleResult> {
  if (FALAI_MOCK_MODE) {
    // Simulate provider latency without slowing down test suites too much.
    await new Promise((resolve) => setTimeout(resolve, 50));
    return {
      status: "SUCCEEDED",
      resultImageUrl: mockPlaceholderImage(`${params.styleName} (${params.faceShape ?? "unknown"})`),
      costPaise: FALAI_COST_PER_IMAGE_PAISE,
      providerRequestId: `mock_falai_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      mock: true,
    };
  }

  // Real implementation (uncomment once @fal-ai/client is added and
  // FAL_AI_API_KEY is set):
  //
  // const { fal } = await import("@fal-ai/client");
  // fal.config({ credentials: FAL_AI_API_KEY });
  // const result = await fal.subscribe(FALAI_MODEL, {
  //   input: { image_url: params.sourceImageUrl, prompt: params.styleName },
  // });
  // return {
  //   status: "SUCCEEDED",
  //   resultImageUrl: result.data.images?.[0]?.url ?? null,
  //   costPaise: FALAI_COST_PER_IMAGE_PAISE,
  //   providerRequestId: result.requestId,
  //   mock: false,
  // };

  throw new Error(
    "FALAI_MOCK_MODE is false but the real FAL AI call is not wired up yet — " +
      "install @fal-ai/client and implement generateHairstyle()."
  );
}
