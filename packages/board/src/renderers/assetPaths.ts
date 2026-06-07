// Shared token-art convention + selection types for the 2D map (`map2d.ts`) and
// the 3D plugin (`plugin/index.ts`). ONE source of the `assetBaseUrl` path scheme,
// the `kebab` id slug, the kind tints, and the click `TokenSelection`.
//
// This module is part of the `.` entry, so it MUST stay `three`-free and
// Display-free (the CI grep enforces it).
import type { LocationName } from '../state/boardState';

/** What a click/tap reports. `id` is the hero/foe instance id, adversary id, or the location (building/marker host). */
export interface TokenSelection {
  kind: 'hero' | 'foe' | 'adversary' | 'building' | 'marker';
  id: string;
  location: LocationName;
}

/** What the art resolver is asked to resolve. `id` is the *art* id (foe type, adversary id, monument id, marker name). */
export type TokenArtRef =
  | { kind: 'hero'; id: string }
  | { kind: 'foe'; id: string }
  | { kind: 'adversary'; id: string }
  | { kind: 'monument'; id: string }
  | { kind: 'marker'; id: string }
  | { kind: 'skull'; id: 'skull' };

/** Fill tints for the programmatic fallback (2D disc / 3D sprite), keyed by token kind. */
export const KIND_TINT: Record<TokenSelection['kind'], string> = {
  hero: '#3b82f6',
  foe: '#ef4444',
  adversary: '#7c3aed',
  building: '#a16207',
  marker: '#14b8a6',
};

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
 * Default `${assetBaseUrl}${group}/${kebab(id)}.png` convention shared by the 2D
 * map and the 3D plugin. Returns `null` for "no art" → a programmatic fallback:
 * heroes always (no hero art exists), and everything when `assetBaseUrl` is empty.
 * `assetBaseUrl` may be passed with or without a trailing slash.
 */
export function defaultTokenImagePath(ref: TokenArtRef, assetBaseUrl: string | undefined): string | null {
  const base = normalizeAssetBaseUrl(assetBaseUrl);
  if (!base) return null;
  const id = kebab(ref.id);
  switch (ref.kind) {
    case 'foe':
      return `${base}foes/${id}.png`;
    case 'adversary':
      return `${base}adversaries/${id}.png`;
    case 'monument':
      return `${base}monuments/${id}.png`;
    case 'marker':
      return `${base}markers/${id}.png`;
    case 'skull':
      return `${base}markers/skull.png`;
    case 'hero':
      return null; // no hero art exists — always the fallback
  }
}
