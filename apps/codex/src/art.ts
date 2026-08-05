// The art registry — the Codex's second registry, parallel to `datasets.ts`.
//
// Same rule as the dataset registry: everything the Art section renders comes from here, so adding
// a category is a data edit and never a component. It is deliberately NOT folded into `DATASETS`:
// art rows carry `kind`/`heavy`/`preview` and render as media, and keeping them out means
// `TOTAL_ROWS` stays an honest claim about `ultimatedarktowerdata`.
//
// Every URL is produced by the bundler out of `@udtc/assets` — there is no `public/` copy and no
// `BASE_URL` string concat, so a file that vanishes from `packages/assets/` becomes a build
// error rather than a 404 in production. See packages/assets/CLAUDE.md.

import { tokenUrls } from '@udtc/assets/tokens';
import { boardFullPng } from '@udtc/assets/board';
import { boardSmall } from '@udtc/assets/board-small';
import { towerGlb } from '@udtc/assets/models';
import { glyphSvg, allGlyphsSvg, glyphsPng } from '@udtc/assets/glyphs';
import { audioUrls } from '@udtc/assets/audio';
import { calibrationSoundUrl, drumRotationSoundUrl } from '@udtc/assets/audio-effects';
import { AUDIO_SECONDS } from './audioDurations';

export type AssetKind = 'image' | 'model' | 'audio';

export type Asset = {
  /** URL-safe, unique within its group; the third hash segment of `#/art/<group>/<asset>`. */
  id: string;
  name: string;
  /** Path relative to `packages/assets/`, shown verbatim as the file's identity. */
  file: string;
  kind: AssetKind;
  /** Bundler-emitted URL. */
  url: string;
  /**
   * Multi-megabyte originals are not fetched until asked for. `preview` is what the tile and the
   * detail pane show instead; the real `url` loads behind an explicit button.
   */
  heavy?: boolean;
  preview?: string;
  /** Clip length for `kind: 'audio'`, from the generated `audioDurations.ts`. */
  seconds?: number;
};

/** Named `ArtGroup`, not `Group` — `datasets.ts` exports its own `Group` union. */
export type ArtGroup = {
  id: string;
  name: string;
  /** Sidebar heading this group sits under. */
  section: string;
  blurb: string;
  /** The import a consumer would write to get these URLs — shown on the group page. */
  importPath: string;
  assets: Asset[];
};

// ── naming ─────────────────────────────────────────────────────────────────────────────────────

const stem = (file: string) => file.replace(/^.*\//, '').replace(/\.[^.]+$/, '');

/** `ashstrider-token` → `Ashstrider Token`. Display only; `file` stays the source of truth. */
function titleCase(slug: string): string {
  return slug
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

// ── token groups ───────────────────────────────────────────────────────────────────────────────

// Folder names are `ultimatedarktowerboard`'s own convention — the exact strings
// `defaultTokenImagePath` emits. `heros` is misspelled in the shipped convention; matching it is
// the point, so don't "fix" the key.
const TOKEN_SECTIONS: Record<string, { name: string; blurb: string }> = {
  foes: { name: 'Foes', blurb: 'The standard foe roster, plus their damaged-side variants.' },
  adversaries: { name: 'Adversaries', blurb: 'Campaign adversaries and their token faces.' },
  monuments: { name: 'Monuments', blurb: 'Board monuments.' },
  quests: {
    name: 'Quest markers',
    blurb:
      'Quest markers. These shipped only in the board example before this package existed, so ' +
      'apps/player and apps/digital resolved them to 404s — centralizing the art is what fixed it.',
  },
  heros: {
    name: 'Heroes',
    blurb: 'Hero tokens. The folder name is misspelled in the shipped convention.',
  },
  markers: { name: 'Markers', blurb: 'Generic play markers, including the 3D skull sculpt.' },
};

function tokenGroups(): ArtGroup[] {
  const byFolder = new Map<string, Asset[]>();
  const taken = new Map<string, Set<string>>();

  for (const [path, url] of Object.entries(tokenUrls)) {
    const folder = path.slice(0, path.indexOf('/'));
    const ext = path.slice(path.lastIndexOf('.') + 1);
    const base = stem(path);
    // `markers/` holds both `skull.png` and `skull.glb` — the flat sprite and the 3D sculpt of the
    // same token. Two files that share a stem would share a route, so the extension disambiguates
    // the second one. Only the collision pays for it; the other 83 ids stay clean.
    const used = taken.get(folder) ?? new Set<string>();
    taken.set(folder, used);
    const id = used.has(base) ? `${base}-${ext}` : base;
    used.add(id);

    const asset: Asset = {
      id,
      name: id === base ? titleCase(base) : `${titleCase(base)} (${ext.toUpperCase()})`,
      file: `tokens/${path}`,
      kind: ext === 'glb' ? 'model' : 'image',
      url,
    };
    const list = byFolder.get(folder);
    if (list) list.push(asset);
    else byFolder.set(folder, [asset]);
  }

  return [...byFolder.entries()]
    .map(([folder, assets]) => ({
      id: folder,
      name: TOKEN_SECTIONS[folder]?.name ?? titleCase(folder),
      section: 'Token art',
      blurb: TOKEN_SECTIONS[folder]?.blurb ?? '',
      importPath: "import { tokenUrls } from '@udtc/assets/tokens';",
      assets: assets.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── audio groups ───────────────────────────────────────────────────────────────────────────────

// Display names come from the filenames, not from `TOWER_AUDIO_LIBRARY`. The library's labels are
// transcribed and carry no more authority than the filenames do, and using them here would mean
// re-deriving the sample-id → filename mapping that lives privately inside `packages/display`.
// The bytes are the authority; the filename is what names them.
//
// The `slug` is authored rather than derived from the filename prefix: `MainObjectiveVictory`
// would lower-case to `audio-mainobjectivevictory`, which is unreadable both in the sidebar and in
// the URL — and these are deep-linkable routes.
const AUDIO_SECTIONS: Record<string, { name: string; slug: string }> = {
  Tower: { name: 'Tower', slug: 'audio-tower' },
  Battle: { name: 'Battle', slug: 'audio-battle' },
  Foe: { name: 'Foes', slug: 'audio-foes' },
  Dungeon: { name: 'Dungeons', slug: 'audio-dungeons' },
  Classic: { name: 'Classic mode', slug: 'audio-classic' },
  Ally: { name: 'Allies', slug: 'audio-allies' },
  MainObjectiveVictory: { name: 'Main objective', slug: 'audio-main-objective' },
  Adversary: { name: 'Adversaries', slug: 'audio-adversaries' },
  Button: { name: 'Buttons', slug: 'audio-buttons' },
  Event: { name: 'Events', slug: 'audio-events' },
  Quest: { name: 'Quests', slug: 'audio-quests' },
};

function audioGroups(): ArtGroup[] {
  const byPrefix = new Map<string, Asset[]>();
  for (const [file, url] of Object.entries(audioUrls)) {
    const prefix = file.slice(0, file.indexOf('_'));
    const asset: Asset = {
      id: stem(file),
      name: titleCase(stem(file)),
      file: `audio/${file}`,
      kind: 'audio',
      url,
      seconds: AUDIO_SECONDS[file],
    };
    const list = byPrefix.get(prefix);
    if (list) list.push(asset);
    else byPrefix.set(prefix, [asset]);
  }

  const groups = [...byPrefix.entries()].map(([prefix, assets]) => ({
    id: AUDIO_SECTIONS[prefix]?.slug ?? `audio-${prefix.toLowerCase()}`,
    name: AUDIO_SECTIONS[prefix]?.name ?? titleCase(prefix),
    section: 'Audio',
    blurb: '',
    importPath: "import { audioUrls } from '@udtc/assets/audio';",
    assets: assets.sort((a, b) => a.name.localeCompare(b.name)),
  }));

  // The two hand-maintained effects are not part of the generated official table — they live in
  // `@udtc/assets/audio-effects` for exactly that reason, and get their own group so the split is
  // visible rather than folded away.
  groups.push({
    id: 'audio-effects',
    name: 'Effects',
    section: 'Audio',
    blurb:
      'Hand-maintained rather than extracted from the firmware, so they sit outside the generated ' +
      'sound-library table and ship from a separate module.',
    importPath: "import { drumRotationSoundUrl } from '@udtc/assets/audio-effects';",
    assets: [
      {
        id: 'drumCalibration',
        name: 'Drum Calibration',
        file: 'audio/drumCalibration.ogg',
        kind: 'audio',
        url: calibrationSoundUrl,
        seconds: AUDIO_SECONDS['drumCalibration.ogg'],
      },
      {
        id: 'drumRotation',
        name: 'Drum Rotation',
        file: 'audio/drumRotation.ogg',
        kind: 'audio',
        url: drumRotationSoundUrl,
        seconds: AUDIO_SECONDS['drumRotation.ogg'],
      },
    ],
  });

  return groups.sort((a, b) => a.name.localeCompare(b.name));
}

// ── the registry ───────────────────────────────────────────────────────────────────────────────

export const ART_GROUPS: ArtGroup[] = [
  {
    id: 'board',
    name: 'Board art',
    section: 'Board & models',
    blurb:
      'The game board, in two resolutions of the same artwork. Board geometry is ' +
      'resolution-independent — BOARD_IMAGE_INFO is normalized [0,1] — so the small variant ' +
      'annotates identically to the full-resolution original.',
    importPath: "import { boardSmall } from '@udtc/assets/board-small';",
    assets: [
      {
        id: 'board-small',
        name: 'Board (1400², small)',
        file: 'board/board-small.jpg',
        kind: 'image',
        url: boardSmall,
      },
      {
        id: 'board',
        name: 'Board (4096², full)',
        file: 'board/board.png',
        kind: 'image',
        url: boardFullPng,
        heavy: true,
        preview: boardSmall,
      },
    ],
  },
  {
    id: 'models',
    name: '3D models',
    section: 'Board & models',
    blurb:
      'Draco-compressed GLB. There is no viewer here on purpose — `pnpm dev:board` renders the ' +
      'tower in a real scene with lighting and drum animation, which is a better look at it than ' +
      'a thumbnail could be.',
    importPath: "import { towerGlb } from '@udtc/assets/models';",
    assets: [
      { id: 'tower', name: 'Tower', file: 'models/tower.glb', kind: 'model', url: towerGlb },
    ],
  },
  ...tokenGroups(),
  ...audioGroups(),
  {
    id: 'glyphs',
    name: 'Glyphs',
    section: 'Glyphs',
    blurb:
      'The five drum glyphs, keyed to match GLYPHS in ultimatedarktowerdata. `glyphSvg` is a ' +
      'Record rather than a path convention so a renamed glyph is a compile error, not a silently ' +
      'broken image.',
    importPath: "import { glyphSvg } from '@udtc/assets/glyphs';",
    assets: [
      ...Object.entries(glyphSvg).map(([name, url]): Asset => ({
        id: name,
        name: titleCase(name),
        file: `glyphs/${name}.svg`,
        kind: 'image',
        url,
      })),
      {
        id: 'all-glyphs',
        name: 'All glyphs (plate)',
        file: 'glyphs/all_glyphs.svg',
        kind: 'image',
        url: allGlyphsSvg,
      },
      {
        id: 'glyphs-sheet',
        name: 'Glyph sprite sheet',
        file: 'glyphs/glyphs.png',
        kind: 'image',
        url: glyphsPng,
      },
    ],
  },
];

export const ART_GROUP_BY_ID = new Map(ART_GROUPS.map((g) => [g.id, g]));

export const ART_SECTION_ORDER = [...new Set(ART_GROUPS.map((g) => g.section))];

export const ALL_ASSETS: (Asset & { group: ArtGroup })[] = ART_GROUPS.flatMap((group) =>
  group.assets.map((a) => ({ ...a, group })),
);

/** Every art file in the package, for the tile counts and the home page. */
export const TOTAL_ASSETS = ALL_ASSETS.length;

/**
 * Named `searchArt` because `search.ts` exports `searchAll` for the dataset registry.
 *
 * Matches `name` and `file` only, where the dataset search scans a full JSON haystack
 * (`search.ts:18-25`). That is complete rather than lazy: an art record has no other text.
 */
export function searchArt(query: string): (Asset & { group: ArtGroup })[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_ASSETS.filter(
    (a) => a.name.toLowerCase().includes(q) || a.file.toLowerCase().includes(q),
  );
}
