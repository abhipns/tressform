// Shrink a photo in the browser and re-encode it as JPEG (longest side
// 1600px). Phone photos are routinely 5–10MB — slow to upload and over the
// hosting platform's request-size limit.
//
// 10.10.2026: this is the same routine the customer upload step has always
// used (it lives inside components/UploadFlow.tsx there); it was copied
// here so the owner's Studio page can use it without touching that file.

const MAX_SIDE_PX = 1600;
const JPEG_QUALITY = 0.85;

export async function shrinkPhoto(file: File): Promise<{ dataUrl: string; blob: Blob }> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("unreadable"));
      el.src = objectUrl;
    });
    const scale = Math.min(1, MAX_SIDE_PX / Math.max(img.naturalWidth, img.naturalHeight));
    const width = Math.max(1, Math.round(img.naturalWidth * scale));
    const height = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no-canvas");
    ctx.drawImage(img, 0, 0, width, height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", JPEG_QUALITY)
    );
    return { dataUrl: canvas.toDataURL("image/jpeg", JPEG_QUALITY), blob };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
