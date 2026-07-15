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
    dir: 'apps/game',
    title: 'Tower Game',
    blurb:
      "The Tower's Challenge — an example web game: outguess the tower's glyph picks across six months to save the kingdom.",
    category: 'app',
    demo: 'game',
    glyph: 'battle',
    image: 'game.jpg',
    status: 'released',
  },
  {
    dir: 'apps/relay-cli',
    title: 'Relay CLI',
    blurb:
      'An always-on background service that connects your tower to the network — built for a Raspberry Pi, server, or Docker container with no screen attached.',
    category: 'app',
    demo: null,
    glyph: 'reinforce',
    image: null,
  },
  {
    dir: 'apps/relay-electron',
    title: 'Relay Console',
    blurb:
      'The point-and-click way to run a tower relay — pick a source, watch its status, and send manual commands without touching a terminal.',
    category: 'app',
    demo: null,
    glyph: 'battle',
    image: null,
  },
  {
    dir: 'apps/mcp-server',
    title: 'Tower MCP Server',
    blurb:
      'Point Claude, ChatGPT, or any MCP client at your tower — 34 tools for lights, sounds, drums, and seals, with the game rules bundled as context.',
    category: 'app',
    demo: null,
    glyph: 'cleanse',
    image: null,
  },

  // ── Libraries ──────────────────────────────────────────────────────────
  {
    dir: 'packages/core',
    title: 'Tower Core',
    blurb:
      'The TypeScript library that connects to a real tower over Bluetooth — rotate drums, light seals, play sounds, and track glyphs from your own app.',
    category: 'library',
    demo: 'controller',
    glyph: 'battle',
    image: 'ble-connection.png',
  },
  {
    dir: 'packages/display',
    title: 'Tower Display',
    blurb:
      "Turns your tower's live state into visuals — plain text, a 2D diagram, or a full 3D model, skull physics included.",
    category: 'library',
    demo: 'display',
    glyph: 'quest',
    image: 'display.jpg',
  },
  {
    dir: 'packages/board',
    title: 'Tower Board',
    blurb:
      'Renders the whole game board in 2D or 3D — heroes, foes, quest markers, and more — straight from a JSON game state.',
    category: 'library',
    demo: 'board',
    glyph: 'banner',
    image: 'board.jpg',
    status: 'beta',
  },
];
