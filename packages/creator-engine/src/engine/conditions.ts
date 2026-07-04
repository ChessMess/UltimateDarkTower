// conditions.ts — the §4.4 condition vocabulary as pure predicates over EngineState. Closed set of
// subjects/comparators; an unknown member faults (invariant #4). Depends only on core (fault).

import { fault } from './core';
import type { EngineState, Condition, ConditionSubject, Comparator } from './types';

// ---------- conditions (§4.4, pure predicates) ----------
export function evalCondition(cond: Condition | undefined, state: EngineState): boolean {
  if (!cond) return true;
  if (cond.allOf) return cond.allOf.every((c) => evalCondition(c, state));
  if (cond.anyOf) return cond.anyOf.some((c) => evalCondition(c, state));
  if (cond.not) return !evalCondition(cond.not, state);
  const { value, key } = cond;
  // by this point (past the allOf/anyOf/not combinators) a leaf condition always carries a subject
  // and comparator — an authoring/schema-level invariant the loose Condition type doesn't encode.
  const subject = cond.subject as ConditionSubject;
  const comparator = cond.comparator as Comparator;
  let lhs: unknown;
  switch (subject) {
    case 'resource': {
      const hero = (state.heroes[state.clock.activeHero] || {}) as unknown as Record<string, unknown>;
      lhs = hero[key as string];
      break;
    }
    case 'flag':
      lhs = state.flags[key as string];
      break;
    case 'counter':
      lhs = state.counters[key as string] || 0;
      break;
    case 'sealsRemoved':
      lhs = state.sealsRemoved;
      break;
    case 'foeOnSpace':
      lhs = (state.foes || []).filter((f) => f.location === key).length;
      break;
    case 'heroAtLocation':
      lhs = Object.values(state.heroes).filter((h) => h.location === key).length;
      break;
    case 'supply':
      lhs = state.skulls.supply;
      break;
    case 'month':
      lhs = state.clock.month;
      break;
    case 'endOfMonth':
      lhs = state.clock.turnInMonth >= state.clock.turnsThisMonth;
      break;
    default: {
      const _exhaustive: never = subject;
      throw fault('condition subject not supported in MVP slice: ' + _exhaustive);
    }
  }
  switch (comparator) {
    case 'eq':
      return lhs === value;
    case 'ne':
      return lhs !== value;
    case 'lt':
      return (lhs as number) < (value as number);
    case 'lte':
      return (lhs as number) <= (value as number);
    case 'gt':
      return (lhs as number) > (value as number);
    case 'gte':
      return (lhs as number) >= (value as number);
    case 'has':
      return Array.isArray(lhs) && lhs.includes(value);
    case 'in':
      return Array.isArray(value) && value.includes(lhs);
    default: {
      const _exhaustive: never = comparator;
      throw fault('comparator not supported: ' + _exhaustive);
    }
  }
}
