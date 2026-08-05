// Token artwork, resolved to bundler-emitted URLs.
//
// A glob rather than 84 hand-written `new URL` lines: a glob is *definitionally* in sync with
// the directory, so it replaces the drift-guard test it would otherwise need. The glob base is
// `dirname(<this file>)`, so the relative pattern resolves against this package regardless of
// which app is doing the building.
//
// `?url&no-inline`, not plain `?url`: Vite's library mode force-inlines assets as base64
// regardless of `assetsInlineLimit`, and `packages/display`'s `emitAssetsAsFiles()` workaround is
// regex-driven over literal `new URL('./assets/…')` calls — it would not match a glob. Nothing
// currently pulls this module into a lib build, but `?no-inline` is free insurance and is checked
// before the lib-mode branch.
// `.glb` is included even though it is not in Vite's KNOWN_ASSET_TYPES: the `?url` query
// short-circuits the `assetsInclude` check, so no consumer config is needed.
const modules = import.meta.glob('../../tokens/**/*.{png,glb}', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
}) as Record<string, string>;

const TOKENS_SEGMENT = '/tokens/';

/**
 * `'<group>/<file>.png'` → bundled URL, e.g. `'foes/dragon-token.png'`.
 *
 * Keys deliberately mirror the `${group}/${file}` shape that `ultimatedarktowerboard`'s
 * `defaultTokenImagePath` produces, so `makeTokenImageResolver` can map straight from board's own
 * resolution onto these URLs. Group folders are board's convention: `foes/`, `adversaries/`,
 * `monuments/`, `quests/`, `heros/` (sic — the misspelling is the shipped convention) and
 * `markers/`.
 */
export const tokenUrls: Record<string, string> = Object.fromEntries(
  Object.entries(modules).map(([path, url]) => [
    path.slice(path.indexOf(TOKENS_SEGMENT) + TOKENS_SEGMENT.length),
    url,
  ]),
);

// A glob that matches nothing returns `{}` with no warning — and it would only do so if the
// realpath ever landed inside node_modules (Vite filters glob results with
// `ignore: ['**/node_modules/**']`). Fail loudly at import time instead of rendering 84 broken
// images.
if (Object.keys(tokenUrls).length === 0) {
  throw new Error(
    '@udtc/assets: the token glob matched no files. This usually means the package was ' +
      'pre-bundled (check optimizeDeps.include) or resolved through a node_modules realpath.',
  );
}

/** The official skull sculpt, rendered in 3D in place of the flat marker sprite. */
export const skullGlb: string = tokenUrls['markers/skull.glb'];

/**
 * Per-token art overrides to pass alongside `resolveTokenImage`.
 *
 * This exists because **`resolveTokenImage` does not cover 3D models**: the board plugin falls
 * through to `defaultTokenModelPath(art, assetBaseUrl)`, and `resolveTokenModel` is not exposed
 * through `BoardStageView`/`stageTower` at all — so dropping `assetBaseUrl` without this would
 * silently degrade the skull to a sprite billboard with no error. A `tokenArt` entry takes
 * precedence over both the callback and the convention.
 *
 * Typed structurally rather than as board's `TokenArtConfig` so this package stays
 * dependency-free (importing board here would create a `board ⇄ assets` cycle).
 */
export const tokenArt: Record<
  string,
  Record<string, { model3d: { url: string; scale: number } }>
> = {
  skull: { skull: { model3d: { url: skullGlb, scale: 0.6 } } },
};
