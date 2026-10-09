// Tressform — read a photo's pixel dimensions straight from its bytes
// (09.10.2026, added with the real face-analysis work).
//
// Rekognition reports every landmark as a fraction of the photo's width and
// height. To compare a width with a height (lib/faceShape.ts does exactly
// that) those fractions have to be turned back into pixels, which needs the
// photo's real size. Photos reach the server as JPEG (the browser re-encodes
// every upload — see components/UploadFlow.tsx), PNG is handled too in case
// that ever changes. No image library needed: both formats state their size
// in the file header.

import type { ImageSize } from "./faceShape";

function readPng(bytes: Uint8Array): ImageSize | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24 || signature.some((b, i) => bytes[i] !== b)) return null;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readJpeg(bytes: Uint8Array): ImageSize | null {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < bytes.length) {
    if (bytes[i] !== 0xff) {
      i += 1;
      continue;
    }
    const marker = bytes[i + 1];
    // Padding / standalone markers carry no length.
    if (marker === 0xff) {
      i += 1;
      continue;
    }
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      i += 2;
      continue;
    }
    const length = (bytes[i + 2] << 8) | bytes[i + 3];
    // SOF0–SOF15 hold the frame size — except C4 (Huffman tables), C8 and CC.
    const isFrame = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isFrame) {
      const height = (bytes[i + 5] << 8) | bytes[i + 6];
      const width = (bytes[i + 7] << 8) | bytes[i + 8];
      return width > 0 && height > 0 ? { width, height } : null;
    }
    if (length < 2) return null;
    i += 2 + length;
  }
  return null;
}

/** Pixel size of a JPEG or PNG, or null if the bytes are neither. */
export function readImageSize(bytes: Uint8Array): ImageSize | null {
  return readPng(bytes) ?? readJpeg(bytes);
}
