// scaffold.ts — builds a minimal L1–L3-green ScenarioDoc from user-supplied inputs.
// The produced doc uses the full canonical turn-loop spine so it passes L3 BFS reachability.
// Load it via store.loadScenario(doc, true) so schemaToFlow auto-populates the canvas.

import type { ScenarioDoc } from '../types';

const SCHEMA_VERSION = '0.4.0';
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
  adversaryId: string;
  tier1FoeId: string;
  tier2FoeId: string;
  tier3FoeId: string;
  allyId?: string;
  mainGoalTitle: string;
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

const baseEffect = { op: 'resource.gain', resource: 'warriors', amount: 1 };

export function scaffoldScenario(input: ScaffoldInput): ScenarioDoc {
  const mainGoalId = slugify(input.mainGoalTitle) || 'main-goal';
  const goalDoneFlag = 'goalDone';

  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      title: input.title,
      scenarioVersion: input.scenarioVersion ?? '0.1.0',
      designer: { name: input.designer },
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
        adversaryId: input.adversaryId,
        foes: {
          tier1: input.tier1FoeId,
          tier2: input.tier2FoeId,
          tier3: input.tier3FoeId,
        },
        mainGoalId,
        ...(input.allyId ? { allyId: input.allyId } : {}),
      },
      board: { boardStateRef: 'board-main' },
    },
    library: {
      buildingTypes: {
        citadel: { free: [baseEffect], skullCapacity: 3 },
        sanctuary: { free: [baseEffect], skullCapacity: 3 },
        village: { free: [baseEffect], skullCapacity: 3 },
        bazaar: { free: [baseEffect], skullCapacity: 3 },
      },
      quests: {
        [mainGoalId]: {
          id: mainGoalId,
          name: input.mainGoalTitle,
          isMainGoal: true,
          outcomes: {
            success: [{ op: 'flag.set', name: goalDoneFlag, value: true }],
            failure: [{ op: 'corruption.gain' }],
          },
        },
      },
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
