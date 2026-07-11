// scaffold.ts — builds a minimal L1–L3-green ScenarioDoc from user-supplied inputs.
// The produced doc uses the full canonical turn-loop spine so it passes L3 BFS reachability.
// Load it via store.loadScenario(doc, true) so schemaToFlow auto-populates the canvas.

import type { ScenarioDoc } from '../types';

const SCHEMA_VERSION = '0.4.1';
const UDT_PIN = '5.0.0';

export interface ScaffoldInput {
  title: string;
  designer: string;
  scenarioVersion?: string;
  mode: 'coop' | 'competitive';
  difficultyProfile: 'heroic' | 'gritty';
  skullSupply: number;
  monthEndMin: number;
  monthEndMax: number;
  // Optional since schema 0.4.1 — a rule-variant scenario may omit the standard adversary/
  // foe-tier/main-goal mechanics. Omitted selections are left out of the doc entirely.
  adversaryId?: string;
  tier1FoeId?: string;
  tier2FoeId?: string;
  tier3FoeId?: string;
  allyId?: string;
  mainGoalTitle?: string;
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const baseEffect = { op: 'resource.gain', resource: 'warriors', amount: 1 };

// A minimal but schema-valid building type. buildingTypeDef requires free + enhanced + skullCapacity;
// enhanced requires cost + effects. Authors edit these later; the defaults just keep the doc L1-valid.
const baseBuildingType = {
  free: [baseEffect],
  enhanced: { cost: { resource: 'spirit', amount: 1 }, effects: [baseEffect] },
  skullCapacity: 3,
};

export function scaffoldScenario(input: ScaffoldInput): ScenarioDoc {
  const trimmedGoal = input.mainGoalTitle?.trim();
  const mainGoalId = trimmedGoal ? slugify(trimmedGoal) || 'main-goal' : undefined;
  const goalDoneFlag = 'goalDone';

  const foes: Record<string, string> = {};
  if (input.tier1FoeId) foes.tier1 = input.tier1FoeId;
  if (input.tier2FoeId) foes.tier2 = input.tier2FoeId;
  if (input.tier3FoeId) foes.tier3 = input.tier3FoeId;

  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      title: input.title,
      scenarioVersion: input.scenarioVersion ?? '0.1.0',
      // designer.name requires minLength 1 (schema). Fall back to a placeholder when left blank so a
      // title-only scenario stays L1-valid; the author can set a real name in the dialog.
      designer: { name: input.designer.trim() || 'Unknown' },
      pins: { udt: UDT_PIN },
    },
    setup: {
      mode: input.mode,
      difficulty: { profile: input.difficultyProfile, skullSupply: input.skullSupply },
      playerCountScaling: { turnsPerMonth: { '1': 6, '2': 7, '3': 8, '4': 9 } },
      monthEnd: {
        resolution: 'randomInRange',
        default: { minTurn: input.monthEndMin, maxTurn: input.monthEndMax },
      },
      selections: {
        ...(input.adversaryId ? { adversaryId: input.adversaryId } : {}),
        ...(Object.keys(foes).length > 0 ? { foes } : {}),
        ...(mainGoalId ? { mainGoalId } : {}),
        ...(input.allyId ? { allyId: input.allyId } : {}),
      },
      board: { boardStateRef: 'board-main' },
    },
    library: {
      buildingTypes: {
        citadel: baseBuildingType,
        sanctuary: baseBuildingType,
        village: baseBuildingType,
        bazaar: baseBuildingType,
      },
      quests: mainGoalId
        ? {
            [mainGoalId]: {
              id: mainGoalId,
              name: trimmedGoal,
              isMainGoal: true,
              outcomes: {
                success: [{ op: 'flag.set', name: goalDoneFlag, value: true }],
                failure: [{ op: 'corruption.gain' }],
              },
            },
          }
        : {},
    },
    graph: {
      entry: 'n-start',
      nodes: [
        { id: 'n-start',        kind: 'lifecycle.gameStart',    wires: { out: ['n-board-setup'] } },
        { id: 'n-board-setup',  kind: 'lifecycle.boardSetup',   wires: { out: ['n-start-month'] } },
        { id: 'n-start-month',  kind: 'lifecycle.startMonth',   wires: { out: ['n-player-turn'] } },
        { id: 'n-player-turn',  kind: 'lifecycle.playerTurn',   wires: { out: ['n-action-start'] } },
        { id: 'n-action-start', kind: 'lifecycle.actionStart',  wires: { out: ['n-action-mid'] } },
        { id: 'n-action-mid',   kind: 'lifecycle.actionMiddle', wires: { out: ['n-action-end'] } },
        { id: 'n-action-end',   kind: 'lifecycle.actionEnd',    wires: { out: ['n-month-check'] } },
        {
          id: 'n-month-check',
          kind: 'lifecycle.newMonthCheck',
          wires: { out: ['n-win-cond'], nextMonth: ['n-start-month'] },
        },
        {
          id: 'n-win-cond',
          kind: 'winloss.winCondition',
          props: {
            condition: { subject: 'flag', comparator: 'eq', value: true, key: goalDoneFlag },
          },
          wires: { met: ['n-game-end'], unmet: ['n-game-end'] },
        },
        { id: 'n-game-end', kind: 'lifecycle.gameEnd' },
      ],
    },
  };
}
