// core.ts — foundational, dependency-free helpers for the reducer: canonical serialization +
// FNV-1a digest (§6, §9), state clone, engine faults, the closed directive push (§5.2), and the
// canonical kingdom order (§3.1). Every other engine module builds on these; core imports nothing.

import type { EngineState, Directive, Kingdom } from './types';

export const ENGINE_VERSION = '0.5.0';
export const SUPPORTED_SCHEMA_RANGE = '>=0.4.0 <0.5.0'; // semver-range, same-minor pre-1.0 (§8)

// The four board kingdoms in canonical clockwise order (schema $defs/kingdom). Seating, home-kingdom
// ownership, and the dormant-kingdom complement (§3.1) are all derived from this order so that two
// runs of the same scenario at the same player count build an identical hero/kingdom layout.
export const KINGDOMS: Kingdom[] = ['north', 'south', 'east', 'west'];

// ---------- canonical serialization + digest (§6, §9) ----------
export function canonical(o: unknown): string {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o))
    return '[' + o.map((v) => (v === undefined ? 'null' : canonical(v))).join(',') + ']';
  const rec = o as Record<string, unknown>;
  return (
    '{' +
    Object.keys(rec)
      .sort()
      // match JSON.stringify object semantics: keys whose value is undefined are omitted, so a
      // round-trip through serialize→deserialize (and digest vs. clone) stays valid + stable.
      .filter((k) => rec[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + canonical(rec[k]))
      .join(',') +
    '}'
  );
}
export function fnv1a32(str: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}
export function serialize(state: EngineState): string {
  return canonical(state);
}
export function deserialize(blob: string): EngineState {
  return JSON.parse(blob);
}
export function digest(state: EngineState): string {
  // hash real game state: everything except (a) the five load-time refs, populated once at init
  // from the authored scenario and never mutated at runtime, and (b) clock fields that are pure
  // traversal/rotation bookkeeping, not state a divergence detector needs to catch.
  // Deferred item 3 (planning/engine-deferred-followups.md): this was previously inverted — it
  // hashed the load-time refs (_nodes/_lib/_setup/_spine/_triggers) while DROPPING load-bearing
  // clock state (turnsThisMonth, latches, battle, dungeon, pendingEvents, eventQueue), so two
  // states that had genuinely diverged mid-battle or mid-dungeon could hash identically. This
  // deliberately changes digest VALUES (see CHANGELOG: ≤0.4.0 persisted digests/checkpoints won't
  // match); no test hardcodes a digest value, and run-to-run lockstep determinism is unaffected.
  const { clock, _nodes, _lib, _setup, _spine, _triggers, ...rest } = state;
  const c = {
    month: clock.month,
    turnInMonth: clock.turnInMonth,
    activeHero: clock.activeHero,
    cursor: clock.cursor,
    turnsThisMonth: clock.turnsThisMonth,
    latches: clock.latches,
    battle: clock.battle,
    dungeon: clock.dungeon,
    pendingEvents: clock.pendingEvents,
    eventQueue: clock.eventQueue,
  };
  return fnv1a32(canonical({ ...rest, clock: c }));
}

export function clone<T>(x: T): T {
  return JSON.parse(JSON.stringify(x));
}

export interface EngineFault extends Error {
  isFault: true;
}
export function fault(msg: string): EngineFault {
  const e = new Error('ENGINE FAULT: ' + msg) as EngineFault;
  e.isFault = true;
  return e;
}

// ---------- directives (§5.2, closed) ----------
export function dir<T extends Directive['type']>(
  directives: Directive[],
  type: T,
  payload: Omit<Extract<Directive, { type: T }>, 'type'>,
): void {
  directives.push({ type, ...payload } as Directive);
}
