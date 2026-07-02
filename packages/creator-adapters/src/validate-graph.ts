// L3 graph/semantic checks (Schema §9 L3): structural integrity of the scenario graph.
// Runs after L1 (schema) and L2 (reference resolution). Validates:
//   - entry node id exists in nodes
//   - every wire target id exists in nodes
//   - all nodes are reachable from a graph ROOT (no orphan nodes). Roots are the entry node
//     plus the engine-fired roots that are entered by the spine rather than by a wire:
//     trigger.schedule / trigger.onState (end-of-turn event chains) and lifecycle.newQuests
//     (routed from newMonthCheck at each month rollover).
//   - skull supply > 0
//   - no skull.dropTrigger op carries a count (skull invariant, belt-and-suspenders)

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
  const nodeIds = new Set<string>();
  const engineRoots: string[] = [];
  for (const n of rawNodes) {
    const node = obj(n);
    const id = str(node?.['id']);
    if (!id) continue;
    nodeIds.add(id);
    const kind = str(node?.['kind']);
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
    const neighbors: string[] = [];
    const wires = obj(node['wires']);
    if (wires) {
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
      if (!visited.has(id)) {
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

  return { ok: errors.length === 0, errors };
}
