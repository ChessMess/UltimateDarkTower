/**
 * Local re-export shim for the reference data this app consumes.
 *
 * As of v6.0.0 this data moved out of `ultimatedarktower` into `ultimatedarktowerdata` — a
 * zero-dependency package with no Bluetooth, exported flat (no more `data` / `seed`
 * namespaces). This shim exists so the rest of the app keeps importing these names
 * unchanged — just from here instead of directly from the data package.
 * (Tower-control symbols like `TowerState` / `createDefaultTowerState` are unchanged and
 * should still be imported directly from `'ultimatedarktower'`.)
 */
export {
  // Board geometry.
  BOARD_LOCATIONS,

  // Hero roster.
  HEROES,
  HERO_BY_ID,

  // Foe status + foe/adversary metadata.
  FOES,
  FOE_BY_ID,
  FOE_BY_NAME,
  ADVERSARY_ROSTER,
  FOE_STATUSES,

  // Seed encode/decode.
  decodeSeed,
  createSeed,
  type Difficulty,
  type SeedConfig,
} from 'ultimatedarktowerdata';
