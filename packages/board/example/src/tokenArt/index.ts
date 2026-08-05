// Per-token art overrides for the DEMO, editable in the browser via the Token Art Forge
// (`/tokens.html`, or the "Art Forge" link). Each `<kind>_tokens.json` maps an art id →
// { image2d?, image3d?, model3d? }. This object is the demo's *consumer-level* `tokenArt`,
// layered ON TOP of the board library's built-in defaults — it is NOT the library's defaults.
//
// The library already resolves foes/adversaries (flat 2D icon + 3D portrait) and the standard
// hero roster (portraits) on its own, so those files ship EMPTY: a token with no entry renders
// from the library default. Add an entry (or use the Forge) to override a specific token here
// for the demo. To make art a LIBRARY default that every consumer gets, promote it into the
// `OFFICIAL_2D_ICON` / `OFFICIAL_HERO_ART` tables — see `npm run promote-token-art`.
//
// All six kinds are imported so the Art Forge always has a file to write and demo overrides for
// any kind flow through to the board. The same object is passed to BOTH renderers — the 2D map
// reads `image2d`, the 3D plugin renders `model3d` (else `image3d ?? image2d` as a billboard).
import type { TokenArtConfig, TokenArt, TokenModelRef } from '../../../src/index';
import { tokenUrls } from '@udtc/assets/tokens';
import hero from './hero_tokens.json';
import foe from './foe_tokens.json';
import adversary from './adversary_tokens.json';
import monument from './monument_tokens.json';
import marker from './marker_tokens.json';
import quest from './quest_tokens.json';
import skull from './skull_tokens.json';

// The JSON files keep storing stable, human-readable paths (`./tokens/<group>/<file>`) because
// that is also the Art Forge's on-disk save format — the art itself now lives in @udtc/assets and
// is served under a hashed bundler URL, so the two are reconciled here at load time rather than
// by rewriting (and churning) the manifests on every asset change.
const TOKENS_PREFIX = './tokens/';

/**
 * Map a manifest path onto its bundled URL.
 *
 * Also used by the Art Forge to paint previews, so the manifests stay human-readable on disk
 * while the browser gets a real (hashed) URL. Unknown values pass through untouched — the Forge
 * can legitimately hold a `data:` URL or an absolute URL, and those must not be mangled.
 */
export function resolveDemoPath(path: string): string {
  if (path.startsWith(TOKENS_PREFIX)) {
    return tokenUrls[path.slice(TOKENS_PREFIX.length)] ?? path;
  }
  return path;
}

/** `model3d` is either a bare URL string or `{ url, scale?, rotation?, dracoDecoderPath? }`. */
function resolveModel(model: TokenModelRef): TokenModelRef {
  if (typeof model === 'string') return resolveDemoPath(model);
  return { ...model, url: resolveDemoPath(model.url) };
}

function resolveKind(entries: Record<string, TokenArt> | undefined): Record<string, TokenArt> {
  if (!entries) return {};
  return Object.fromEntries(
    Object.entries(entries).map(([id, art]) => [
      id,
      {
        ...art,
        ...(art.image2d ? { image2d: resolveDemoPath(art.image2d) } : {}),
        ...(art.image3d ? { image3d: resolveDemoPath(art.image3d) } : {}),
        ...(art.model3d ? { model3d: resolveModel(art.model3d) } : {}),
      },
    ]),
  );
}

export const tokenArt: TokenArtConfig = {
  hero: resolveKind(hero as Record<string, TokenArt>),
  foe: resolveKind(foe as Record<string, TokenArt>),
  adversary: resolveKind(adversary as Record<string, TokenArt>),
  monument: resolveKind(monument as Record<string, TokenArt>),
  marker: resolveKind(marker as Record<string, TokenArt>),
  quest: resolveKind(quest as Record<string, TokenArt>),
  skull: resolveKind(skull as Record<string, TokenArt>),
};
