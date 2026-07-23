import type { BoardState, LocationName } from './boardState';
import type { BoardCommand } from './commands';

/**
 * The kind carried on a token event — a reserved built-in type id (`hero`/`foe`/
 * `adversary`/`building`/`skull`/`monument`/`marker`/`quest`) or an author-defined
 * `library.tokenTypes` key. Open (not the old closed `'hero'|'foe'|'adversary'` union)
 * because `tokenAdded`/`tokenMoved`/`tokenRemoved` now fire uniformly for every token kind,
 * not just the three that used to be tracked as named buckets.
 */
export type TokenKind = string;

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
  | { type: 'tokenChanged'; kind: TokenKind; id: string }
  | { type: 'selectionChanged'; selections: BoardState['selections'] };

export type BoardEventType = BoardEvent['type'];

/** A listener over the full event firehose. */
export type BoardEventListener = (event: BoardEvent) => void;
