// 2D Token Designer — data model. A token "project" is a background image plus a set of freely
// placed text fields (name / strength / attack-type / foe-type, or custom), each movable,
// resizable and rotatable over the token canvas. The canvas matches the shipped foe-token size
// (256×222) so an exported PNG drops straight into example/public/tokens/foes/.

/**
 * Default canvas = the shipped foe-token pixel size (see example/public/tokens/foes/Foe-Token-*.png).
 * The size is editable per design (TokenDesign.canvas); these are just the defaults for a new token,
 * and MIN/MAX bound what the user can set.
 */
export const CANVAS_W = 256;
export const CANVAS_H = 222;
export const MIN_CANVAS = 16;
export const MAX_CANVAS = 2048;

/**
 * Curated font stacks. These are SYSTEM fonts on purpose: an SVG rasterized to PNG via an
 * <img> does NOT inherit the page's web fonts (Cinzel/Outfit), so the export would differ from
 * the on-screen preview. System stacks render identically in both paths.
 */
export const FONT_OPTIONS: { label: string; value: string }[] = [
  { label: 'Serif (Georgia)', value: "Georgia, 'Times New Roman', serif" },
  { label: 'Sans (Arial)', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Condensed (Impact)', value: "Impact, 'Arial Narrow Bold', sans-serif" },
  { label: 'Mono (Courier)', value: "'Courier New', monospace" },
];

export type Align = 'start' | 'middle' | 'end';

export interface TextField {
  id: string;
  text: string;
  /** Anchor point in token space (0..CANVAS_W / 0..CANVAS_H). `align` sets which edge it anchors. */
  x: number;
  y: number;
  fontSize: number;
  /** Degrees, clockwise. */
  rotation: number;
  color: string;
  align: Align;
  fontFamily: string;
  bold: boolean;
}

export interface Background {
  /** `library` → a same-origin URL under ./tokens/…; `custom` → an uploaded data: URL. */
  kind: 'library' | 'custom';
  src: string;
  /** Human label for the picker / status (filename or foe name). */
  label?: string;
  /**
   * How the source image fills the 256×222 canvas before scale/offset apply. `cover` crops to fill
   * (good for token icons); `contain` fits the whole image (good for tall portrait art). This is the
   * base; `scale`/`offset` then zoom & pan on top so any artwork can be framed to the token.
   */
  fit: 'cover' | 'contain';
  /** Zoom multiplier about the canvas centre (1 = the `fit` size). */
  scale: number;
  /** Pan from centre, in token-space px. */
  offsetX: number;
  offsetY: number;
}

/** A background with a neutral transform (fit=cover, no zoom/pan). */
export function makeBackground(kind: Background['kind'], src: string, label?: string): Background {
  return { kind, src, label, fit: 'cover', scale: 1, offsetX: 0, offsetY: 0 };
}

export interface TokenDesign {
  schemaVersion: 1;
  /** Filename base for saved project + exported PNG. */
  name: string;
  background: Background | null;
  fields: TextField[];
  canvas: { width: number; height: number };
}

let idCounter = 0;
/** Short unique id for a new field (stable within a session; not persisted-meaningful). */
export function newFieldId(): string {
  idCounter += 1;
  return `f${Date.now().toString(36)}${idCounter}`;
}

function field(partial: Partial<TextField> & Pick<TextField, 'text' | 'x' | 'y'>): TextField {
  return {
    id: newFieldId(),
    fontSize: 16,
    rotation: 0,
    color: '#f4ecdd',
    align: 'middle',
    fontFamily: FONT_OPTIONS[0].value,
    bold: true,
    ...partial,
  };
}

/**
 * Seed the four official foe-token labels, positioned/styled to match a hand-placed reference token
 * (256×222): name across the bottom centre, strength number left-of-centre, and attack-type +
 * foe-type set vertically (rotated 270°) up the left edge. These are starting points — the user
 * edits the text and can re-drag / resize / rotate each. Text values are placeholders.
 */
export function defaultFields(): TextField[] {
  const SERIF = FONT_OPTIONS[0].value; // Georgia
  const IMPACT = FONT_OPTIONS[2].value; // Impact
  return [
    field({ text: 'NAME', x: 131.27, y: 205.89, fontSize: 28.48, rotation: 0, align: 'middle', fontFamily: SERIF, bold: false }),
    field({ text: '2', x: 88.07, y: 174.25, fontSize: 30, rotation: 0, align: 'middle', fontFamily: IMPACT, bold: false }),
    field({ text: 'MELEE', x: 56.65, y: 186.93, fontSize: 23.88, rotation: 270, align: 'start', fontFamily: SERIF, bold: false }),
    field({ text: 'BEAST', x: 31.41, y: 186.98, fontSize: 23, rotation: 270, align: 'start', fontFamily: SERIF, bold: false }),
  ];
}

export function newDesign(): TokenDesign {
  return {
    schemaVersion: 1,
    name: 'foe-token',
    background: null,
    fields: defaultFields(),
    canvas: { width: CANVAS_W, height: CANVAS_H },
  };
}

/**
 * Coerce arbitrary parsed JSON into a valid TokenDesign, clamping numbers and dropping junk. Used
 * on Load so a hand-edited or older file can't crash the editor. Throws if it isn't an object with
 * a fields array.
 */
export function coerceDesign(raw: unknown): TokenDesign {
  if (!raw || typeof raw !== 'object') throw new Error('not a token design object');
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.fields)) throw new Error('missing fields[]');
  const num = (v: unknown, fallback: number, min: number, max: number): number => {
    const n = typeof v === 'number' && Number.isFinite(v) ? v : fallback;
    return Math.min(max, Math.max(min, n));
  };
  const str = (v: unknown, fallback: string): string => (typeof v === 'string' ? v : fallback);
  const align = (v: unknown): Align => (v === 'start' || v === 'end' ? v : 'middle');

  // Canvas size first — field/background clamps below are relative to it.
  const canvasIn = (o.canvas ?? {}) as Record<string, unknown>;
  const cw = num(canvasIn.width, CANVAS_W, MIN_CANVAS, MAX_CANVAS);
  const ch = num(canvasIn.height, CANVAS_H, MIN_CANVAS, MAX_CANVAS);

  const fields: TextField[] = (o.fields as unknown[]).map((f) => {
    const g = (f ?? {}) as Record<string, unknown>;
    return {
      id: str(g.id, newFieldId()),
      text: str(g.text, ''),
      x: num(g.x, cw / 2, -200, cw + 200),
      y: num(g.y, ch / 2, -200, ch + 200),
      fontSize: num(g.fontSize, 16, 4, 200),
      rotation: num(g.rotation, 0, -360, 360),
      color: str(g.color, '#f4ecdd'),
      align: align(g.align),
      fontFamily: str(g.fontFamily, FONT_OPTIONS[0].value),
      bold: g.bold !== false,
    };
  });

  let background: Background | null = null;
  const b = o.background as Record<string, unknown> | null | undefined;
  if (b && typeof b === 'object' && typeof b.src === 'string') {
    background = {
      kind: b.kind === 'custom' ? 'custom' : 'library',
      src: b.src,
      label: str(b.label, '') || undefined,
      fit: b.fit === 'contain' ? 'contain' : 'cover',
      scale: num(b.scale, 1, 0.1, 8),
      offsetX: num(b.offsetX, 0, -cw, cw),
      offsetY: num(b.offsetY, 0, -ch, ch),
    };
  }

  return {
    schemaVersion: 1,
    name: str(o.name, 'foe-token'),
    background,
    fields,
    canvas: { width: cw, height: ch },
  };
}
