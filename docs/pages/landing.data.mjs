// Editorial data for the landing page (docs/pages/index.html).
//
// This is the ONLY hand-maintained input for the page. Everything that can go
// stale — version, latest commit, npm-published state, docs/README links — is
// derived at build time by scripts/pages/build-landing.mjs from each package's
// package.json + git history + on-disk files. Edit titles/blurbs/order here.
//
//   dir      workspace path; keys into package.json + `git log` lookups
//   title    display name on the card
//   blurb    one-line description
//   demo     path under the Pages site (./<demo>/), or null if no live demo
//   glyph    one of the tower drum glyphs: battle | banner | cleanse | quest | reinforce
//            (accent icon on every card; the full tile for demo-less components)
//   image    screenshot in media/thumbs/<image>, or null to fall back to a glyph tile
//   status   optional override of the auto-derived Alpha/Beta/Released label
//
// Status is auto-derived from the version: >=1.0 Released, 0.5–<1.0 Beta, <0.5 Alpha.

export const repo = 'ChessMess/UltimateDarkTower';

export const site = {
  title: 'Ultimate Dark Tower',
  tagline:
    'A TypeScript ecosystem for Restoration Games’ Return to Dark Tower — one monorepo of libraries, renderers, and companion apps.',
};

export const components = [
  // ── Libraries ──────────────────────────────────────────────────────────
  {
    dir: 'packages/core',
    title: 'Tower Core',
    blurb: 'BLE driver + core library that talks to the physical tower over Web Bluetooth.',
    category: 'library',
    demo: 'controller',
    glyph: 'battle',
    image: 'ble-connection.png',
  },
  {
    dir: 'packages/display',
    title: 'Tower Display',
    blurb: 'Composable text, 2D, and 3D renderers for live tower state — with skull physics.',
    category: 'library',
    demo: 'display',
    glyph: 'quest',
    image: 'display.jpg',
  },
  {
    dir: 'packages/board',
    title: 'Tower Board',
    blurb:
      'A 2d and 3d visualizer for displaying heros, foes, quest markers and more on the game board. Easily render an entire games state on the board from a Json string.',
    category: 'library',
    demo: 'board',
    glyph: 'banner',
    image: 'board.jpg',
    status: 'beta',
  },

  // ── Apps ───────────────────────────────────────────────────────────────
  {
    dir: 'apps/controller',
    title: 'Tower Controller',
    blurb:
      'Connect over Bluetooth and drive a real tower — rotate drums, light seals, play sounds. Includes a 3D emulator for hardware-free exploration.',
    category: 'app',
    demo: 'controller',
    glyph: 'reinforce',
    image: 'controller.jpg',
    status: 'released',
  },
  {
    dir: 'apps/creator',
    title: 'Scenario Creator',
    blurb:
      'Create custom Return To Dark Tower Scenarios with simple drag-n-drop! Build custom decks, dungeons, quests, rules, and events. Design the game you want to play!',
    category: 'app',
    demo: 'creator',
    glyph: 'quest',
    image: 'creator.jpg',
  },
  {
    dir: 'apps/player',
    title: 'Scenario Player',
    blurb:
      'Plays custom Return to Dark Tower scenarios! Scenarios authored with the creator come to life here in the player!',
    category: 'app',
    demo: 'player',
    glyph: 'battle',
    image: 'player.jpg',
  },
  {
    dir: 'apps/digital',
    title: 'Digital Play',
    blurb:
      'Wish you could play the game without having to set it up? Play Return to Dark Tower completely digitally with this! ',
    category: 'app',
    demo: 'digital',
    glyph: 'banner',
    image: 'digital.jpg',
  },
  {
    dir: 'apps/seed',
    title: 'Seed Decoder',
    blurb: 'This utility app lets you decode Return to Dark Tower game seeds and tower state.',
    category: 'app',
    demo: 'seed',
    glyph: 'cleanse',
    image: 'seed.jpg',
  },
  {
    dir: 'apps/sync',
    title: 'Dark Tower Sync',
    blurb: 'Browser client for the relay — mirror relayed commands onto your physical tower.',
    category: 'app',
    demo: 'sync',
    glyph: 'reinforce',
    image: 'sync.jpg',
  },
  {
    dir: 'apps/relay-cli',
    title: 'Relay CLI',
    blurb: 'Headless relay daemon (BLE emulator + WebSocket) for servers, a Pi, or Docker.',
    category: 'app',
    demo: null,
    glyph: 'reinforce',
    image: null,
  },
  {
    dir: 'apps/relay-electron',
    title: 'Relay Console',
    blurb:
      'Electron operator console over the relay core — source select, status, manual controls.',
    category: 'app',
    demo: null,
    glyph: 'battle',
    image: null,
  },
  {
    dir: 'apps/game',
    title: 'Tower Game',
    blurb:
      "The Tower's Challenge — a solo web game: outguess the tower's glyph picks across six months to save the kingdom.",
    category: 'app',
    demo: 'game',
    glyph: 'battle',
    image: 'game.jpg',
    status: 'released',
  },
];
