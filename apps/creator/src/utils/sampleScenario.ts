// The sample scenario, shared by the ScenarioBar's "Load Sample Scenario" and the canvas empty state.

import { goldenFull } from '@udtc/engine';
import { syncDungeonNodes } from '../dungeons/dungeonNodes';
import type { ScenarioDoc } from '../types';
import type { Dungeon } from '../dungeons/shared';

// goldenFull's dungeon.room nodes are hand-authored directly in the engine fixture, so they never
// pass through the Creator's Dungeons-tab editing flow that would normally generate their util.group
// wrapper (syncDungeonNodes). Run it once here, on load, so the sample scenario's dungeon rooms
// render grouped on the canvas like any dungeon authored through the UI.
function buildBaseScenario(): ScenarioDoc {
  const doc = goldenFull as ScenarioDoc;
  const dungeons = (doc.library as Record<string, unknown> | undefined)?.dungeons as
    Record<string, Dungeon> | undefined;
  if (!dungeons || Object.keys(dungeons).length === 0) return doc;
  const { nodes, positions } = syncDungeonNodes(doc, dungeons);
  return {
    ...doc,
    meta: {
      ...doc.meta,
      layout: {
        ...doc.meta.layout,
        positions: { ...(doc.meta.layout?.positions ?? {}), ...positions },
      },
    },
    graph: { ...doc.graph, nodes },
  };
}

/**
 * The engine's own golden scenario — the base-game fidelity build (full turn structure, buildings,
 * events, monthly quests), guaranteed runnable by the simulator: the same fixture the engine's
 * lockstep/full-turn test suites drive end-to-end.
 */
export const SAMPLE_SCENARIO = buildBaseScenario();
