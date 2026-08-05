// Glyph artwork, resolved to bundler-emitted URLs.
//
// `new URL(<literal>, import.meta.url)` is the canonical shape: Vite's
// `vite:asset-import-meta-url` transform has no node_modules exclusion and this package
// realpaths outside node_modules, so a consuming app emits these files from its own build.
// See ../../CLAUDE.md for why this is a package and not a `public/` copy.

/**
 * The five tower glyphs, keyed to match `GLYPHS` in `ultimatedarktowerdata`.
 *
 * The key union is written out rather than imported so this package stays dependency-free
 * (see CLAUDE.md). Consumers index it with game-data's `Glyphs` type, so a renamed glyph is
 * a compile error at the call site — which is the point: the old
 * `` `${BASE_URL}assets/glyph_${name}.svg` `` string concat failed silently at runtime.
 */
export const glyphSvg: Record<'cleanse' | 'quest' | 'battle' | 'banner' | 'reinforce', string> = {
  cleanse: new URL('../../glyphs/cleanse.svg', import.meta.url).href,
  quest: new URL('../../glyphs/quest.svg', import.meta.url).href,
  battle: new URL('../../glyphs/battle.svg', import.meta.url).href,
  banner: new URL('../../glyphs/banner.svg', import.meta.url).href,
  reinforce: new URL('../../glyphs/reinforce.svg', import.meta.url).href,
};

/** All five glyphs in one plate — a legend/key image, not one of the five individual glyphs. */
export const allGlyphsSvg: string = new URL('../../glyphs/all_glyphs.svg', import.meta.url).href;

/** Raster sprite sheet of the five glyphs, used with an HTML image map in `apps/game`. */
export const glyphsPng: string = new URL('../../glyphs/glyphs.png', import.meta.url).href;
