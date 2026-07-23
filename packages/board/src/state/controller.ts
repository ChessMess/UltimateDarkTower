import type { BoardKingdom } from '../data/udtReexports';
import type { BoardState, FoeStatus, LocationName, PlacedToken } from './boardState';
import {
  ADVERSARY_TOKEN_ID,
  buildingTokenId,
  createDefaultBoardState,
  markerTokenId,
  monumentTokenId,
  questTokenId,
  skullTokenId,
} from './boardState';
import type { BoardCommand } from './commands';
import { applyBoardCommand } from './reducer';
import type { BoardEvent, BoardEventListener, BoardEventType, TokenKind } from './events';
import { createEmitter } from '../util/emitter';

export interface BoardStateControllerOptions {
  /** Starting state. Defaults to `createDefaultBoardState()`. */
  initial?: BoardState;
  /** `self` (uncontrolled — default): the controller owns the truth. `host` (controlled): the host does. */
  mode?: 'self' | 'host';
}

/**
 * Holds the current `BoardState`, runs the pure reducer on each dispatch, and
 * emits events. DOM-free — instantiable in tests with no environment.
 *
 * Mode semantics:
 * - **`self`** (default): `dispatch`/named methods/`reset` run the reducer, replace
 *   the held state, then emit `change` plus the derived specific event(s).
 * - **`host`**: the host owns the truth. `dispatch` computes the projected next state
 *   and emits it as a `change` *intent* without mutating held state; only
 *   `applyState(next)` commits. Same `applyState` is the commit path in both modes.
 *
 * ## Named methods over the generic ops
 *
 * `BoardState` is one `tokens` collection keyed by instance id, and the reducer
 * understands only five generic commands (`placeToken`/`moveToken`/`removeToken`/
 * `updateToken`/`setSelections`, plus `replaceState`/`reset`). The named methods below
 * (`placeHero`, `spawnFoe`, `setSpaceMarker`, …) are the pre-0.5.0 public surface,
 * reimplemented over those generic ops with deterministic per-kind token ids so callers
 * (and `@udtc/adapters`' `BoardCtrl`) need no change:
 *
 * | Kind | Token id | `art` |
 * | --- | --- | --- |
 * | hero | the hero id itself | the hero id (explicit — see {@link PlacedToken}) |
 * | foe | the caller's instance id | the foe *type* |
 * | adversary | the fixed {@link ADVERSARY_TOKEN_ID} singleton | the adversary's identity |
 * | building | the location name | — |
 * | skull | `skull:{location}` | — (`n` carries the count) |
 * | monument | `monument:{location}` | the monument's identity |
 * | marker | `marker:{location}:{name}` | the marker name |
 * | quest | `quest:{location}:{name}` | the quest name |
 *
 * The adversary is the one singleton with a separate public identity: `selectAdversary`/
 * `placeAdversary` read-then-upsert the fixed-id token (preserving whichever half — id or
 * location — was already set), and its `tokenAdded`/`tokenMoved`/`tokenRemoved` events report
 * the identity (`art`) as `id`, not the internal `'adversary'` key.
 */
export class BoardStateController {
  private state: BoardState;
  private readonly mode: 'self' | 'host';
  private readonly events = createEmitter<BoardEvent>();

  constructor(options: BoardStateControllerOptions = {}) {
    this.state = options.initial ?? createDefaultBoardState();
    this.mode = options.mode ?? 'self';
  }

  getState(): BoardState {
    return this.state;
  }

  /** Wholesale-set the held state (bypasses the reducer) and emit `change`. The commit path in both modes. */
  applyState(next: BoardState): void {
    this.state = next;
    this.events.emit({
      type: 'change',
      state: next,
      command: { type: 'replaceState', state: next },
    });
  }

  /**
   * Apply a command. In `self` mode this updates `getState()` and emits the
   * specific event(s); in `host` mode it leaves held state untouched and emits
   * only the projected `change` intent. Returns the resulting (or projected) state.
   */
  dispatch(command: BoardCommand): BoardState {
    const prev = this.state;
    const next = applyBoardCommand(prev, command);

    if (this.mode === 'self') {
      this.state = next;
      this.events.emit({ type: 'change', state: next, command });
      for (const event of deriveSpecificEvents(command, prev, next)) {
        this.events.emit(event);
      }
    } else {
      this.events.emit({ type: 'change', state: next, command });
    }
    return next;
  }

  reset(): void {
    this.dispatch({ type: 'reset' });
  }

  /** Subscribe to the full event firehose. Returns an unsubscribe function. */
  subscribe(listener: BoardEventListener): () => void {
    return this.events.subscribe(listener);
  }

  /** Subscribe to a single event type. Returns an unsubscribe function. */
  on<T extends BoardEventType>(
    type: T,
    listener: (event: Extract<BoardEvent, { type: T }>) => void,
  ): () => void {
    return this.subscribe((event) => {
      if (event.type === type) {
        listener(event as Extract<BoardEvent, { type: T }>);
      }
    });
  }

  // ── generic token ops (also the adapter's `board.mutate: placeToken/removeToken` target) ──

  /** Place any token (reserved kind or a `library.tokenTypes` id). Mints an instance id and upserts. */
  placeToken(opts: {
    id?: string;
    typeId: string;
    location: LocationName;
    spotId?: string;
    art?: string;
    n?: number;
    data?: Record<string, unknown>;
  }): string {
    const id = opts.id ?? defaultTokenId(opts.typeId, this.state);
    this.dispatch({
      type: 'placeToken',
      id,
      typeId: opts.typeId,
      location: opts.location,
      spotId: opts.spotId,
      art: opts.art,
      n: opts.n,
      data: opts.data,
    });
    return id;
  }

  /**
   * Remove every token of `typeId` at `location` — mirrors the engine's own directive
   * filter (`state.tokens.filter(t => !(t.tokenTypeId === typeId && target === location))`),
   * since the `board.mutate: removeToken` directive carries no instance id.
   */
  removeToken(typeId: string, location: LocationName): void {
    for (const token of Object.values(this.state.tokens)) {
      if (token.typeId === typeId && token.location === location) {
        this.dispatch({ type: 'removeToken', id: token.id });
      }
    }
  }

  // ── Ergonomic named methods — thin wrappers over the generic ops (see the class doc). ──

  placeHero(heroId: string, location: LocationName, owner?: BoardKingdom): void {
    this.dispatch({
      type: 'placeToken',
      id: heroId,
      typeId: 'hero',
      location,
      art: heroId,
      data: owner !== undefined ? { owner } : undefined,
    });
  }
  moveHero(heroId: string, location: LocationName): void {
    this.dispatch({ type: 'moveToken', id: heroId, location });
  }
  removeHero(heroId: string): void {
    this.dispatch({ type: 'removeToken', id: heroId });
  }
  spawnFoe(foeId: string, foe: string, location: LocationName, status?: FoeStatus): void {
    this.dispatch({
      type: 'placeToken',
      id: foeId,
      typeId: 'foe',
      location,
      art: foe,
      data: { status: status ?? 'ready' },
    });
  }
  moveFoe(foeId: string, location: LocationName): void {
    this.dispatch({ type: 'moveToken', id: foeId, location });
  }
  /**
   * Move whichever token carries `id` to `location`, resolving its kind from current state.
   * `tokens` is one flat, globally-id-keyed map, so a hero and a foe can no longer occupy the
   * same id (unlike the pre-0.5.0 per-kind buckets) — the only remaining ambiguity is a
   * hero/foe instance id that happens to equal the adversary's identity, and the token
   * occupying that id wins (checked before the adversary). Returns the kind moved, or `null`
   * if nothing matches (a no-op — nothing is dispatched, no event fires). The adversary
   * matches only when one exists whose identity (`art`) equals `id`, so this never creates
   * an adversary.
   */
  moveToken(id: string, location: LocationName): TokenKind | null {
    const s = this.getState();
    if (s.tokens[id]?.typeId === 'hero') {
      this.moveHero(id, location);
      return 'hero';
    }
    if (s.tokens[id]?.typeId === 'foe') {
      this.moveFoe(id, location);
      return 'foe';
    }
    const adversary = s.tokens[ADVERSARY_TOKEN_ID];
    if (adversary && adversary.art && adversary.art === id) {
      this.placeAdversary(location);
      return 'adversary';
    }
    return null;
  }
  setFoeStatus(foeId: string, status: FoeStatus): void {
    // No existence pre-check — dispatch unconditionally, matching every other named method
    // (moveHero/moveFoe/removeHero/removeFoe, …). `updateToken`'s own no-op-on-unknown-id
    // guard keeps state correct either way; skipping dispatch here would additionally suppress
    // the `change` event that those sibling no-ops still fire.
    this.dispatch({ type: 'updateToken', id: foeId, patch: { data: { status } } });
  }
  removeFoe(foeId: string): void {
    this.dispatch({ type: 'removeToken', id: foeId });
  }
  /** Upserts the singleton adversary token, preserving its location if already placed. */
  selectAdversary(id: string): void {
    const existing = this.state.tokens[ADVERSARY_TOKEN_ID];
    this.dispatch({
      type: 'placeToken',
      id: ADVERSARY_TOKEN_ID,
      typeId: 'adversary',
      location: existing?.location ?? '',
      art: id,
    });
  }
  /** Upserts the singleton adversary token, preserving its identity if already selected. */
  placeAdversary(location: LocationName): void {
    const existing = this.state.tokens[ADVERSARY_TOKEN_ID];
    this.dispatch({
      type: 'placeToken',
      id: ADVERSARY_TOKEN_ID,
      typeId: 'adversary',
      location,
      art: existing?.art ?? '',
    });
  }
  clearAdversary(): void {
    this.dispatch({ type: 'removeToken', id: ADVERSARY_TOKEN_ID });
  }
  addSkull(location: LocationName, n?: number): void {
    this.upsertSkull(location, (current) => current + (n ?? 1));
  }
  removeSkull(location: LocationName, n?: number): void {
    this.upsertSkull(location, (current) => Math.max(0, current - (n ?? 1)));
  }
  setSkulls(location: LocationName, n: number): void {
    this.upsertSkull(location, () => n);
  }
  private upsertSkull(location: LocationName, nextCount: (current: number) => number): void {
    const id = skullTokenId(location);
    const existing = this.state.tokens[id];
    const n = nextCount(existing?.n ?? 0);
    if (existing) {
      this.dispatch({ type: 'updateToken', id, patch: { n } });
    } else {
      this.dispatch({ type: 'placeToken', id, typeId: 'skull', location, n });
    }
  }
  destroyBuilding(location: LocationName): void {
    this.upsertBuildingFlag(location, { destroyed: true });
  }
  restoreBuilding(location: LocationName): void {
    this.upsertBuildingFlag(location, { destroyed: false });
  }
  setMonument(location: LocationName, monumentId: string | null): void {
    const id = monumentTokenId(location);
    if (monumentId == null) {
      this.dispatch({ type: 'removeToken', id });
    } else {
      this.dispatch({ type: 'placeToken', id, typeId: 'monument', location, art: monumentId });
    }
  }
  private upsertBuildingFlag(location: LocationName, patch: Record<string, unknown>): void {
    const id = buildingTokenId(location);
    const existing = this.state.tokens[id];
    if (existing) {
      this.dispatch({ type: 'updateToken', id, patch: { data: patch } });
    } else {
      this.dispatch({ type: 'placeToken', id, typeId: 'building', location, data: patch });
    }
  }
  setSpaceMarker(location: LocationName, marker: string, on: boolean): void {
    const id = markerTokenId(location, marker);
    if (on) {
      this.dispatch({ type: 'placeToken', id, typeId: 'marker', location, art: marker });
    } else {
      this.dispatch({ type: 'removeToken', id });
    }
  }
  setQuestMarker(location: LocationName, marker: string, on: boolean): void {
    const id = questTokenId(location, marker);
    if (on) {
      this.dispatch({ type: 'placeToken', id, typeId: 'quest', location, art: marker });
    } else {
      this.dispatch({ type: 'removeToken', id });
    }
  }
  setSelections(selections: BoardState['selections']): void {
    this.dispatch({ type: 'setSelections', selections });
  }
}

/** `foe-N` against the current state — the pre-0.5.0 default for an unsupplied instance id. */
function defaultTokenId(typeId: string, state: BoardState): string {
  let n = 1;
  while (`${typeId}-${n}` in state.tokens) n++;
  return `${typeId}-${n}`;
}

/**
 * Derives the specific (non-`change`) events for an applied command. Pure; reads the
 * prior/next state so removals report accurate identities and no-ops emit nothing. The
 * adversary singleton reports its identity (`art`) as `id`, not the internal token key —
 * see the class doc.
 */
function deriveSpecificEvents(
  command: BoardCommand,
  prev: BoardState,
  next: BoardState,
): BoardEvent[] {
  switch (command.type) {
    case 'placeToken': {
      // Upsert: `tokenAdded` the first time an id is placed, `tokenMoved` on a re-placement —
      // this is what lets `selectAdversary`/`placeAdversary` (both upsert the same singleton
      // token) report the right event without the reducer knowing which public method it was.
      const existed = command.id in prev.tokens;
      const token = next.tokens[command.id];
      return [{ type: existed ? 'tokenMoved' : 'tokenAdded', ...tokenEventFields(token) }];
    }
    case 'moveToken': {
      const token = next.tokens[command.id];
      return token ? [{ type: 'tokenMoved', ...tokenEventFields(token) }] : [];
    }
    case 'removeToken': {
      const token = prev.tokens[command.id];
      return token ? [{ type: 'tokenRemoved', ...tokenEventFields(token) }] : [];
    }
    case 'updateToken': {
      const token = next.tokens[command.id];
      return token ? [{ type: 'tokenChanged', kind: token.typeId, id: eventIdentity(token) }] : [];
    }
    case 'setSelections':
      return [{ type: 'selectionChanged', selections: next.selections }];
    case 'replaceState':
    case 'reset':
      return [];
  }
}

/** The adversary singleton reports its identity (`art`); every other token reports its own id. */
function eventIdentity(token: PlacedToken): string {
  return token.id === ADVERSARY_TOKEN_ID ? (token.art ?? '') : token.id;
}

/** `{kind, id, location?}` for a token event — `location` omitted while it's the empty-string
 *  "not yet placed" sentinel (the adversary between `selectAdversary` and `placeAdversary`). */
function tokenEventFields(token: PlacedToken): {
  kind: TokenKind;
  id: string;
  location?: LocationName;
} {
  const id = eventIdentity(token);
  return token.location
    ? { kind: token.typeId, id, location: token.location }
    : { kind: token.typeId, id };
}
