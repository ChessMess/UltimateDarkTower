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
import type { TokenArtConfig } from '../../../src/index';
import hero from './hero_tokens.json';
import foe from './foe_tokens.json';
import adversary from './adversary_tokens.json';
import monument from './monument_tokens.json';
import marker from './marker_tokens.json';
import skull from './skull_tokens.json';

export const tokenArt: TokenArtConfig = {
  hero: hero as TokenArtConfig['hero'],
  foe: foe as TokenArtConfig['foe'],
  adversary: adversary as TokenArtConfig['adversary'],
  monument: monument as TokenArtConfig['monument'],
  marker: marker as TokenArtConfig['marker'],
  skull: skull as TokenArtConfig['skull'],
};
