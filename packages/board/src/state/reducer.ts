import type {
  BoardState,
  BuildingState,
  LocationName,
  QuestMarker,
  SpaceMarker,
} from './boardState';
import { createDefaultBoardState } from './boardState';
import { BOARD_LOCATION_BY_NAME } from '../data/udtReexports';
import type { BoardCommand } from './commands';

/** Returns the building at `location`, or a fresh empty one if it isn't present yet. */
function buildingAt(state: BoardState, location: LocationName): BuildingState {
  return state.buildings[location] ?? { skulls: 0, destroyed: false };
}

/** Immutably writes a building space, returning the next `buildings` map. */
function withBuilding(
  state: BoardState,
  location: LocationName,
  next: BuildingState,
): BoardState['buildings'] {
  return { ...state.buildings, [location]: next };
}

/**
 * In dev, warn (never throw) when a command targets a location that isn't on the
 * board. This is an aid, not a rule — the command still applies faithfully.
 */
function warnUnknownLocation(location: LocationName): void {
  if (
    typeof process !== 'undefined' &&
    process.env?.NODE_ENV !== 'production' &&
    !(location in BOARD_LOCATION_BY_NAME)
  ) {
    console.warn(`[ultimatedarktowerboard] command targets unknown location: "${location}"`);
  }
}

/**
 * Pure reducer: `(state, command) -> nextState`. Never mutates `state`, has no
 * side effects, and performs **no validation or clamping** (the board is a dumb
 * container). The lone arithmetic guard is flooring skull counts at 0 so they
 * never go negative — hygiene, not a rule.
 */
export function applyBoardCommand(state: BoardState, command: BoardCommand): BoardState {
  switch (command.type) {
    case 'placeHero':
      warnUnknownLocation(command.location);
      return {
        ...state,
        heroes: {
          ...state.heroes,
          [command.heroId]: {
            location: command.location,
            ...(command.owner !== undefined ? { owner: command.owner } : {}),
          },
        },
      };

    case 'moveHero': {
      const hero = state.heroes[command.heroId];
      if (!hero) return state;
      warnUnknownLocation(command.location);
      return {
        ...state,
        heroes: { ...state.heroes, [command.heroId]: { ...hero, location: command.location } },
      };
    }

    case 'removeHero': {
      if (!(command.heroId in state.heroes)) return state;
      const heroes = { ...state.heroes };
      delete heroes[command.heroId];
      return { ...state, heroes };
    }

    case 'spawnFoe':
      warnUnknownLocation(command.location);
      return {
        ...state,
        foes: {
          ...state.foes,
          [command.foeId]: {
            foe: command.foe,
            location: command.location,
            status: command.status ?? 'ready',
          },
        },
      };

    case 'moveFoe': {
      const foe = state.foes[command.foeId];
      if (!foe) return state;
      warnUnknownLocation(command.location);
      return {
        ...state,
        foes: { ...state.foes, [command.foeId]: { ...foe, location: command.location } },
      };
    }

    case 'setFoeStatus': {
      const foe = state.foes[command.foeId];
      if (!foe) return state;
      return {
        ...state,
        foes: { ...state.foes, [command.foeId]: { ...foe, status: command.status } },
      };
    }

    case 'removeFoe': {
      if (!(command.foeId in state.foes)) return state;
      const foes = { ...state.foes };
      delete foes[command.foeId];
      return { ...state, foes };
    }

    case 'selectAdversary':
      return { ...state, adversary: { ...state.adversary, id: command.id } };

    case 'placeAdversary':
      warnUnknownLocation(command.location);
      return {
        ...state,
        adversary: {
          ...state.adversary,
          id: state.adversary?.id ?? '',
          location: command.location,
        },
      };

    case 'clearAdversary': {
      if (!state.adversary) return state;
      const next = { ...state };
      delete next.adversary;
      return next;
    }

    case 'addSkull': {
      warnUnknownLocation(command.location);
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, {
          ...b,
          skulls: b.skulls + (command.n ?? 1),
        }),
      };
    }

    case 'removeSkull': {
      warnUnknownLocation(command.location);
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, {
          ...b,
          skulls: Math.max(0, b.skulls - (command.n ?? 1)),
        }),
      };
    }

    case 'setSkulls': {
      warnUnknownLocation(command.location);
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, { ...b, skulls: command.n }),
      };
    }

    case 'destroyBuilding': {
      warnUnknownLocation(command.location);
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, { ...b, destroyed: true }),
      };
    }

    case 'restoreBuilding': {
      warnUnknownLocation(command.location);
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, { ...b, destroyed: false }),
      };
    }

    case 'setMonument': {
      warnUnknownLocation(command.location);
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, { ...b, monument: command.monumentId }),
      };
    }

    case 'setSpaceMarker': {
      warnUnknownLocation(command.location);
      const current = state.spaceMarkers[command.location] ?? [];
      const next: SpaceMarker[] = command.on
        ? current.includes(command.marker)
          ? current
          : [...current, command.marker]
        : current.filter((m) => m !== command.marker);

      const spaceMarkers = { ...state.spaceMarkers };
      if (next.length === 0) {
        delete spaceMarkers[command.location];
      } else {
        spaceMarkers[command.location] = next;
      }
      return { ...state, spaceMarkers };
    }

    case 'setQuestMarker': {
      warnUnknownLocation(command.location);
      const current = state.questMarkers[command.location] ?? [];
      const next: QuestMarker[] = command.on
        ? current.includes(command.marker)
          ? current
          : [...current, command.marker]
        : current.filter((m) => m !== command.marker);

      const questMarkers = { ...state.questMarkers };
      if (next.length === 0) {
        delete questMarkers[command.location];
      } else {
        questMarkers[command.location] = next;
      }
      return { ...state, questMarkers };
    }

    case 'setSelections':
      return { ...state, selections: { ...state.selections, ...command.selections } };

    case 'replaceState':
      return command.state;

    case 'reset':
      return createDefaultBoardState();

    default:
      return state;
  }
}
