// Per-token art, authored as JSON split by token KIND so it's easy to edit and grep — and editable
// in the browser via the Token Art Forge tool (open `/tokens.html`, or the "Art Forge" link in the
// demo). Each `<kind>_tokens.json` maps an art id → { image2d?, model3d? }: the kebab id from UDT's
// roster (foe/adversary/hero/monument), the marker name, or "skull" for skulls. Keys are
// kebab-insensitive. Every token is listed with its default `${assetBaseUrl}${group}/${kebab(id)}.png`
// image so the defaults are visible and editable; a token with no image2d still falls back to that
// convention on the board.
//
// All six kinds are imported so the Art Forge always has a file to write; the same object is passed
// to BOTH renderers — the 2D map reads `image2d`, the 3D plugin renders `model3d` (else the image as
// a billboard). Heroes have no convention art, so this is how you give a hero a portrait.
import type { TokenArtConfig } from '../../../src/index';
import hero from './hero_tokens.json';
import foe from './foe_tokens.json';
import adversary from './adversary_tokens.json';
import monument from './monument_tokens.json';
import marker from './marker_tokens.json';
import skull from './skull_tokens.json';

export const tokenArt: TokenArtConfig = { hero, foe, adversary, monument, marker, skull };
