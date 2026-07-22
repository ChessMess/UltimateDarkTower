// L2 reference resolution (Schema §9 L2): every typed id resolves against the pinned UDT roster
// or a valid intra-file library key. A miss is a hard fail — callers must block execution.

import { getUDTReferenceLayer } from './udt';
import { resolveActiveBoardDef } from './board-def';

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

  // The location vocabulary every location-typed ref is checked against: the active custom
  // board's names, or UDT's built-in RtDT roster when no custom board is selected.
  const activeBoard = resolveActiveBoardDef(s);
  const activeLocations: ReadonlySet<string> = activeBoard
    ? new Set(activeBoard.def.locations.map((l) => l.name))
    : new Set(Object.keys(udt.boardLocationByName));
  const locationSource = activeBoard
    ? `library.boards.${activeBoard.boardId}`
    : 'UDT BOARD_LOCATIONS';

  // A boardRef must name a real library.boards entry.
  const boardRef = setup ? str(obj(setup['board'])?.['boardRef']) : undefined;
  const boardsLib = obj(obj(s['library'])?.['boards']);
  if (boardRef !== undefined && !(boardsLib && boardRef in boardsLib)) {
    errors.push(`setup.board.boardRef "${boardRef}" is not a key in library.boards`);
  }

  // Building types a location may name (schema 0.4.7: `library.buildingTypes` is an open
  // registry, so the closed enum no longer guarantees the value means anything).
  //
  // `undefined` when the map isn't authored at all — and the check below is SKIPPED in that case
  // rather than failing every location. A document with no registry was already accepted at L2
  // before 0.4.7 (it just faults at play with "reinforce: no buildingType definition"), and
  // turning that into a load-time failure would reject documents that used to load. The Creator
  // shows the ungated version of this as an editor warning instead.
  const buildingTypesLib = obj(obj(s['library'])?.['buildingTypes']);
  const knownBuildingTypes = buildingTypesLib
    ? new Set(Object.keys(buildingTypesLib).map((k) => k.toLowerCase()))
    : undefined;

  // Per-board integrity: unique names; buildings resolvable; anchors/adjacency confined to this
  // board's locations; adjacency symmetric. Checked for EVERY authored board, not just the active
  // one, so an inactive board can't rot unnoticed.
  if (boardsLib) {
    for (const [bId, bRaw] of Object.entries(boardsLib)) {
      const b = obj(bRaw);
      if (!b) continue;
      const locs = arr(b['locations']) ?? [];
      const names = new Set<string>();
      for (const lRaw of locs) {
        const name = str(obj(lRaw)?.['name']);
        if (name === undefined) continue;
        if (names.has(name)) {
          errors.push(`board "${bId}" has duplicate location name "${name}"`);
        }
        names.add(name);

        // Compared lowercased, matching how the engine's boardStateFromDef normalizes it.
        const building = str(obj(lRaw)?.['building']);
        if (
          building !== undefined &&
          knownBuildingTypes !== undefined &&
          !knownBuildingTypes.has(building.toLowerCase())
        ) {
          errors.push(
            `board "${bId}" location "${name}" building "${building}" is not a key in library.buildingTypes`,
          );
        }
      }

      const anchors = obj(b['anchors']);
      if (anchors) {
        for (const key of Object.keys(anchors)) {
          if (!names.has(key)) {
            errors.push(`board "${bId}" anchors key "${key}" is not a location on that board`);
          }
        }
      }

      const adjacency = obj(b['adjacency']);
      if (adjacency) {
        for (const [from, toRaw] of Object.entries(adjacency)) {
          if (!names.has(from)) {
            errors.push(`board "${bId}" adjacency key "${from}" is not a location on that board`);
            continue;
          }
          for (const toVal of arr(toRaw) ?? []) {
            const to = str(toVal);
            if (to === undefined) continue;
            if (!names.has(to)) {
              errors.push(
                `board "${bId}" adjacency "${from}" → "${to}" names a location not on that board`,
              );
              continue;
            }
            const back = arr(adjacency[to]) ?? [];
            if (!back.some((v) => str(v) === from)) {
              errors.push(
                `board "${bId}" adjacency is not symmetric: "${from}" lists "${to}", but "${to}" does not list "${from}"`,
              );
            }
          }
        }
      }
    }
  }

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

  // library.dungeons intra-file refs: each dungeon's optional spawningQuestId must resolve to a
  // library.quests entry (the quest that spawns this dungeon). dungeon.subflow.props.dungeonId is
  // checked in the node loop below.
  const library = obj(s['library']);
  const dungeons = library ? obj(library['dungeons']) : undefined;
  const quests = library ? obj(library['quests']) : undefined;
  if (dungeons) {
    for (const [dId, dRaw] of Object.entries(dungeons)) {
      const d = obj(dRaw);
      const questId = d ? str(d['spawningQuestId']) : undefined;
      if (questId !== undefined && !(quests && questId in quests)) {
        errors.push(`dungeon "${dId}" spawningQuestId "${questId}" is not a key in library.quests`);
      }
    }
  }

  // Resolve a foe-placement pair {foeId, location} against the UDT roster + board locations.
  const checkSpawn = (
    foeId: string | undefined,
    location: string | undefined,
    ctx: string,
  ): void => {
    if (foeId !== undefined) {
      const f = udt.foeById[foeId];
      if (!f || f.kind !== 'foe') {
        errors.push(`${ctx} foeId "${foeId}" is not in the UDT foe roster`);
      }
    }
    if (location !== undefined && !activeLocations.has(location)) {
      errors.push(
        `${ctx} location "${location}" is not a known board location (${locationSource})`,
      );
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
          if (s2)
            checkSpawn(str(s2['foeId']), str(s2['location']), `node "${id}" boardSetup spawn`);
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
            errors.push(
              `node "${id}" lifecycle.selectHero heroId "${heroId}" is not in the UDT hero roster`,
            );
          }
          if (!(heroId in libHeroes)) {
            errors.push(
              `node "${id}" lifecycle.selectHero heroId "${heroId}" has no matching library.heroes entry`,
            );
          }
        }
        continue;
      }

      // dungeon.subflow: props.dungeonId must resolve to a library.dungeons entry
      if (kind === 'dungeon.subflow') {
        const dungeonId = props ? str(props['dungeonId']) : undefined;
        if (dungeonId !== undefined && !(dungeons && dungeonId in dungeons)) {
          errors.push(
            `node "${id}" dungeon.subflow dungeonId "${dungeonId}" is not a key in library.dungeons`,
          );
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
