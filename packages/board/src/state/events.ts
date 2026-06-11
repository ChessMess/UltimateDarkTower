import type { BoardState, BuildingState, LocationName, SpaceMarker } from './boardState';
import type { BoardCommand } from './commands';

/** The instance-token kinds carried on the board (heroes, foes, and the singleton adversary). */
export type TokenKind = 'hero' | 'foe' | 'adversary';

/**
 * The event surface a `BoardStateController` emits.
 *
 * `change` is the firehose — it fires on every applied command (or wholesale
 * `applyState`) carrying the resulting state. The remaining events are
 * conveniences derived from the command, so a consumer can subscribe narrowly.
 * (Focus/view events belong to the renderers/view in M2, not here.)
 */
export type BoardEvent =
  | { type: 'change'; state: BoardState; command: BoardCommand }
  | {
      type: 'tokenAdded' | 'tokenMoved' | 'tokenRemoved';
      kind: TokenKind;
      id: string;
      location?: LocationName;
    }
  | { type: 'buildingChanged'; location: LocationName; building: BuildingState }
  | { type: 'spaceMarkerChanged'; location: LocationName; markers: SpaceMarker[] }
  | { type: 'selectionChanged'; selections: BoardState['selections'] };

export type BoardEventType = BoardEvent['type'];

/** A listener over the full event firehose. */
export type BoardEventListener = (event: BoardEvent) => void;
