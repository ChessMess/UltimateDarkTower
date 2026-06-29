/**
 * Local re-export shim for the reference data this app consumes from `ultimatedarktower`.
 *
 * As of UDT v5.0.0 that data moved off the flat root API into the `data` / `seed`
 * namespaces. This shim destructures the members we use back to flat names so the rest
 * of the app keeps importing them unchanged — just from here instead of the package root.
 * (Tower-control symbols like `TowerState` / `createDefaultTowerState` are unchanged and
 * should still be imported directly from `'ultimatedarktower'`.)
 */
import { data, seed } from 'ultimatedarktower';

// Board geometry.
export const { BOARD_LOCATIONS } = data.board;

// Hero roster.
export const { HEROES, HERO_BY_ID } = data.heroes;

// Foe status + foe/adversary metadata.
export const { FOES, FOE_BY_ID, FOE_BY_NAME, ADVERSARY_ROSTER, FOE_STATUSES } = data.foes;

// Seed encode/decode.
export const { decodeSeed, createSeed } = seed;
export type Difficulty = seed.Difficulty;
export type SeedConfig = seed.SeedConfig;
