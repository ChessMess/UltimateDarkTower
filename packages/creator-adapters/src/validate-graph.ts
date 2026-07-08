// L3 graph/semantic checks (Schema §9 L3): structural integrity of the scenario graph.
// Runs after L1 (schema) and L2 (reference resolution). Validates:
//   - entry node id exists in nodes
//   - every wire target id exists in nodes
//   - all nodes are reachable from a graph ROOT (no orphan nodes). Roots are the entry node
//     plus the engine-fired roots that are entered by the spine rather than by a wire:
//     trigger.schedule / trigger.onState (end-of-turn event chains) and lifecycle.newQuests
//     (routed from newMonthCheck at each month rollover).
//   - annotation nodes (util.comment / util.group) are documentation-only: exempt from
//     reachability, must not carry wires, must not be a wire target, and (for util.group)
//     props.nodeIds must reference existing non-group nodes
//   - skull supply > 0
//   - no skull.dropTrigger op carries a count (skull invariant, belt-and-suspenders)
//   - dungeon structural rules (one entrance/target, cells in grid, door reciprocity, target
//     reachable) + subflow-gated room-node/wiring rules (see validateDungeons)

export type L3Result = { ok: boolean; errors: string[] };

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

export function validateGraph(scenario: unknown): L3Result {
  const errors: string[] = [];
  const s = obj(scenario);
  if (!s) return { ok: false, errors: ['scenario is not an object'] };

  const graph = obj(s['graph']);
  if (!graph) return { ok: false, errors: ['scenario.graph is missing'] };

  const entry = str(graph['entry']);
  const rawNodes = arr(graph['nodes']) ?? [];

  // Build id → node map; collect the engine-fired roots (entered by the spine, not a wire)
  const ENGINE_ROOT_KINDS = new Set(['trigger.schedule', 'trigger.onState', 'lifecycle.newQuests']);
  // Documentation-only nodes: never executed by the engine, never wired, exempt from reachability
  const ANNOTATION_KINDS = new Set(['util.comment', 'util.group']);
  const nodeIds = new Set<string>();
  const kindById = new Map<string, string>();
  const engineRoots: string[] = [];
  for (const n of rawNodes) {
    const node = obj(n);
    const id = str(node?.['id']);
    if (!id) continue;
    nodeIds.add(id);
    const kind = str(node?.['kind']);
    if (kind) kindById.set(id, kind);
    if (kind && ENGINE_ROOT_KINDS.has(kind)) engineRoots.push(id);
  }

  // Entry must exist
  if (!entry) {
    errors.push('graph.entry is missing');
  } else if (!nodeIds.has(entry)) {
    errors.push(`graph.entry "${entry}" does not match any node id`);
  }

  // Collect all wire targets; check each exists
  const adjacency = new Map<string, string[]>();
  for (const n of rawNodes) {
    const node = obj(n);
    if (!node) continue;
    const id = str(node['id']);
    if (!id) continue;
    const kind = kindById.get(id);
    const isAnnotation = kind !== undefined && ANNOTATION_KINDS.has(kind);
    const neighbors: string[] = [];
    const wires = obj(node['wires']);
    if (wires && Object.keys(wires).length > 0) {
      if (isAnnotation) {
        errors.push(`node "${id}" is an annotation node ("${kind}") and must not have wires`);
      }
      for (const port of Object.keys(wires)) {
        const targets = arr(wires[port]) ?? [];
        for (const t of targets) {
          const targetId = str(t);
          if (!targetId) continue;
          neighbors.push(targetId);
          if (!nodeIds.has(targetId)) {
            errors.push(
              `node "${id}" wire "${port}" references nonexistent node id "${targetId}"`,
            );
          } else {
            const targetKind = kindById.get(targetId);
            if (targetKind !== undefined && ANNOTATION_KINDS.has(targetKind)) {
              errors.push(
                `node "${id}" wire "${port}" targets annotation node "${targetId}" ("${targetKind}")`,
              );
            }
          }
        }
      }
    }
    // Also scan props for towerOp skull.dropTrigger with a count (skull invariant)
    const props = obj(node['props']);
    const towerOp = props ? obj(props['towerOp']) : undefined;
    if (towerOp && str(towerOp['channel']) === 'skull.dropTrigger' && 'count' in towerOp) {
      errors.push(
        `node "${id}" skull.dropTrigger carries a "count" field — violates skull invariant`,
      );
    }
    // util.group: props.nodeIds must reference existing, non-group member nodes (no nesting)
    if (kind === 'util.group') {
      const nodeIdsProp = props ? props['nodeIds'] : undefined;
      const memberIds = arr(nodeIdsProp);
      if (!memberIds) {
        errors.push(`node "${id}" is a util.group and its props.nodeIds must be an array`);
      } else {
        for (const m of memberIds) {
          const memberId = str(m);
          if (!memberId) continue;
          if (!nodeIds.has(memberId)) {
            errors.push(`node "${id}" props.nodeIds references nonexistent node id "${memberId}"`);
          } else if (kindById.get(memberId) === 'util.group') {
            errors.push(`node "${id}" props.nodeIds references another util.group "${memberId}" — nested groups are not supported`);
          }
        }
      }
    }
    adjacency.set(id, neighbors);
  }

  // Reachability from the roots (BFS) — detect orphan nodes
  if (entry && nodeIds.has(entry)) {
    const visited = new Set<string>();
    const queue = [entry, ...engineRoots];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      for (const next of adjacency.get(cur) ?? []) {
        if (!visited.has(next)) queue.push(next);
      }
    }
    for (const id of nodeIds) {
      const kind = kindById.get(id);
      if (!visited.has(id) && !(kind !== undefined && ANNOTATION_KINDS.has(kind))) {
        errors.push(`node "${id}" is unreachable from graph.entry`);
      }
    }
  }

  // skull supply must be positive
  const setup = obj(s['setup']);
  const difficulty = setup ? obj(setup['difficulty']) : undefined;
  const supply = difficulty?.['skullSupply'];
  if (typeof supply === 'number' && supply <= 0) {
    errors.push(`setup.difficulty.skullSupply must be > 0 (got ${supply})`);
  }

  // dungeon structural + subflow-gated graph checks
  validateDungeons(s, rawNodes, errors);

  return { ok: errors.length === 0, errors };
}

// Cardinal-direction geometry. Screen coords: E = col+1, W = col-1, S = row+1, N = row-1
// (matches the engine golden fixture: entry E:door leads to hall at col+1; hall S:door to treasury
// at row+1).
const DIRS = ['N', 'E', 'S', 'W'] as const;
type Dir = (typeof DIRS)[number];
const OPPOSITE: Record<Dir, Dir> = { N: 'S', S: 'N', E: 'W', W: 'E' };
const DELTA: Record<Dir, { dc: number; dr: number }> = {
  N: { dc: 0, dr: -1 },
  S: { dc: 0, dr: 1 },
  E: { dc: 1, dr: 0 },
  W: { dc: -1, dr: 0 },
};

// L3 dungeon rules (schema §dungeon $comment). Structural rules apply to every library.dungeons
// entry; the room-node/wiring rules apply ONLY to a dungeon that a dungeon.subflow node references
// (the Creator auto-syncs those nodes — this is the load-time backstop for hand-edited/imported
// drift, mirroring the lifecycle.selectHero L2 backstop). A library-only dungeon is not flagged.
function validateDungeons(
  s: Record<string, unknown>,
  rawNodes: unknown[],
  errors: string[],
): void {
  const library = obj(s['library']);
  const dungeons = library ? obj(library['dungeons']) : undefined;
  if (!dungeons) return;

  // Which dungeonIds are referenced by a dungeon.subflow, and the subflow node(s) per dungeon.
  const subflowsByDungeon = new Map<string, Record<string, unknown>[]>();
  // dungeon.room nodes aren't self-labeled with their dungeonId; index every one by its props.roomId
  // and associate it with a dungeon via that dungeon's room ids below.
  const roomNodesByRoomId = new Map<string, Record<string, unknown>[]>();
  for (const n of rawNodes) {
    const node = obj(n);
    if (!node) continue;
    const kind = str(node['kind']);
    const props = obj(node['props']);
    if (kind === 'dungeon.subflow') {
      const dId = props ? str(props['dungeonId']) : undefined;
      if (dId) {
        const list = subflowsByDungeon.get(dId) ?? [];
        list.push(node);
        subflowsByDungeon.set(dId, list);
      }
    } else if (kind === 'dungeon.room') {
      const roomId = props ? str(props['roomId']) : undefined;
      if (roomId) {
        const list = roomNodesByRoomId.get(roomId) ?? [];
        list.push(node);
        roomNodesByRoomId.set(roomId, list);
      }
    }
  }

  const cellOf = (room: Record<string, unknown>): { col: number; row: number } | undefined => {
    const cell = obj(room['cell']);
    const col = typeof cell?.['col'] === 'number' ? (cell['col'] as number) : undefined;
    const row = typeof cell?.['row'] === 'number' ? (cell['row'] as number) : undefined;
    return col === undefined || row === undefined ? undefined : { col, row };
  };

  for (const [dId, dRaw] of Object.entries(dungeons)) {
    const d = obj(dRaw);
    if (!d) continue;
    const grid = obj(d['grid']);
    const cols = typeof grid?.['cols'] === 'number' ? (grid['cols'] as number) : 0;
    const rows = typeof grid?.['rows'] === 'number' ? (grid['rows'] as number) : 0;
    const rooms = (arr(d['rooms']) ?? []).map(obj).filter((r): r is Record<string, unknown> => !!r);

    // Index rooms by cell + collect entrance/target.
    const roomByCell = new Map<string, Record<string, unknown>>();
    const roomById = new Map<string, Record<string, unknown>>();
    let entranceCount = 0;
    let targetCount = 0;
    let entranceRoom: Record<string, unknown> | undefined;
    for (const room of rooms) {
      const rid = str(room['id']) ?? '?';
      roomById.set(rid, room);
      if (room['isEntrance'] === true) {
        entranceCount++;
        entranceRoom = room;
      }
      if (room['isTarget'] === true) targetCount++;
      const pos = cellOf(room);
      if (!pos) continue;
      if (pos.col < 0 || pos.row < 0 || pos.col >= cols || pos.row >= rows) {
        errors.push(`dungeon "${dId}" room "${rid}" cell (${pos.col},${pos.row}) is outside the ${cols}x${rows} grid`);
      }
      const key = `${pos.col},${pos.row}`;
      if (roomByCell.has(key)) {
        errors.push(`dungeon "${dId}" room "${rid}" shares cell (${pos.col},${pos.row}) with another room`);
      } else {
        roomByCell.set(key, room);
      }
    }

    if (entranceCount !== 1) {
      errors.push(`dungeon "${dId}" must have exactly one isEntrance room (found ${entranceCount})`);
    }
    if (targetCount !== 1) {
      errors.push(`dungeon "${dId}" must have exactly one isTarget room (found ${targetCount})`);
    }

    // Door reciprocity: a door on side D of a room must face an adjacent room whose opposite side is
    // also a door.
    for (const room of rooms) {
      const rid = str(room['id']) ?? '?';
      const exits = obj(room['exits']) ?? {};
      const pos = cellOf(room);
      if (!pos) continue;
      for (const dir of DIRS) {
        if (exits[dir] !== 'door') continue;
        const nk = `${pos.col + DELTA[dir].dc},${pos.row + DELTA[dir].dr}`;
        const neighbor = roomByCell.get(nk);
        if (!neighbor) {
          errors.push(`dungeon "${dId}" room "${rid}" has a ${dir} door facing no room`);
          continue;
        }
        const nExits = obj(neighbor['exits']) ?? {};
        if (nExits[OPPOSITE[dir]] !== 'door') {
          const nid = str(neighbor['id']) ?? '?';
          errors.push(`dungeon "${dId}" room "${rid}" ${dir} door is not reciprocated by room "${nid}" (${OPPOSITE[dir]} door)`);
        }
      }
    }

    // Target reachable from the entrance via doors (BFS over reciprocal door links).
    if (entranceRoom && targetCount === 1) {
      const seen = new Set<string>();
      const startId = str(entranceRoom['id']);
      if (startId) {
        const queue = [startId];
        while (queue.length) {
          const cur = queue.shift()!;
          if (seen.has(cur)) continue;
          seen.add(cur);
          const room = roomById.get(cur);
          if (!room) continue;
          const pos = cellOf(room);
          const exits = obj(room['exits']) ?? {};
          if (!pos) continue;
          for (const dir of DIRS) {
            if (exits[dir] !== 'door') continue;
            const nb = roomByCell.get(`${pos.col + DELTA[dir].dc},${pos.row + DELTA[dir].dr}`);
            const nid = nb ? str(nb['id']) : undefined;
            if (nid && !seen.has(nid)) queue.push(nid);
          }
        }
      }
      const target = rooms.find((r) => r['isTarget'] === true);
      const targetId = target ? str(target['id']) : undefined;
      if (targetId && !seen.has(targetId)) {
        errors.push(`dungeon "${dId}" target room "${targetId}" is not reachable from the entrance via doors`);
      }
    }

    // Subflow-gated graph checks: only for a dungeon a dungeon.subflow references.
    const subflows = subflowsByDungeon.get(dId);
    if (subflows && subflows.length > 0) {
      // Every room must have a matching dungeon.room node.
      const nodeForRoom = new Map<string, Record<string, unknown>>();
      for (const room of rooms) {
        const rid = str(room['id']);
        if (!rid) continue;
        const cands = roomNodesByRoomId.get(rid) ?? [];
        if (cands.length === 0) {
          errors.push(`dungeon "${dId}" (referenced by a dungeon.subflow) has no dungeon.room node for room "${rid}"`);
        } else {
          nodeForRoom.set(rid, cands[0]);
        }
      }
      // Each room node's directional wires must match the def's doors and point at the neighbor's node.
      for (const room of rooms) {
        const rid = str(room['id']);
        if (!rid) continue;
        const roomNode = nodeForRoom.get(rid);
        if (!roomNode) continue;
        const nodeId = str(roomNode['id']) ?? '?';
        const wires = obj(roomNode['wires']) ?? {};
        const exits = obj(room['exits']) ?? {};
        const pos = cellOf(room);
        for (const dir of DIRS) {
          const isDoor = exits[dir] === 'door';
          const wired = arr(wires[dir]) ?? [];
          if (isDoor && wired.length === 0) {
            errors.push(`dungeon "${dId}" room node "${nodeId}" is missing a ${dir} wire for its ${dir} door`);
          } else if (!isDoor && wired.length > 0) {
            errors.push(`dungeon "${dId}" room node "${nodeId}" has a ${dir} wire but room "${rid}" has no ${dir} door`);
          }
          if (isDoor && wired.length > 0 && pos) {
            const nb = roomByCell.get(`${pos.col + DELTA[dir].dc},${pos.row + DELTA[dir].dr}`);
            const nbId = nb ? str(nb['id']) : undefined;
            const expected = nbId ? nodeForRoom.get(nbId) : undefined;
            const expectedNodeId = expected ? str(expected['id']) : undefined;
            if (expectedNodeId && !wired.map(str).includes(expectedNodeId)) {
              errors.push(`dungeon "${dId}" room node "${nodeId}" ${dir} wire does not target the adjacent room's node "${expectedNodeId}"`);
            }
          }
        }
      }
      // Each subflow's enter wire must target the entrance room's node.
      const entranceId = entranceRoom ? str(entranceRoom['id']) : undefined;
      const entranceNode = entranceId ? nodeForRoom.get(entranceId) : undefined;
      const entranceNodeId = entranceNode ? str(entranceNode['id']) : undefined;
      if (entranceNodeId) {
        for (const sf of subflows) {
          const sfId = str(sf['id']) ?? '?';
          const wires = obj(sf['wires']) ?? {};
          const enter = (arr(wires['enter']) ?? []).map(str);
          if (!enter.includes(entranceNodeId)) {
            errors.push(`dungeon.subflow "${sfId}" enter wire must target the entrance room node "${entranceNodeId}" of dungeon "${dId}"`);
          }
        }
      }
    }
  }
}
