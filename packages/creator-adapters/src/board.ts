// Board adapter — wraps ultimatedarktowerboard's BoardStateController.
// Translates engine board.mutate directive commands to Board package commands.
// RE-Contract §5.2/§10.5; build guide §7.
//
// NOTE: ultimatedarktowerboard imports { data } from 'ultimatedarktower' at module
// init (needs UDT >= 5.0.0). The dynamic import() keeps that init lazy (code-split,
// and recoverable if the ecosystem is ever out of range) — `ctrl` therefore only
// exists once the promise resolves. Callers wanting the live state should attach via
// `onReady`/`isReady` rather than reading `getState()` before it resolves ({}).

import type { BoardState as UDTBoardState } from 'ultimatedarktowerboard';

export type BoardState = UDTBoardState;
export type BoardMutateCommand = { command: string; args: Record<string, unknown> };

// Minimal interface covering the BoardStateController methods we call.
type BoardCtrl = {
  getState(): BoardState;
  spawnFoe(foeId: string, instanceId: string, location: string): void;
  moveFoe(foeId: string, location: string): void;
  removeFoe(instanceId: string): void;
  clearAdversary(): void;
  selectAdversary(foeId: string): void;
  placeHero(heroId: string, location: string): void;
  moveHero(heroId: string, location: string): void;
  destroyBuilding(location: string): void;
  setMonument(location: string, id: string): void;
  setSpaceMarker(location: string, type: string, active: boolean): void;
  addSkull(location: string, count: number): void;
  reset(): void;
};

export function createBoardAdapter(): {
  getState: () => BoardState;
  mutate: (cmd: BoardMutateCommand) => void;
  onReady: (cb: () => void) => void;
  isReady: () => boolean;
} {
  let ctrl: BoardCtrl | null = null;
  let ready = false;
  const readyCbs: Array<() => void> = [];

  // Dynamic import defers board-package init to call time, keeping it lazy and recoverable.
  import('ultimatedarktowerboard')
    .then(({ BoardStateController, createDefaultBoardState }) => {
      ctrl = new (BoardStateController as new (opts: {
        initial: BoardState;
        mode: string;
      }) => BoardCtrl)({ initial: createDefaultBoardState() as BoardState, mode: 'self' });
      ready = true;
      for (const cb of readyCbs.splice(0)) cb();
    })
    .catch((e: unknown) => {
      console.warn(
        '[board adapter] ultimatedarktowerboard unavailable (UDT version mismatch?):',
        e,
      );
    });

  function mutate({ command, args }: BoardMutateCommand): void {
    if (!ctrl) return;
    switch (command) {
      case 'spawnFoe': {
        const a = args as { foeId: string; location: string };
        ctrl.spawnFoe(a.foeId, a.foeId, a.location);
        break;
      }
      case 'moveFoe': {
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
        break;
      }
      case 'placeMonument': {
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
        if (a.source === 'emergence') break;
        if (a.kingdom != null && a.count != null) {
          ctrl.addSkull(a.kingdom, a.count);
        }
        break;
      }
      case 'removeSkull':
        break;
      case 'setupBoard':
        ctrl.reset();
        break;
      case 'placeToken':
      case 'removeToken':
        break;
      case 'spawnDungeon':
      case 'enterDungeon':
      case 'revealRoom':
      case 'removeDungeonToken':
        break;
      default:
        console.warn(`[board adapter] unknown board.mutate command: ${command}`);
    }
  }

  return {
    getState: () => ctrl?.getState() ?? ({} as BoardState),
    mutate,
    // Fires once the board controller has finished its async import + init (immediately if
    // already ready). Consumers that render live state (e.g. the 3D board plugin) use this
    // to avoid reading the empty `{}` placeholder returned before `ctrl` exists.
    onReady: (cb: () => void) => {
      if (ready) cb();
      else readyCbs.push(cb);
    },
    isReady: () => ready,
  };
}
