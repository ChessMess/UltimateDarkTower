/// <reference types="vite/client" />
import { describe, it, expect } from 'vitest';
import { ALL_ASSETS, ART_GROUPS, ART_GROUP_BY_ID, TOTAL_ASSETS } from './art';

/**
 * The drift guard: every art file on disk must appear in the registry.
 *
 * `import.meta.glob` with **no options** is the whole mechanism — that yields path keys and lazy
 * importer functions, with no asset resolution at all, which is exactly what "enumerate the
 * directory" needs and the only form that is safe to run under vitest. (Resolving `?url` here
 * would make the test depend on Vite's asset pipeline instead of the filesystem.)
 *
 * Add a file to `packages/assets/` and this test goes red until it is registered — the exact
 * contract `datasets.test.ts` holds over `ultimatedarktowerdata`, and the only thing keeping the
 * Art section a *complete* view rather than a sampling.
 *
 * One pattern per art directory rather than a single `packages/assets/**` — the art dirs sit at
 * the package root alongside `src/` and `types/`, which a blanket glob would sweep in. The upside
 * of listing them is that a *sixth* art directory is invisible here until someone adds it below,
 * which is the same fail-loudly posture as the `> 50` assertion.
 *
 * The patterns must be inline literals: Vite parses this call out of the AST, and a hoisted
 * `${PREFIX}` template throws `Expected glob to be a string, but got dynamic template literal`.
 *
 * The `/// <reference types="vite/client" />` above is what types `import.meta.glob`. Deliberately
 * a file-local directive rather than `"types": ["vite/client"]` in tsconfig.app.json — setting
 * `types` there would disable automatic `@types/*` inclusion for every source file in the app.
 */
const ART_ON_DISK = Object.keys(
  import.meta.glob([
    '../../../packages/assets/audio/**/*',
    '../../../packages/assets/board/**/*',
    '../../../packages/assets/glyphs/**/*',
    '../../../packages/assets/models/**/*',
    '../../../packages/assets/tokens/**/*',
  ]),
)
  .map((p) => p.split('/packages/assets/')[1])
  .sort();

describe('the registry covers every file in @udtc/assets', () => {
  it('finds art on disk at all', () => {
    // A glob that matches nothing returns `{}` silently, which would make every assertion below
    // vacuously true. Fail loudly on that instead — this is also what catches a wrong relative
    // path, which is the one thing that could break when this file moves between apps.
    expect(ART_ON_DISK.length).toBeGreaterThan(50);
  });

  it('catalogs every file, and catalogs nothing that is not there', () => {
    expect([...ALL_ASSETS.map((a) => a.file)].sort()).toEqual(ART_ON_DISK);
  });
});

describe('art registry integrity', () => {
  it('gives every asset a bundler-resolved URL', () => {
    for (const a of ALL_ASSETS) {
      expect(a.url, a.file).toBeTruthy();
      expect(typeof a.url, a.file).toBe('string');
    }
  });

  it('keeps ids unique and URL-safe within a group', () => {
    for (const group of ART_GROUPS) {
      const ids = group.assets.map((a) => a.id);
      expect(new Set(ids).size, `duplicate id in ${group.id}`).toBe(ids.length);
      for (const id of ids) {
        // `#` would terminate the hash route and `/` would fake a fourth path segment.
        expect(id, `${group.id}/${id}`).toBe(encodeURIComponent(id));
      }
    }
    expect(new Set(ART_GROUPS.map((g) => g.id)).size).toBe(ART_GROUPS.length);
  });

  it('keeps group ids URL-safe and readable', () => {
    // Group ids are the second segment of `#/art/<group>/<asset>`, so they are deep-linkable URLs.
    // The audio slugs are authored in AUDIO_SECTIONS rather than derived from the filename prefix,
    // which would have produced `audio-mainobjectivevictory`.
    for (const g of ART_GROUPS) {
      expect(g.id, g.name).toBe(encodeURIComponent(g.id));
      expect(g.id, g.name).toMatch(/^[a-z0-9-]+$/);
    }
    expect(ART_GROUPS.map((g) => g.id)).toContain('audio-main-objective');
  });

  it('gives every heavy asset a light stand-in', () => {
    // Without this, opening a detail page would silently cost 22 MB — the exact thing `heavy` is
    // for. A heavy asset with no preview is a broken image, not a slow one.
    for (const a of ALL_ASSETS.filter((x) => x.heavy)) {
      expect(a.preview, a.file).toBeTruthy();
      expect(a.preview, a.file).not.toBe(a.url);
    }
  });

  it('names an import path for every group', () => {
    for (const g of ART_GROUPS) {
      expect(g.importPath, g.id).toMatch(/^import .* from '@udtc\/assets(\/[\w-]+)?';$/);
      expect(g.assets.length, g.id).toBeGreaterThan(0);
    }
  });

  it('keeps the lookups in sync with the list', () => {
    expect(ART_GROUP_BY_ID.size).toBe(ART_GROUPS.length);
    expect(TOTAL_ASSETS).toBe(ART_GROUPS.reduce((n, g) => n + g.assets.length, 0));
  });

  it("uses the board package's own folder convention for token groups", () => {
    // These strings are what `defaultTokenImagePath` emits in `ultimatedarktowerboard`. Renaming
    // a folder here silently breaks `makeTokenImageResolver`'s path→URL mapping in every app.
    const tokenGroupIds = ART_GROUPS.filter((g) => g.section === 'Token art')
      .map((g) => g.id)
      .sort();
    expect(tokenGroupIds).toEqual([
      'adversaries',
      'foes',
      'heros',
      'markers',
      'monuments',
      'quests',
    ]);
  });

  it('catalogs the whole sound library, both halves of it', () => {
    const audio = ALL_ASSETS.filter((a) => a.kind === 'audio');
    // 113 generated from the firmware table + the 2 hand-maintained effects. That total is what
    // `packages/display/scripts/check-dist-size.mjs` independently asserts reaches display's dist,
    // so a drift between the two numbers is a real problem, not a bookkeeping one.
    expect(audio.length).toBe(115);

    // The effects live in a separate module precisely because extract-audio.mjs regenerates the
    // other one wholesale. Folding them into the generated group would hide that.
    const effects = ART_GROUPS.find((g) => g.id === 'audio-effects');
    expect(effects?.assets.map((a) => a.file).sort()).toEqual([
      'audio/drumCalibration.ogg',
      'audio/drumRotation.ogg',
    ]);
    expect(effects?.importPath).toContain('@udtc/assets/audio-effects');
  });

  it('has a measured duration for every clip, and none for anything else', () => {
    // `audioDurations.ts` is generated by `scripts/measure-audio.mjs` and is the only thing here
    // that a file change cannot invalidate on its own — the glob above proves a new .ogg is
    // *registered*, this proves it was also *measured*. Without it, a clip added without rerunning
    // the script would just render with no length and nothing would say so.
    for (const a of ALL_ASSETS) {
      if (a.kind === 'audio') {
        expect(a.seconds, `${a.file} — rerun \`node scripts/measure-audio.mjs\``).toBeGreaterThan(
          0,
        );
      } else {
        expect(a.seconds, a.file).toBeUndefined();
      }
    }
  });
});
