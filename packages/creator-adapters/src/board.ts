// Board adapter — wraps ultimatedarktowerboard's BoardStateController.
// Translates engine board.mutate directive commands to Board package commands.
// RE-Contract §5.2/§10.5; build guide §7.

import { BoardStateController, createDefaultBoardState } from 'ultimatedarktowerboard';
import type { BoardState as UDTBoardState } from 'ultimatedarktowerboard';

export type BoardState = UDTBoardState;
export type BoardMutateCommand = { command: string; args: Record<string, unknown> };

export function createBoardAdapter(): {
  getState: () => BoardState;
  mutate: (cmd: BoardMutateCommand) => void;
} {
  const ctrl = new BoardStateController({ initial: createDefaultBoardState(), mode: 'self' });

  function mutate({ command, args }: BoardMutateCommand): void {
    switch (command) {
      case 'spawnFoe': {
        const a = args as { foeId: string; location: string };
        ctrl.spawnFoe(a.foeId, a.foeId, a.location);
        break;
      }
      case 'moveFoe': {
        // engine emits `to`, Board uses `location` as param name
        const a = args as { foeId: string; to: string };
        ctrl.moveFoe(a.foeId, a.to);
        break;
      }
      case 'removeFoe': {
        const a = args as { foeId?: string; adversary?: boolean };
        if (a.adversary) {
          ctrl.clearAdversary();
        } else if (a.foeId) {
          ctrl.removeFoe(a.foeId);
        }
        break;
      }
      case 'spawnAdversary': {
        const a = args as { foeId: string };
        ctrl.selectAdversary(a.foeId);
        break;
      }
      case 'placeHero': {
        // engine uses `hero` for the id, `to` for location
        const a = args as { hero: string; to: string };
        ctrl.placeHero(a.hero, a.to);
        break;
      }
      case 'moveHero': {
        const a = args as { hero: string; to: string };
        ctrl.moveHero(a.hero, a.to);
        break;
      }
      case 'removeBuilding': {
        const a = args as { location?: string };
        if (a.location) {
          ctrl.destroyBuilding(a.location);
        }
        // no location = skull-emergence case; engine tracks this abstractly, no-op here
        break;
      }
      case 'placeMonument': {
        // engine does not yet carry monumentId — use placeholder until schema carries it
        const a = args as { location: string };
        ctrl.setMonument(a.location, 'monument');
        break;
      }
      case 'placeMarker': {
        const a = args as { location: string; markerType: string };
        ctrl.setSpaceMarker(a.location, a.markerType, true);
        break;
      }
      case 'placeSkull': {
        const a = args as { count?: number; kingdom?: string; source?: string };
        if (a.source === 'emergence') {
          // skull invariant: count comes from tower observation, not the scenario
          break;
        }
        if (a.kingdom != null && a.count != null) {
          // kingdom (north/south/east/west) used as location key; renderer maps to buildings
          ctrl.addSkull(a.kingdom, a.count);
        }
        break;
      }
      case 'removeSkull':
        // engine does not carry a location; Board requires one — no-op
        // supply is updated via ui.update independently
        break;
      case 'setupBoard':
        ctrl.reset();
        break;
      case 'placeToken':
      case 'removeToken':
        // Board v0.1 has no generic token concept; no-op until board package adds support
        break;
      case 'spawnDungeon':
      case 'enterDungeon':
      case 'revealRoom':
      case 'removeDungeonToken':
        // Board v0.1 has no dungeon state; no-op until board package adds dungeon support
        break;
      default:
        console.warn(`[board adapter] unknown board.mutate command: ${command}`);
    }
  }

  return {
    getState: () => ctrl.getState(),
    mutate,
  };
}
