// Is the selfie framed so the shoulders can show? (13.10.2026)
//
// The owner found previews cut off at the chin when the face filled the
// photo. /api/analyze uses this to ask for a step back before anything is
// spent. The face box comes from the face service, as fractions of the
// photo's width and height.

/**
 * True when the face fills too much of the photo for the shoulders to show:
 * taller than 55% of the picture, or with less than half a face-height of
 * room below the chin. Lenient on purpose; the camera's shoulder guide does
 * the real work.
 */
export function tooClose(box: { height: number; top: number }): boolean {
  if (!(box.height > 0)) return false;
  return box.height > 0.55 || box.top + box.height * 1.5 > 1.02;
}
