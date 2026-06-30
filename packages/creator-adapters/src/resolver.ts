// Pinned-ecosystem lookup injected into engine.init() as the `resolver` option (RE-Contract §2.2).
// Resolves FoeId, AdversaryId, location, hero-identity, light sequence key, and audio key
// against UDT v4.1.0. Returns null on a miss so callers can surface structured errors.

import { getUDTReferenceLayer } from './udt';
import type { Foe, Hero, BoardLocation } from './udt';

export interface Resolver {
  resolveFoe: (id: string) => Foe | null;
  resolveAdversary: (id: string) => Foe | null;
  resolveLocation: (name: string) => BoardLocation | null;
  resolveHero: (id: string) => Hero | null;
  resolveLightSequence: (key: string) => number | null;
  resolveAudio: (key: string) => { name: string; value: number; category: string } | null;
}

export function createResolver(): Resolver {
  const udt = getUDTReferenceLayer();

  return {
    resolveFoe(id) {
      const foe = udt.foeById[id];
      return foe && foe.kind === 'foe' ? foe : null;
    },
    resolveAdversary(id) {
      const foe = udt.foeById[id];
      return foe && foe.kind === 'adversary' ? foe : null;
    },
    resolveLocation(name) {
      return udt.boardLocationByName[name] ?? null;
    },
    resolveHero(id) {
      return udt.heroById[id] ?? null;
    },
    resolveLightSequence(key) {
      const val = udt.lightSequences[key as keyof typeof udt.lightSequences];
      return val !== undefined ? val : null;
    },
    resolveAudio(key) {
      return udt.audioLibrary[key] ?? null;
    },
  };
}
