// imageUtils — the deck-builder image upload pipeline. Contain-fits an uploaded image to the card
// aspect, then encodes it as a quality-stepped WebP (JPEG fallback) small enough to embed as a data
// URL in the scenario JSON (library.resources.images). Browser-only (canvas); the Creator runs in a
// browser. No engine dependency.

export interface EncodeOpts {
  maxW: number;
  maxH: number;
  /** max length (≈ bytes) of the produced data URL — the stored size */
  capBytes: number;
}

/** contain-fit dimensions: scale down to fit maxW×maxH, never up. Pure. */
export function containFit(
  w: number,
  h: number,
  maxW: number,
  maxH: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(1, Math.round(w * scale)), height: Math.max(1, Math.round(h * scale)) };
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('failed to load image'));
    };
    img.src = url;
  });
}

/** Resize an uploaded image to the card aspect and encode it as a compact data URL. Tries WebP at
 * descending quality (0.85 → 0.5), then JPEG, returning the first result within `capBytes`; if none
 * fit, returns the smallest attempt (lowest-quality JPEG). */
export async function resizeAndEncode(file: File, opts: EncodeOpts): Promise<string> {
  const { maxW, maxH, capBytes } = opts;
  const img = await loadImage(file);
  const { width, height } = containFit(img.naturalWidth || img.width, img.naturalHeight || img.height, maxW, maxH);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0, width, height);

  let smallest: string | null = null;
  for (const type of ['image/webp', 'image/jpeg'] as const) {
    for (let q = 0.85; q >= 0.5 - 1e-9; q -= 0.1) {
      const url = canvas.toDataURL(type, q);
      // toDataURL silently falls back to PNG when a type is unsupported — skip those.
      if (!url.startsWith(`data:${type}`)) break;
      if (smallest === null || url.length < smallest.length) smallest = url;
      if (url.length <= capBytes) return url;
    }
  }
  return smallest ?? canvas.toDataURL('image/jpeg', 0.5);
}
