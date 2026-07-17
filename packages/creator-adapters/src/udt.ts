// UDT reference layer — the module in this repo that imports the RtDT reference data
// (board/hero/foe rosters, seed enums, glyphs/light-sequences/audio-library names) from
// `ultimatedarktowerdata`. Other packages that need this data go through this module.
//
// v6.0.0: this data moved out of `ultimatedarktower` (which no longer ships it) into
// `ultimatedarktowerdata`, a zero-dependency package with no Bluetooth — exported flat, no
// more `data.*` / `seed.*` namespaces. `SealIdentifier` is a BLE/hardware type (calibrated
// drum position) and stays in `ultimatedarktower`; `SoundCategory` moved with the audio
// library. This module maps everything to the same flat `UDTReferenceLayer` shape so
// downstream (resolver, engine) is unchanged.

import {
  FOE_BY_ID,
  ADVERSARY_ROSTER,
  ALL_FOES,
  FOES,
  HEROES,
  HERO_BY_ID,
  BOARD_LOCATIONS,
  BOARD_LOCATION_BY_NAME,
  BOARD_ANCHORS,
  BOARD_ADJACENCY,
  BOARD_IMAGE_INFO,
  GLYPHS,
  TOWER_LIGHT_SEQUENCES,
  TOWER_AUDIO_LIBRARY,
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  ADVERSARIES,
  ALLIES,
  type Foe,
  type FoeId,
  type FoeName,
  type FoeLevel,
  type Hero,
  type HeroId,
  type BoardLocation,
  type BoardKingdom,
  type Tier1Foe,
  type Tier2Foe,
  type Tier3Foe,
  type Adversary,
  type Ally,
  type SoundCategory,
} from 'ultimatedarktowerdata';
import type { SealIdentifier } from 'ultimatedarktower';

export type {
  Foe,
  FoeId,
  FoeName,
  FoeLevel,
  Hero,
  HeroId,
  BoardLocation,
  BoardKingdom,
  Tier1Foe,
  Tier2Foe,
  Tier3Foe,
  Adversary,
  Ally,
  SoundCategory,
  SealIdentifier,
};

export interface UDTReferenceLayer {
  foeById: typeof FOE_BY_ID;
  adversaryRoster: typeof ADVERSARY_ROSTER;
  allFoes: typeof ALL_FOES;
  foes: typeof FOES;
  heroes: typeof HEROES;
  heroById: typeof HERO_BY_ID;
  boardLocations: typeof BOARD_LOCATIONS;
  boardLocationByName: typeof BOARD_LOCATION_BY_NAME;
  /** Layout anchors / movement graph / image metadata for the built-in RtDT board. Exposed so
   *  browser consumers (the Creator's RtDT board preset) can read them without importing
   *  `ultimatedarktowerdata` — or `ultimatedarktowerboard`, whose entry re-exports it — directly. */
  boardAnchors: typeof BOARD_ANCHORS;
  boardAdjacency: typeof BOARD_ADJACENCY;
  boardImageInfo: typeof BOARD_IMAGE_INFO;
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
    boardAnchors: BOARD_ANCHORS,
    boardAdjacency: BOARD_ADJACENCY,
    boardImageInfo: BOARD_IMAGE_INFO,
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
