// Tressform — "Remove background" for the selfie (17.10.2026, owner: so the
// customer doesn't have to find a plain wall).
//
// The selfie goes to fal.ai's BiRefNet v2 model ("Portrait" setting, made for
// people and hair edges), which returns the person on a see-through
// background. The browser then puts them on a plain light grey
// (UploadFlow.tsx), the backdrop the hairstyle pictures work best with.
//
// fal.ai bills BiRefNet by the GPU time it takes (about a second a photo),
// a small fraction of one hairstyle picture. It uses the same FAL_AI_API_KEY.

const FAL_AI_API_KEY = process.env.FAL_AI_API_KEY;

export const BACKGROUND_OFF = !FAL_AI_API_KEY;
const MODEL = "fal-ai/birefnet/v2";

/** The person from a photo (data: URL) on a see-through background, as PNG bytes. */
export async function removeBackground(photoDataUrl: string): Promise<Buffer> {
  if (BACKGROUND_OFF) throw new Error("FAL_AI_API_KEY is not set.");
  const { createFalClient } = await import("@fal-ai/client");
  const fal = createFalClient({ credentials: FAL_AI_API_KEY });
  const response = (await fal.subscribe(MODEL as string, {
    input: {
      image_url: photoDataUrl,
      model: "Portrait",
      operating_resolution: "1024x1024",
      output_format: "png",
      refine_foreground: true,
    },
    logs: false,
  })) as { data?: { image?: { url?: string } } };
  const url = response.data?.image?.url;
  if (!url) throw new Error(`fal returned no image: ${JSON.stringify(response.data ?? "").slice(0, 300)}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not fetch the result (${res.status}).`);
  return Buffer.from(await res.arrayBuffer());
}
