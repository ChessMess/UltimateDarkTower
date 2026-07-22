// opForms — the single source of truth for the structured effect editor. The op dropdown is sourced
// from scenarioSchema.$defs.effect.properties.op.enum at RUNTIME (so the closed vocabulary stays
// closed automatically), and a per-op field spec drives structured inputs for the common set. Ops
// without a spec (or hero.scope past the depth cap) fall back to a raw-JSON textarea. L1 remains the
// authority — every store mutator revalidates.

import { scenarioSchema } from '@udtc/schema';

export const RESOURCES = ['warriors', 'spirit'] as const;
export const KINGDOMS = ['north', 'south', 'east', 'west'] as const;
export const FOE_STATUSES = ['panicked', 'unsteady', 'ready', 'savage', 'lethal'] as const;
export const ITEM_TYPES = ['gear', 'treasure', 'potion', 'questItem'] as const;
export const HERO_SCOPES = [
  'self',
  'other',
  'selfAndOther',
  'allOthers',
  'all',
  'kingdom',
] as const;
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
  | 'itemType'
  | 'deck'
  | 'foe'
  // a space on the ACTIVE board — a custom board's own names, else the built-in RtDT roster
  | 'location';

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
  // `all`/`count` are mutually exclusive (schema oneOf: {all: true} XOR {count}), so this is
  // rendered as a dedicated toggle in EffectRow rather than through the generic per-field loop —
  // a naive count field alongside a leftover `all: true` could produce both keys at once, which
  // L1 rejects. The empty array here only registers the op as having a structured form at all.
  'corruption.remove': [],
  // Building Reinforce effects (rules.md §buildings.md: citadel/bazaar's free/enhanced grants,
  // sanctuary's enhanced, citadel's virtue) commonly use these — without a spec they fell back to
  // the raw-JSON textarea, which is what most authors adjusting a building type want to avoid.
  'virtue.activate': [{ key: 'virtue', kind: 'text', label: 'Virtue', optional: true }],
  'virtue.grant': [{ key: 'virtue', kind: 'text', label: 'Virtue' }],
  'item.gain': [
    { key: 'itemType', kind: 'itemType', label: 'Item type' },
    { key: 'from', kind: 'text', label: 'From', optional: true },
  ],
  'skull.place': [
    { key: 'count', kind: 'number', label: 'Count', min: 1 },
    { key: 'kingdom', kind: 'kingdom', label: 'Kingdom' },
  ],
  'skull.remove': [{ key: 'count', kind: 'number', label: 'Count', min: 1 }],
  'foe.spawn': [
    { key: 'foeId', kind: 'foe', label: 'Foe' },
    { key: 'location', kind: 'location', label: 'Location' },
    { key: 'status', kind: 'foeStatus', label: 'Status', optional: true },
  ],
  'foe.move': [
    { key: 'foeId', kind: 'foe', label: 'Foe' },
    { key: 'to', kind: 'location', label: 'To' },
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
    case 'virtue.grant':
      return { op, virtue: '' };
    case 'item.gain':
      return { op, itemType: 'potion' };
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
