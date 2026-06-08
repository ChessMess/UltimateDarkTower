import type { BoardKingdom } from '../data/udtReexports';
import type {
  BoardState,
  FoeId,
  FoeStatus,
  HeroId,
  LocationName,
  SpaceMarker,
} from './boardState';
import { createDefaultBoardState } from './boardState';
import type { BoardCommand } from './commands';
import { applyBoardCommand } from './reducer';
import type { BoardEvent, BoardEventListener, BoardEventType } from './events';
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
    this.events.emit({ type: 'change', state: next, command: { type: 'replaceState', state: next } });
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
    listener: (event: Extract<BoardEvent, { type: T }>) => void
  ): () => void {
    return this.subscribe((event) => {
      if (event.type === type) {
        listener(event as Extract<BoardEvent, { type: T }>);
      }
    });
  }

  // Ergonomic named methods — thin wrappers over `dispatch`.
  placeHero(heroId: HeroId, location: LocationName, owner?: BoardKingdom): void {
    this.dispatch({ type: 'placeHero', heroId, location, owner });
  }
  moveHero(heroId: HeroId, location: LocationName): void {
    this.dispatch({ type: 'moveHero', heroId, location });
  }
  removeHero(heroId: HeroId): void {
    this.dispatch({ type: 'removeHero', heroId });
  }
  spawnFoe(foeId: FoeId, foe: string, location: LocationName, status?: FoeStatus): void {
    this.dispatch({ type: 'spawnFoe', foeId, foe, location, status });
  }
  moveFoe(foeId: FoeId, location: LocationName): void {
    this.dispatch({ type: 'moveFoe', foeId, location });
  }
  setFoeStatus(foeId: FoeId, status: FoeStatus): void {
    this.dispatch({ type: 'setFoeStatus', foeId, status });
  }
  removeFoe(foeId: FoeId): void {
    this.dispatch({ type: 'removeFoe', foeId });
  }
  selectAdversary(id: string): void {
    this.dispatch({ type: 'selectAdversary', id });
  }
  placeAdversary(location: LocationName): void {
    this.dispatch({ type: 'placeAdversary', location });
  }
  clearAdversary(): void {
    this.dispatch({ type: 'clearAdversary' });
  }
  addSkull(location: LocationName, n?: number): void {
    this.dispatch({ type: 'addSkull', location, n });
  }
  removeSkull(location: LocationName, n?: number): void {
    this.dispatch({ type: 'removeSkull', location, n });
  }
  setSkulls(location: LocationName, n: number): void {
    this.dispatch({ type: 'setSkulls', location, n });
  }
  destroyBuilding(location: LocationName): void {
    this.dispatch({ type: 'destroyBuilding', location });
  }
  restoreBuilding(location: LocationName): void {
    this.dispatch({ type: 'restoreBuilding', location });
  }
  setMonument(location: LocationName, monumentId: string | null): void {
    this.dispatch({ type: 'setMonument', location, monumentId });
  }
  setSpaceMarker(location: LocationName, marker: SpaceMarker, on: boolean): void {
    this.dispatch({ type: 'setSpaceMarker', location, marker, on });
  }
  setSelections(selections: BoardState['selections']): void {
    this.dispatch({ type: 'setSelections', selections });
  }
}

/**
 * Derives the specific (non-`change`) events for an applied command. Pure; reads
 * the prior/next state so removals and adversary changes report accurate ids and
 * no-ops emit nothing.
 */
function deriveSpecificEvents(
  command: BoardCommand,
  prev: BoardState,
  next: BoardState
): BoardEvent[] {
  switch (command.type) {
    case 'placeHero':
      return [{ type: 'tokenAdded', kind: 'hero', id: command.heroId, location: command.location }];
    case 'moveHero':
      return command.heroId in next.heroes
        ? [{ type: 'tokenMoved', kind: 'hero', id: command.heroId, location: command.location }]
        : [];
    case 'removeHero':
      return command.heroId in prev.heroes
        ? [{ type: 'tokenRemoved', kind: 'hero', id: command.heroId }]
        : [];

    case 'spawnFoe':
      return [{ type: 'tokenAdded', kind: 'foe', id: command.foeId, location: command.location }];
    case 'moveFoe':
      return command.foeId in next.foes
        ? [{ type: 'tokenMoved', kind: 'foe', id: command.foeId, location: command.location }]
        : [];
    case 'removeFoe':
      return command.foeId in prev.foes
        ? [{ type: 'tokenRemoved', kind: 'foe', id: command.foeId }]
        : [];

    case 'selectAdversary':
      return [{ type: 'tokenAdded', kind: 'adversary', id: command.id }];
    case 'placeAdversary':
      return [
        {
          type: 'tokenMoved',
          kind: 'adversary',
          id: next.adversary?.id ?? '',
          location: command.location,
        },
      ];
    case 'clearAdversary':
      return prev.adversary
        ? [{ type: 'tokenRemoved', kind: 'adversary', id: prev.adversary.id }]
        : [];

    case 'addSkull':
    case 'removeSkull':
    case 'setSkulls':
    case 'destroyBuilding':
    case 'restoreBuilding':
    case 'setMonument':
      return [
        { type: 'buildingChanged', location: command.location, building: next.buildings[command.location] },
      ];

    case 'setSpaceMarker':
      return [
        {
          type: 'spaceMarkerChanged',
          location: command.location,
          markers: next.spaceMarkers[command.location] ?? [],
        },
      ];

    case 'setSelections':
      return [{ type: 'selectionChanged', selections: next.selections }];

    case 'setFoeStatus':
    case 'replaceState':
    case 'reset':
      return [];
  }
}
