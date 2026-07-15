import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const pkgRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const srcContent = join(pkgRoot, 'src/game-content');
const distContent = join(pkgRoot, 'dist/game-content');

describe('game-content assets', () => {
  const files = readdirSync(srcContent).filter((f) => f.endsWith('.md'));

  it('serves the 8 markdown files the resource registry registers', () => {
    expect(files.sort()).toEqual([
      'adversaries.md',
      'buildings.md',
      'glossary.md',
      'heroes.md',
      'items.md',
      'lore.md',
      'quests.md',
      'rules.md',
    ]);
  });

  // v1.0.0 shipped `"build": "tsc"`, which does not emit .md files. loadAsset()
  // resolves against dist/, so all 8 game-content resources served placeholder
  // text — in the published tarball too. Asserting against the build output is
  // the point: a test that read src/ would pass while the bug was live, which is
  // exactly how it went unnoticed. `pnpm run ci` builds before it tests.
  it('copies them alongside the compiled output, where loadAsset resolves', () => {
    expect(
      existsSync(distContent),
      `${distContent} is missing — run \`pnpm --filter mcp-server-return-to-dark-tower build\` first`,
    ).toBe(true);

    for (const file of files) {
      expect(readFileSync(join(distContent, file), 'utf-8')).toBe(
        readFileSync(join(srcContent, file), 'utf-8'),
      );
    }
  });
});
