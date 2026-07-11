import type { BoardKingdom } from '../data/udtReexports';
import type {
  BoardState,
  FoeId,
  FoeStatus,
  HeroId,
  LocationName,
  QuestMarker,
  SpaceMarker,
} from './boardState';

/**
 * The command vocabulary the reducer understands — the *only* mutations. A
 * discriminated union on `type`. Commands are faithful instructions: the reducer
 * applies them as-is and enforces no game rules (the board is a dumb container).
 */
export type BoardCommand =
  | { type: 'placeHero'; heroId: HeroId; location: LocationName; owner?: BoardKingdom }
  | { type: 'moveHero'; heroId: HeroId; location: LocationName }
  | { type: 'removeHero'; heroId: HeroId }
  | { type: 'spawnFoe'; foeId: FoeId; foe: string; location: LocationName; status?: FoeStatus }
  | { type: 'moveFoe'; foeId: FoeId; location: LocationName }
  | { type: 'setFoeStatus'; foeId: FoeId; status: FoeStatus }
  | { type: 'removeFoe'; foeId: FoeId }
  | { type: 'selectAdversary'; id: string }
  | { type: 'placeAdversary'; location: LocationName }
  | { type: 'clearAdversary' }
  | { type: 'addSkull'; location: LocationName; n?: number } // default 1
  | { type: 'removeSkull'; location: LocationName; n?: number } // default 1
  | { type: 'setSkulls'; location: LocationName; n: number }
  | { type: 'destroyBuilding'; location: LocationName }
  | { type: 'restoreBuilding'; location: LocationName }
  | { type: 'setMonument'; location: LocationName; monumentId: string | null }
  | { type: 'setSpaceMarker'; location: LocationName; marker: SpaceMarker; on: boolean }
  | { type: 'setQuestMarker'; location: LocationName; marker: QuestMarker; on: boolean }
  | { type: 'setSelections'; selections: BoardState['selections'] } // shallow-merge
  | { type: 'replaceState'; state: BoardState }
  | { type: 'reset' };

export type BoardCommandType = BoardCommand['type'];
