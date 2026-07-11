// Display adapter — wraps ultimatedarktowerdisplay TowerRenderView + UDT byte packing.
// Translates TowerChannelOp[] from tower.program directives into packed 20-byte snapshots
// and drives the visual render. RE-Contract §5.2; build guide §7.

import {
  createDefaultTowerState,
  rtdt_pack_state,
  TOWER_COMMAND_PACKET_SIZE,
  STATE_DATA_LENGTH,
  TOWER_COMMANDS,
  drumPositionCmds,
} from 'ultimatedarktower';
import type { TowerState, SealIdentifier, TowerSide, TowerLevels } from 'ultimatedarktower';
import type { TowerRenderView } from 'ultimatedarktowerdisplay';
import type { AppliedTowerState } from 'ultimatedarktowerdisplay';
import type { Resolver } from './resolver';
import type { TowerChannelOp } from '@udtc/engine';

export interface ScheduledSnapshot {
  /** Packed 20-byte tower command, as Array<number> for relay transport. */
  data: number[];
  /** Delay after the previous snapshot before sending this one (ms). 0 = immediate. */
  delayMs: number;
}

export interface DisplayAdapter {
  /** Fold ops over the current TowerState. Returns packed snapshots for the relay path
   *  and (if a view is mounted) drives applyState / playSequence / playSample. */
  program(ops: TowerChannelOp[]): { snapshots: ScheduledSnapshot[] };
  /** Full broken-seal set (idempotent): drives view.applySeals. Caller forwards to tower:seals. */
  applySeals(brokenSeals: string[]): void;
  mount(view: TowerRenderView): void;
  getTowerState(): TowerState;
  dispose(): void;
  /** Detach the current view without disposing it (for when another owner controls its lifecycle). */
  unmount(): void;
}

const DRUM_INDEX: Record<string, number> = { top: 0, middle: 1, bottom: 2 };
const TICKS_TO_MS = 20; // 50 Hz tower update rate

const TOWER_SIDES = new Set<string>(['north', 'south', 'east', 'west']);
const TOWER_LEVELS = new Set<string>(['top', 'middle', 'bottom']);

// Parses seal identifiers in "side:level" format (e.g. "north:top").
// The engine's fallback format ("1-north") won't parse — it's skipped visually but still tracked.
function parseSealId(id: string): SealIdentifier | null {
  const colon = id.indexOf(':');
  if (colon === -1) return null;
  const side = id.slice(0, colon);
  const level = id.slice(colon + 1);
  if (TOWER_SIDES.has(side) && TOWER_LEVELS.has(level)) {
    return { side: side as TowerSide, level: level as TowerLevels };
  }
  return null;
}

export function createDisplayAdapter(opts: {
  resolver: Resolver;
  view?: TowerRenderView | null;
}): DisplayAdapter {
  const current: TowerState = createDefaultTowerState();
  let view: TowerRenderView | null = opts.view ?? null;
  const brokenSealSet = new Set<string>();

  function packFullState(): number[] {
    const packet = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
    // packet[0] = 0 = TOWER_COMMAND_TYPE_TOWER_STATE ("set full state" command byte)
    rtdt_pack_state(packet.subarray(1), STATE_DATA_LENGTH, current);
    return Array.from(packet);
  }

  function sealList(): SealIdentifier[] {
    return [...brokenSealSet].map(parseSealId).filter((s): s is SealIdentifier => s !== null);
  }

  function program(ops: TowerChannelOp[]): { snapshots: ScheduledSnapshot[] } {
    const snapshots: ScheduledSnapshot[] = [];
    let pendingDelayMs = 0;

    for (const op of ops) {
      switch (op.channel) {
        case 'light.named': {
          const numId = opts.resolver.resolveLightSequence(op.sequenceId);
          if (numId !== null) {
            current.led_sequence = numId;
            view?.playSequence(numId);
          }
          break;
        }

        case 'sound': {
          const audio = opts.resolver.resolveAudio(op.category);
          if (audio !== null) {
            current.audio = { sample: audio.value, loop: false, volume: 0 };
            view?.playSample(audio.value);
          }
          break;
        }

        case 'drum.rotate': {
          const o = op as { channel: 'drum.rotate'; drum?: string; to?: string; reverse?: boolean };
          const level = o.drum ?? 'top';
          const side = (o.to ?? 'north') as 'north' | 'east' | 'south' | 'west';
          const idx = DRUM_INDEX[level] ?? 0;
          const tbl = drumPositionCmds[level as keyof typeof drumPositionCmds];
          if (tbl) {
            current.drum[idx].position = tbl[side] ?? 0;
            current.drum[idx].playSound = true;
            if (o.reverse !== undefined) current.drum[idx].reverse = o.reverse;
          }
          break;
        }

        case 'rotationBundle': {
          const o = op as { channel: 'rotationBundle'; top?: string; middle?: string; bottom?: string };
          for (const level of ['top', 'middle', 'bottom'] as const) {
            const side = o[level] as 'north' | 'east' | 'south' | 'west' | undefined;
            if (!side) continue;
            const idx = DRUM_INDEX[level];
            const tbl = drumPositionCmds[level];
            current.drum[idx].position = tbl[side] ?? 0;
            current.drum[idx].playSound = true;
          }
          break;
        }

        case 'skull.dropTrigger': {
          // Non-state basic command — header byte = doorReset (1), no count (skull invariant §0.5)
          const dropPacket = new Uint8Array(TOWER_COMMAND_PACKET_SIZE);
          dropPacket[0] = TOWER_COMMANDS.doorReset;
          snapshots.push({ data: Array.from(dropPacket), delayMs: pendingDelayMs });
          pendingDelayMs = 0;
          continue; // skip state-pack; the drop command is already pushed
        }

        case 'seal.break': {
          brokenSealSet.add(op.seal);
          view?.applySeals(sealList());
          break;
        }

        case 'seal.replace': {
          brokenSealSet.delete(op.seal);
          view?.applySeals(sealList());
          break;
        }

        case 'wait': {
          const { ticks = 1 } = op as { channel: 'wait'; ticks?: number };
          snapshots.push({ data: packFullState(), delayMs: pendingDelayMs });
          pendingDelayMs = ticks * TICKS_TO_MS;
          // Clear transient audio so it doesn't re-fire in the next snapshot
          current.audio = { sample: 0, loop: false, volume: 0 };
          continue;
        }

        case 'light.custom':
        case 'light.effect':
        case 'timeline':
          // Post-MVP — no-op (§12)
          break;
      }

      // Sync visual state after each state-mutating op
      view?.applyState(current as AppliedTowerState);
    }

    // Close the final (or only) snapshot
    snapshots.push({ data: packFullState(), delayMs: pendingDelayMs });
    current.audio = { sample: 0, loop: false, volume: 0 };
    return { snapshots };
  }

  function applySeals(brokenSeals: string[]): void {
    brokenSealSet.clear();
    for (const s of brokenSeals) brokenSealSet.add(s);
    view?.applySeals(sealList());
  }

  function mount(v: TowerRenderView): void {
    view = v;
    view.applyState(current as AppliedTowerState);
    view.applySeals(sealList());
  }

  function getTowerState(): TowerState {
    return current;
  }

  function dispose(): void {
    view?.dispose();
    view = null;
  }

  // Detach the current view WITHOUT disposing it — for when another owner (e.g. BoardStageView)
  // owns the TowerRenderView's lifecycle and will dispose it itself.
  function unmount(): void {
    view = null;
  }

  return { program, applySeals, mount, getTowerState, dispose, unmount };
}
