// Save / Load / Export for the Token Designer.
//  • Save  → the editable project as pretty JSON (`<name>.token.json`) — same Blob+anchor download
//            the Token Art Forge uses (tokenArtEditor/main.ts downloadFile).
//  • Load  → read a project JSON back and coerce it (types.ts coerceDesign).
//  • Export→ rasterise the live SVG to a PNG at the native 256×222 token size. The technique
//            mirrors the hero-board creator's useSnapshot: clone the SVG, embed the background as a
//            data: URL (so the standalone SVG is self-contained), serialise → <img> → <canvas> →
//            toBlob('image/png'). Fonts are system stacks (see types.ts) so the export matches the
//            on-screen preview.
import type { TokenDesign } from './types';
import { CANVAS_W, CANVAS_H, coerceDesign } from './types';

const SVGNS = 'http://www.w3.org/2000/svg';

function download(blob: Blob, filename: string): void {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/** Sanitise a design name into a safe file base. */
export function fileBase(name: string): string {
  const base = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'token';
}

export function saveProject(design: TokenDesign): void {
  const blob = new Blob([`${JSON.stringify(design, null, 2)}\n`], { type: 'application/json' });
  download(blob, `${fileBase(design.name)}.token.json`);
}

/** Open a file picker and resolve the parsed+coerced design (rejects on cancel/parse error). */
export function loadProject(): Promise<TokenDesign> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) return reject(new Error('no file chosen'));
      const reader = new FileReader();
      reader.onload = () => {
        try {
          resolve(coerceDesign(JSON.parse(String(reader.result))));
        } catch (err) {
          reject(err instanceof Error ? err : new Error(String(err)));
        }
      };
      reader.onerror = () => reject(new Error('could not read file'));
      reader.readAsText(f);
    });
    input.click();
  });
}

/** Read an uploaded image file as a data: URL (for a custom background). */
export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('could not read image'));
    reader.readAsDataURL(file);
  });
}

/** Draw a same-origin image URL to a canvas and return a self-contained PNG data URL. */
async function toDataUrl(src: string): Promise<string> {
  if (src.startsWith('data:')) return src;
  const img = await loadImage(src);
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || CANVAS_W;
  canvas.height = img.naturalHeight || CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(img, 0, 0);
  return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`image failed: ${src}`));
    img.src = src;
  });
}

/**
 * Rasterise the design to a PNG and download it. `liveSvg` is the on-screen stage (shown enlarged
 * for editing); we clone it, strip editor chrome (handles / selection outline), inline the
 * background as a data URL, then produce a PNG at the token's NATIVE 256×222 size so it is a drop-in
 * for the shipped foe tokens. `supersample` rasterises the vector SVG larger and downscales for
 * crisp text — the output file is always 256×222 regardless of it.
 */
export async function exportPng(
  design: TokenDesign,
  liveSvg: SVGSVGElement,
  supersample = 2,
): Promise<void> {
  const clone = liveSvg.cloneNode(true) as SVGSVGElement;
  // Drop selection chrome so the export is clean.
  clone.querySelectorAll('.td-handle, .td-bbox, .td-stem').forEach((n) => n.remove());
  clone.querySelectorAll('.td-field.is-selected').forEach((n) => n.classList.remove('is-selected'));

  // Make the background self-contained (relative/library URLs won't resolve inside a detached SVG).
  const bg = clone.querySelector('.td-bg');
  if (bg && design.background) {
    const dataUrl = await toDataUrl(design.background.src);
    bg.setAttribute('href', dataUrl);
    bg.setAttributeNS('http://www.w3.org/1999/xlink', 'href', dataUrl);
  }

  // Rasterise the (resolution-independent) SVG at a supersampled size; the viewBox still matches the
  // token so this only sharpens text/edges. We then downscale to the design's native size below.
  const outW = design.canvas.width;
  const outH = design.canvas.height;
  const ss = Math.max(1, supersample);
  clone.setAttribute('xmlns', SVGNS);
  clone.setAttribute('width', String(outW * ss));
  clone.setAttribute('height', String(outH * ss));

  const svgText = new XMLSerializer().serializeToString(clone);
  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgText)}`;
  const rendered = await loadImage(svgUrl);

  const canvas = document.createElement('canvas');
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(rendered, 0, 0, outW, outH);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('PNG encode failed');
  download(blob, `${fileBase(design.name)}.png`);
}
