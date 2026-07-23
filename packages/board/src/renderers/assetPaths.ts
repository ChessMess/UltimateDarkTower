// Shared token-art convention + selection types for the 2D map (`map2d.ts`) and
// the 3D plugin (`plugin/index.ts`). ONE source of the `assetBaseUrl` path scheme,
// the `kebab` id slug, the kind tints, and the click `TokenSelection`.
//
// This module is part of the `.` entry, so it MUST stay `three`-free and
// Display-free (the CI grep enforces it).
import type { LocationName } from '../state/boardState';

/**
 * What a click/tap reports. `kind` is a reserved built-in id or a `library.tokenTypes` key
 * (open — no longer a closed enum). `id` is the hero/foe instance id, adversary identity, or
 * the location (building/skull/monument/marker/quest host).
 */
export interface TokenSelection {
  kind: string;
  id: string;
  location: LocationName;
}

/**
 * What the art resolver is asked to resolve. `id` is the *art* id (foe type, hero id,
 * adversary/monument identity, marker/quest name) — open, matching {@link TokenSelection}.
 */
export interface TokenArtRef {
  kind: string;
  id: string;
}

/** Fill tint for a kind with no {@link KIND_TINT} entry (an author-defined custom type). */
export const DEFAULT_KIND_TINT = '#64748b';

/** Fill tints for the programmatic fallback (2D disc / 3D sprite), keyed by token kind. */
export const KIND_TINT: Record<string, string> = {
  hero: '#3b82f6',
  foe: '#ef4444',
  adversary: '#7c3aed',
  building: '#a16207',
  skull: '#a16207',
  monument: '#a16207',
  marker: '#14b8a6',
  quest: '#d4a017',
};

/** `KIND_TINT[kind]`, falling back to {@link DEFAULT_KIND_TINT} for an unrecognized kind. */
export function tintFor(kind: string): string {
  return KIND_TINT[kind] ?? DEFAULT_KIND_TINT;
}

/** 2D SVG z-order for a kind with no {@link KIND_Z_2D} entry — paints above buildings, below heroes. */
export const DEFAULT_KIND_Z_2D = 4;

/** 2D SVG render order — higher value = appended later = paints on top (SVG painters algorithm). */
export const KIND_Z_2D: Record<string, number> = {
  building: 1,
  skull: 1,
  monument: 1,
  foe: 2,
  adversary: 3,
  marker: 4,
  quest: 4,
  hero: 5,
};

/** `KIND_Z_2D[kind]`, falling back to {@link DEFAULT_KIND_Z_2D} for an unrecognized kind. */
export function zFor2D(kind: string): number {
  return KIND_Z_2D[kind] ?? DEFAULT_KIND_Z_2D;
}

/** 3D Three.js renderOrder for a kind with no {@link KIND_Z_3D} entry. */
export const DEFAULT_KIND_Z_3D = 10;

/** 3D Three.js renderOrder — higher value = drawn on top for coplanar objects. */
export const KIND_Z_3D: Record<string, number> = {
  building: 10,
  skull: 10,
  monument: 10,
  foe: 10,
  adversary: 10,
  marker: 10,
  quest: 10,
  hero: 11,
};

/** `KIND_Z_3D[kind]`, falling back to {@link DEFAULT_KIND_Z_3D} for an unrecognized kind. */
export function zFor3D(kind: string): number {
  return KIND_Z_3D[kind] ?? DEFAULT_KIND_Z_3D;
}

/** `Foo Bar` / `Utuk'Ku` → `foo-bar` / `utuk-ku`. */
export function kebab(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Normalize an asset base URL to end with a single `/` (empty stays empty). */
export function normalizeAssetBaseUrl(base: string | undefined): string {
  if (!base) return '';
  return base.endsWith('/') ? base : `${base}/`;
}

/**
 * Official RTDT 2D board-token icon filenames (under the `foes/` group folder — adversary
 * icons live there too, matching the shipped asset packs), keyed by kebab foe/adversary id.
 * These are the small flat card-style icons meant for the 2D map; the plain `${kebab(id)}.png`
 * convention below resolves to the larger 3D-style portrait instead, which is what the 3D
 * tower's sprite billboard wants. Filenames don't derive from the id by any transform (tier
 * prefixes, abbreviated adversary names), so this is hand-maintained, not computed. A consumer
 * can still override any entry via `tokenArt`.
 */
const OFFICIAL_2D_ICON: Partial<Record<'foe' | 'adversary', Record<string, string>>> = {
  foe: {
    brigands: 'Foe-Token-L2-Brigands.png',
    oreks: 'Foe-Token-L2-Oreks.png',
    'shadow-wolves': 'Foe-Token-L2-Shadow-Wolves.png',
    'spine-fiends': 'Foe-Token-L2-Spine-Fiends.png',
    'frost-trolls': 'Foe-Token-L3-Frost-Troll.png',
    'clan-of-neuri': 'Foe-Token-L3-Clan-of-Neuri.png',
    lemures: 'Foe-Token-L3-Lemure.png',
    'widowmade-spiders': 'Foe-Token-L3-Widowmade-Spider.png',
    dragons: 'Foe-Token-L4-Dragon.png',
    mormos: 'Foe-Token-L4-Mormo.png',
    striga: 'Foe-Token-L4-Striga.png',
    titans: 'Foe-Token-L4-Titan.png',
  },
  adversary: {
    ashstrider: 'Adversary-Token-Ashstrider.png',
    'bane-of-omens': 'Adversary-Token-Bane.png',
    'empress-of-shades': 'Adversary-Token-Empress.png',
    'gaze-eternal': 'Adversary-Token-Gaze.png',
    gravemaw: 'Adversary-Token-Gravemaw.png',
    'isa-the-exile': 'Adversary-Token-Isa.png',
    'lingering-rot': 'Adversary-Token-Lingering-Rot.png',
    'utuk-ku': 'Adversary-Token-Utuk-Ku.png',
  },
};

/**
 * Portrait art filenames (under the `heros/` group folder) for the full RTDT hero roster —
 * every standard hero across the base game and all expansions, keyed by kebab hero id. Kept in
 * sync with UDT's `data.heroes.HEROES`; `null` marks a roster hero whose portrait asset hasn't
 * shipped yet (→ programmatic disc fallback, no failed request). Heroes have no derivable
 * filename convention (some assets carry a `-hero` suffix, some don't) and no separate 2D/3D
 * art — the one portrait drives both views. A consumer can still override any entry via
 * `tokenArt`, and add a portrait later by dropping the file in and filling its entry here.
 */
const OFFICIAL_HERO_ART: Record<string, string | null> = {
  // base
  'brutal-warlord': 'brutal-warlord-hero.png',
  'orphaned-scion': 'orphaned-scion.png',
  'relic-hunter': null,
  spymaster: null,
  // alliances
  archwright: null,
  'haunted-recluse': null,
  // covenant
  'devious-swindler': null,
  'relentless-warden': null,
  'reverent-astromancer': null,
  'undaunted-aegis': null,
  // expeditions
  'jocular-druid': null,
  'grizzled-mariner': null,
  'clever-tinkerer': null,
  'enlightened-ascetic': null,
};

/**
 * Art filenames (under the `quests/` group folder) for the four quest markers, keyed by kebab
 * quest id — the game's official marker sculpts (cut from the component photo, background removed),
 * one image driving both the 2D map and the 3D billboard. `null` would mark a quest whose art
 * hasn't shipped (→ programmatic gold disc fallback, no failed request). A consumer hosts these
 * PNGs under `${assetBaseUrl}quests/` (the demo ships them in example/public/tokens/quests/) or
 * overrides per-token via `tokenArt`. Mirrors {@link OFFICIAL_HERO_ART}.
 */
const OFFICIAL_QUEST_ART: Record<string, string | null> = {
  'main-goal': 'main-goal.png',
  'adversary-quest': 'adversary-quest.png',
  'guild-quest': 'guild-quest.png',
  'companion-quest': 'companion-quest.png',
};

/**
 * Default `${assetBaseUrl}${group}/${kebab(id)}.png` convention shared by the 2D map and the
 * 3D plugin. In the 2D view, foe/adversary ids with a known {@link OFFICIAL_2D_ICON} entry
 * resolve to the small flat board-token icon instead of the 3D-style portrait; 3D and every
 * other kind use the plain convention unchanged. Heroes resolve their roster portrait via
 * {@link OFFICIAL_HERO_ART} (same image both views). Returns `null` for "no art" → a
 * programmatic fallback: heroes with no shipped portrait, and everything when `assetBaseUrl`
 * is empty. `assetBaseUrl` may be passed with or without a trailing slash.
 *
 * Any kind with no dedicated case (an author-defined custom type, or `skull`, which the
 * building layer resolves via `art:'skull'`) falls through to
 * `${base}markers/${kebab(art)}.png` — a new type gets art by convention with zero code.
 */
export function defaultTokenImagePath(
  ref: TokenArtRef,
  assetBaseUrl: string | undefined,
  view: BoardView,
): string | null {
  const base = normalizeAssetBaseUrl(assetBaseUrl);
  if (!base) return null;
  const id = kebab(ref.id);
  if (view === '2d' && (ref.kind === 'foe' || ref.kind === 'adversary')) {
    const icon = OFFICIAL_2D_ICON[ref.kind]?.[id];
    if (icon) return `${base}foes/${icon}`;
  }
  switch (ref.kind) {
    case 'foe':
      return `${base}foes/${id}.png`;
    case 'adversary':
      return `${base}adversaries/${id}.png`;
    case 'monument':
      return `${base}monuments/${id}.png`;
    case 'quest': {
      const art = OFFICIAL_QUEST_ART[id];
      return art ? `${base}quests/${art}` : null; // unmapped/art-less → gold disc fallback
    }
    case 'hero': {
      const portrait = OFFICIAL_HERO_ART[id];
      return portrait ? `${base}heros/${portrait}` : null; // unmapped/art-less → disc fallback
    }
    default:
      // marker, skull, and any custom author-defined type.
      return `${base}markers/${id}.png`;
  }
}

// ── per-token art config (separate 2D vs 3D art) ────────────────────────────

/** Which renderer is asking for a token's art. */
export type BoardView = '2d' | '3d';

/**
 * A 3D model to render in place of a token's 2D sprite. A bare `string` is the model
 * URL with defaults; the object form tunes per-model placement.
 *
 * The model is normalized to a unit bounding sphere (centered, radius 1) by Display's
 * loader, so `scale` multiplies the token kind's default world size and the model rests
 * on the disc regardless of `rotation`. (Pure data — no `three`; the 3D plugin loads it.)
 */
export type TokenModelRef =
  | string
  | {
      /** Consumer-hosted `.glb` URL (Draco-compressed ok). Never bundled. */
      url: string;
      /** Multiplies the token kind's default world size. Default `1`. */
      scale?: number;
      /** Euler rotation (radians) to correct the model's native up/forward axis. */
      rotation?: { x?: number; y?: number; z?: number };
      /** Draco decoder source for THIS model; defaults to Display's gstatic CDN. `null` → uncompressed. */
      dracoDecoderPath?: string | null;
    };

/**
 * Per-token art override. Any omitted field falls back to the resolver callback, then the
 * default `${assetBaseUrl}${group}/${kebab(id)}.png` convention. Usually one `image2d` is all
 * a token needs — it drives the 2D map AND the 3D sprite billboard. Add `image3d` only to give
 * 3D a *different* flat image, or `model3d` to render a GLB in place of the sprite entirely.
 */
export interface TokenArt {
  /** Image used in the 2D map, and the 3D sprite billboard when `image3d` is unset. */
  image2d?: string;
  /** Image for the 3D sprite billboard when it should differ from `image2d`. Defaults to `image2d`. */
  image3d?: string;
  /** GLB model rendered in place of the 3D sprite (3D only). Takes precedence over `image3d`/`image2d`. */
  model3d?: TokenModelRef;
}

/**
 * Declarative per-token art table, keyed by token kind then **art id**. The art id is what
 * the renderer resolves against: the foe *type* for foes (so instances of a type share an
 * entry), the hero/adversary/monument id or marker/quest name otherwise, and `'skull'` for
 * skulls. Keys are matched kebab-insensitively (`"Brigands"` and `"brigands"` both resolve).
 */
export type TokenArtConfig = Record<string, Record<string, TokenArt>>;

/** Look up a per-token art override by ref, matching the raw id then its kebab slug. */
export function lookupTokenArt(
  config: TokenArtConfig | undefined,
  ref: TokenArtRef,
): TokenArt | undefined {
  const byKind = config?.[ref.kind];
  if (!byKind) return undefined;
  return byKind[ref.id] ?? byKind[kebab(ref.id)];
}

/** Inputs the board threads into {@link resolveTokenImageFor} (shared by both renderers). */
export interface ResolveTokenImageOptions {
  tokenArt?: TokenArtConfig;
  resolveTokenImage?: (ref: TokenArtRef, view: BoardView) => string | null;
  assetBaseUrl?: string;
}

/**
 * Resolve a token's image for a given view. Precedence: the per-token `tokenArt` override
 * (`image2d`/`image3d`) → the consumer `resolveTokenImage` callback → the default
 * `${assetBaseUrl}${group}/${kebab(id)}.png` convention. Returns `null` → programmatic fallback.
 *
 * In the 3D view the sprite billboard falls back to `image2d` when `image3d` is unset, so a
 * single `image2d` drives both views; set `image3d` only to give 3D a *different* flat image.
 */
export function resolveTokenImageFor(
  ref: TokenArtRef,
  view: BoardView,
  opts: ResolveTokenImageOptions,
): string | null {
  const override = lookupTokenArt(opts.tokenArt, ref);
  const fromConfig = view === '2d' ? override?.image2d : (override?.image3d ?? override?.image2d);
  if (fromConfig != null) return fromConfig;
  if (opts.resolveTokenImage) return opts.resolveTokenImage(ref, view);
  return defaultTokenImagePath(ref, opts.assetBaseUrl, view);
}
