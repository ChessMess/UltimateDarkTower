// opForms — the single source of truth for the structured effect editor. The op dropdown is sourced
// from scenarioSchema.$defs.effect.properties.op.enum at RUNTIME (so the closed vocabulary stays
// closed automatically), and a per-op field spec drives structured inputs for the common set. Ops
// without a spec (or hero.scope past the depth cap) fall back to a raw-JSON textarea. L1 remains the
// authority — every store mutator revalidates.

import { scenarioSchema } from '@udtc/schema';

export const RESOURCES = ['warriors', 'spirit'] as const;
export const KINGDOMS = ['north', 'south', 'east', 'west'] as const;
export const FOE_STATUSES = ['panicked', 'unsteady', 'ready', 'savage', 'lethal'] as const;
export const HERO_SCOPES = ['self', 'other', 'selfAndOther', 'allOthers', 'all', 'kingdom'] as const;
/** hero.scope nesting is capped at this depth; deeper scopes use the JSON fallback */
export const SCOPE_DEPTH_CAP = 2;

/** the closed effect-op vocabulary, read from the schema at runtime */
export function getOpEnum(): string[] {
  const root = scenarioSchema as Record<string, unknown>;
  const defs = root.$defs as Record<string, unknown> | undefined;
  const effect = defs?.effect as Record<string, unknown> | undefined;
  const props = effect?.properties as Record<string, unknown> | undefined;
  const opDef = props?.op as Record<string, unknown> | undefined;
  const en = opDef?.enum;
  return Array.isArray(en) ? en.filter((x): x is string => typeof x === 'string') : [];
}

export type FieldKind =
  | 'number'
  | 'text'
  | 'bool'
  | 'resource'
  | 'kingdom'
  | 'foeStatus'
  | 'deck'
  | 'foe';

export interface FieldSpec {
  key: string;
  kind: FieldKind;
  label: string;
  min?: number;
  optional?: boolean;
}

// Structured forms for the common op set. Anything else (or hero.scope beyond the cap) → JSON.
export const OP_FORMS: Record<string, FieldSpec[]> = {
  'resource.gain': [
    { key: 'resource', kind: 'resource', label: 'Resource' },
    { key: 'amount', kind: 'number', label: 'Amount', min: 1 },
  ],
  'resource.lose': [
    { key: 'resource', kind: 'resource', label: 'Resource' },
    { key: 'amount', kind: 'number', label: 'Amount', min: 1 },
  ],
  'resource.spend': [
    { key: 'resource', kind: 'resource', label: 'Resource' },
    { key: 'amount', kind: 'number', label: 'Amount', min: 1 },
  ],
  'corruption.gain': [{ key: 'source', kind: 'text', label: 'Source', optional: true }],
  'corruption.remove': [{ key: 'count', kind: 'number', label: 'Count', min: 1 }],
  'skull.place': [
    { key: 'count', kind: 'number', label: 'Count', min: 1 },
    { key: 'kingdom', kind: 'kingdom', label: 'Kingdom' },
  ],
  'skull.remove': [{ key: 'count', kind: 'number', label: 'Count', min: 1 }],
  'foe.spawn': [
    { key: 'foeId', kind: 'foe', label: 'Foe' },
    { key: 'location', kind: 'text', label: 'Location' },
    { key: 'status', kind: 'foeStatus', label: 'Status', optional: true },
  ],
  'foe.move': [
    { key: 'foeId', kind: 'foe', label: 'Foe' },
    { key: 'to', kind: 'text', label: 'To' },
  ],
  'foe.remove': [{ key: 'foeId', kind: 'foe', label: 'Foe', optional: true }],
  'foe.escalateStatus': [
    { key: 'foeId', kind: 'foe', label: 'Foe', optional: true },
    { key: 'steps', kind: 'number', label: 'Steps', min: 1, optional: true },
  ],
  'deck.draw': [
    { key: 'deck', kind: 'deck', label: 'Deck' },
    { key: 'reveal', kind: 'bool', label: 'Reveal' },
    { key: 'resolve', kind: 'bool', label: 'Resolve' },
  ],
  'deck.discard': [{ key: 'deck', kind: 'deck', label: 'Deck' }],
  'deck.reshuffle': [{ key: 'deck', kind: 'deck', label: 'Deck' }],
  'flag.set': [
    { key: 'name', kind: 'text', label: 'Flag' },
    { key: 'value', kind: 'text', label: 'Value' },
  ],
  'counter.set': [
    { key: 'name', kind: 'text', label: 'Counter' },
    { key: 'value', kind: 'number', label: 'Value' },
  ],
};

/** an op has a structured form iff it appears in OP_FORMS or is hero.scope (handled specially) */
export function hasStructuredForm(op: string): boolean {
  return op in OP_FORMS || op === 'hero.scope';
}

/** a starter effect object for a freshly-selected op */
export function defaultEffect(op: string): Record<string, unknown> {
  switch (op) {
    case 'resource.gain':
    case 'resource.lose':
    case 'resource.spend':
      return { op, resource: 'warriors', amount: 1 };
    case 'corruption.gain':
      return { op };
    case 'corruption.remove':
      return { op, count: 1 };
    case 'skull.place':
      return { op, count: 1, kingdom: 'north' };
    case 'skull.remove':
      return { op, count: 1 };
    case 'foe.spawn':
      return { op, foeId: '', location: '' };
    case 'foe.move':
      return { op, foeId: '', to: '' };
    case 'foe.remove':
    case 'foe.escalateStatus':
      return { op };
    case 'deck.draw':
    case 'deck.discard':
    case 'deck.reshuffle':
      return { op, deck: '' };
    case 'flag.set':
      return { op, name: '', value: true };
    case 'counter.set':
      return { op, name: '', value: 0 };
    case 'hero.scope':
      return { op, scope: 'self', effects: [] };
    default:
      return { op };
  }
}

/** coerce a flag.set text value into bool / number / string (schema leaves flag values unbounded) */
export function coerceFlagValue(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw.trim() !== '' && !Number.isNaN(Number(raw))) return Number(raw);
  return raw;
}
