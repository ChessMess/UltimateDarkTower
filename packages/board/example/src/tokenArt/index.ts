// Per-token art OVERRIDES for the demo. Since ultimatedarktowerboard resolves foes, adversaries
// and heroes to their official art out of the box — foes/adversaries to the flat 2D board-token
// icon in the 2D map and the portrait in 3D, heroes to their roster portrait (see
// `defaultTokenImagePath` / `OFFICIAL_2D_ICON` / `OFFICIAL_HERO_ART`) — the demo no longer hand-
// authors those; it just relies on the library default. What remains here are the genuine
// overrides the convention can't express: `skull` swaps in a real 3D GLB model, and monuments/
// markers are listed to keep them visible/editable in the Token Art Forge tool (open
// `/tokens.html`). The same object is passed to BOTH renderers — the 2D map reads `image2d`, the
// 3D plugin renders `model3d` (else `image3d ?? image2d` as a billboard). Add a `<kind>_tokens.json`
// back (and import it here) to override a token whose default art you want to replace.
import type { TokenArtConfig } from '../../../src/index';
import monument from './monument_tokens.json';
import marker from './marker_tokens.json';
import skull from './skull_tokens.json';

export const tokenArt: TokenArtConfig = { monument, marker, skull };
