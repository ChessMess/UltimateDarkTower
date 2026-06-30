// L2 reference resolution (Schema §9 L2): every typed id resolves against the pinned UDT roster
// or a valid intra-file library key. A miss is a hard fail — callers must block execution.

import { getUDTReferenceLayer } from './udt';

export type L2Result = { ok: boolean; errors: string[] };

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function obj(v: unknown): Record<string, unknown> | undefined {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}
function arr(v: unknown): unknown[] | undefined {
  return Array.isArray(v) ? v : undefined;
}

export function validateRefs(scenario: unknown): L2Result {
  const errors: string[] = [];
  const udt = getUDTReferenceLayer();
  const s = obj(scenario);
  if (!s) return { ok: false, errors: ['scenario is not an object'] };

  const setup = obj(s['setup']);
  const selections = setup ? obj(setup['selections']) : undefined;

  // adversaryId must be a known adversary
  const adversaryId = selections ? str(selections['adversaryId']) : undefined;
  if (adversaryId !== undefined) {
    const f = udt.foeById[adversaryId];
    if (!f || f.kind !== 'adversary') {
      errors.push(`setup.selections.adversaryId "${adversaryId}" is not in the adversary roster`);
    }
  }

  // foe tier selections must match the roster at the right tier
  const foeSel = selections ? obj(selections['foes']) : undefined;
  if (foeSel) {
    const checks: [string, number][] = [
      ['tier1', 1],
      ['tier2', 2],
      ['tier3', 3],
    ];
    for (const [key, tier] of checks) {
      const id = str(foeSel[key]);
      if (id !== undefined) {
        const f = udt.foeById[id];
        if (!f || f.kind !== 'foe' || f.tier !== tier) {
          errors.push(
            `setup.selections.foes.${key} "${id}" is not a tier-${tier} foe in the UDT roster`,
          );
        }
      }
    }
  }

  // allyId must match an ALLY (schema uses lowercase; UDT uses title case)
  const allyId = selections ? str(selections['allyId']) : undefined;
  if (allyId !== undefined) {
    const match = udt.allies.some((a) => a.toLowerCase() === allyId.toLowerCase());
    if (!match) {
      errors.push(`setup.selections.allyId "${allyId}" is not in the ally roster`);
    }
  }

  // tower.op nodes: light.named sequenceId must be a key in TOWER_LIGHT_SEQUENCES
  const graph = obj(s['graph']);
  const nodes = graph ? arr(graph['nodes']) : undefined;
  if (nodes) {
    for (const node of nodes) {
      const n = obj(node);
      if (!n || str(n['kind']) !== 'tower.op') continue;
      const props = obj(n['props']);
      const towerOp = props ? obj(props['towerOp']) : undefined;
      if (!towerOp) continue;
      if (str(towerOp['channel']) === 'light.named') {
        const seqId = str(towerOp['sequenceId']);
        if (seqId !== undefined && !(seqId in udt.lightSequences)) {
          errors.push(
            `node "${str(n['id']) ?? '?'}" tower.op light.named sequenceId "${seqId}" is not in TOWER_LIGHT_SEQUENCES`,
          );
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
