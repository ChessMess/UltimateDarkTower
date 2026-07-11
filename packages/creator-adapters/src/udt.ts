// UDT v5.0.0 reference layer — the only module in this repo that imports from ultimatedarktower.
// All other packages that need UDT data go through this module.
//
// v5 reorganised the flat v4 exports into `data.*` / `seed.*` namespaces (foes, heroes, board,
// tiers). GLYPHS / TOWER_LIGHT_SEQUENCES / TOWER_AUDIO_LIBRARY and the SealIdentifier /
// SoundCategory types remain top-level (`export * from './udtConstants'`). This module maps them
// back to the same flat `UDTReferenceLayer` shape so downstream (resolver, engine) is unchanged.

import {
  data,
  seed,
  GLYPHS,
  TOWER_LIGHT_SEQUENCES,
  TOWER_AUDIO_LIBRARY,
} from 'ultimatedarktower';

const { FOE_BY_ID, ADVERSARY_ROSTER, ALL_FOES, FOES } = data.foes;
const { HEROES, HERO_BY_ID } = data.heroes;
const { BOARD_LOCATIONS, BOARD_LOCATION_BY_NAME } = data.board;
const { TIER1_FOES, TIER2_FOES, TIER3_FOES, ADVERSARIES, ALLIES } = seed;

export type Foe = data.foes.Foe;
export type FoeId = data.foes.FoeId;
export type FoeName = data.foes.FoeName;
export type FoeLevel = data.foes.FoeLevel;
export type Hero = data.heroes.Hero;
export type HeroId = data.heroes.HeroId;
export type BoardLocation = data.board.BoardLocation;
export type BoardKingdom = data.board.BoardKingdom;
export type Tier1Foe = seed.Tier1Foe;
export type Tier2Foe = seed.Tier2Foe;
export type Tier3Foe = seed.Tier3Foe;
export type Adversary = seed.Adversary;
export type Ally = seed.Ally;
export type { SoundCategory, SealIdentifier } from 'ultimatedarktower';

export interface UDTReferenceLayer {
  foeById: typeof FOE_BY_ID;
  adversaryRoster: typeof ADVERSARY_ROSTER;
  allFoes: typeof ALL_FOES;
  foes: typeof FOES;
  heroes: typeof HEROES;
  heroById: typeof HERO_BY_ID;
  boardLocations: typeof BOARD_LOCATIONS;
  boardLocationByName: typeof BOARD_LOCATION_BY_NAME;
  glyphs: typeof GLYPHS;
  lightSequences: typeof TOWER_LIGHT_SEQUENCES;
  audioLibrary: typeof TOWER_AUDIO_LIBRARY;
  tier1Foes: typeof TIER1_FOES;
  tier2Foes: typeof TIER2_FOES;
  tier3Foes: typeof TIER3_FOES;
  adversaries: typeof ADVERSARIES;
  allies: typeof ALLIES;
}

export function getUDTReferenceLayer(): UDTReferenceLayer {
  return {
    foeById: FOE_BY_ID,
    adversaryRoster: ADVERSARY_ROSTER,
    allFoes: ALL_FOES,
    foes: FOES,
    heroes: HEROES,
    heroById: HERO_BY_ID,
    boardLocations: BOARD_LOCATIONS,
    boardLocationByName: BOARD_LOCATION_BY_NAME,
    glyphs: GLYPHS,
    lightSequences: TOWER_LIGHT_SEQUENCES,
    audioLibrary: TOWER_AUDIO_LIBRARY,
    tier1Foes: TIER1_FOES,
    tier2Foes: TIER2_FOES,
    tier3Foes: TIER3_FOES,
    adversaries: ADVERSARIES,
    allies: ALLIES,
  };
}
