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

  // Node-level ref checks.
  const graph = obj(s['graph']);
  const nodes = graph ? arr(graph['nodes']) : undefined;

  // Resolve a foe-placement pair {foeId, location} against the UDT roster + board locations.
  const checkSpawn = (foeId: string | undefined, location: string | undefined, ctx: string): void => {
    if (foeId !== undefined) {
      const f = udt.foeById[foeId];
      if (!f || f.kind !== 'foe') {
        errors.push(`${ctx} foeId "${foeId}" is not in the UDT foe roster`);
      }
    }
    if (location !== undefined && !(location in udt.boardLocationByName)) {
      errors.push(`${ctx} location "${location}" is not a known board location (UDT BOARD_LOCATIONS)`);
    }
  };

  if (nodes) {
    for (const node of nodes) {
      const n = obj(node);
      if (!n) continue;
      const kind = str(n['kind']);
      const id = str(n['id']) ?? '?';
      const props = obj(n['props']);

      // tower.op: light.named sequenceId must be a key in TOWER_LIGHT_SEQUENCES
      if (kind === 'tower.op') {
        const towerOp = props ? obj(props['towerOp']) : undefined;
        if (towerOp && str(towerOp['channel']) === 'light.named') {
          const seqId = str(towerOp['sequenceId']);
          if (seqId !== undefined && !(seqId in udt.lightSequences)) {
            errors.push(
              `node "${id}" tower.op light.named sequenceId "${seqId}" is not in TOWER_LIGHT_SEQUENCES`,
            );
          }
        }
        continue;
      }

      // lifecycle.boardSetup: each initial spawn resolves foeId + location
      if (kind === 'lifecycle.boardSetup') {
        const spawns = props ? arr(props['spawns']) : undefined;
        for (const sp of spawns ?? []) {
          const s2 = obj(sp);
          if (s2) checkSpawn(str(s2['foeId']), str(s2['location']), `node "${id}" boardSetup spawn`);
        }
        continue;
      }

      // lifecycle.selectHero: every authored candidate heroId must resolve against the UDT roster
      // AND have a matching library.heroes entry (Creator keeps these in sync; L2 is the load-time
      // backstop for hand-edited/imported scenarios).
      if (kind === 'lifecycle.selectHero') {
        const heroIds = props ? arr(props['heroIds']) : undefined;
        const libHeroes = obj(obj(s['library'])?.['heroes']) ?? {};
        for (const hid of heroIds ?? []) {
          const heroId = str(hid);
          if (heroId === undefined) continue;
          if (!(heroId in udt.heroById)) {
            errors.push(`node "${id}" lifecycle.selectHero heroId "${heroId}" is not in the UDT hero roster`);
          }
          if (!(heroId in libHeroes)) {
            errors.push(`node "${id}" lifecycle.selectHero heroId "${heroId}" has no matching library.heroes entry`);
          }
        }
        continue;
      }

      // effect.apply carrying foe.spawn effect(s): resolve foeId + location
      if (kind === 'effect.apply' && props) {
        const effs: unknown[] = [];
        const single = obj(props['effect']);
        if (single) effs.push(single);
        const many = arr(props['effects']);
        if (many) effs.push(...many);
        for (const e of effs) {
          const eo = obj(e);
          if (eo && str(eo['op']) === 'foe.spawn') {
            checkSpawn(str(eo['foeId']), str(eo['location']), `node "${id}" foe.spawn`);
          }
        }
      }
    }
  }

  return { ok: errors.length === 0, errors };
}
