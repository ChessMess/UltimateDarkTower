// UDT v4.1.0 reference layer — the only module in this repo that imports from ultimatedarktower.
// All other packages that need UDT data go through this module.

import {
  FOE_BY_ID,
  ADVERSARY_ROSTER,
  ALL_FOES,
  FOES,
  HEROES,
  HERO_BY_ID,
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  GLYPHS,
  TOWER_LIGHT_SEQUENCES,
  TOWER_AUDIO_LIBRARY,
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES,
  ALLIES,
} from 'ultimatedarktower';

export type { Foe, FoeId, FoeName, FoeLevel, Hero, HeroId, BoardLocation, BoardKingdom, SoundCategory, SealIdentifier, Tier1Foe, Tier2Foe, Tier3Foe, Adversary, Ally } from 'ultimatedarktower';

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
