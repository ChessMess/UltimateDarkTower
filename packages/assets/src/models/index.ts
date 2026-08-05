// 3D models, resolved to bundler-emitted URLs.
//
// `.glb` is deliberately loaded with `new URL(...)` rather than `import x from '...glb?url'`:
// `glb` is NOT in Vite's KNOWN_ASSET_TYPES, so the `?url` form would require every consumer to
// declare `assetsInclude: ['**/*.glb']`. `new URL` calls `fileToUrl` directly and skips that
// check entirely, so consumers need no config.

/** The Return to Dark Tower tower model (Draco-compressed GLB). */
export const towerGlb: string = new URL('../../models/tower.glb', import.meta.url).href;
