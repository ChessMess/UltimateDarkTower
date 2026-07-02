export const NODE_KINDS = [
  'lifecycle.gameStart', 'lifecycle.importSeed', 'lifecycle.selectGameDifficulty',
  'lifecycle.selectAdversary', 'lifecycle.selectFoes', 'lifecycle.selectMainGoal',
  'lifecycle.selectAlly', 'lifecycle.boardSetup', 'lifecycle.startMonth', 'lifecycle.playerTurn',
  'lifecycle.actionStart', 'lifecycle.actionMiddle', 'lifecycle.actionEnd',
  'lifecycle.newMonthCheck', 'lifecycle.newQuests', 'lifecycle.gameEnd',
  'action.banner', 'action.move', 'action.cleanse', 'action.battle', 'action.quest',
  'action.reinforce', 'action.skullDrop', 'action.endTurn', 'action.trade',
  'battle.selectFoe', 'battle.cardSelect', 'battle.applyAdvantage', 'battle.retreat',
  'battle.end', 'battle.removeFoeNoBattle', 'battle.foeStatus',
  'dungeon.subflow', 'dungeon.room', 'dungeon.relicTower',
  'event.router', 'event.foesStrike', 'event.foesSpawn', 'event.foesGrow',
  'event.towerStirs', 'event.towerActs', 'event.companion', 'event.newWares', 'event.readAloud',
  'trigger.schedule', 'trigger.onState', 'cond.check', 'cond.branch', 'cond.glyphGate',
  'cond.random', 'cond.setFlag',
  'effect.apply',
  'tower.op',
  'media.playVideo', 'media.playSound', 'media.showImage', 'media.narration', 'media.cutscene',
  'winloss.mainGoal', 'winloss.winCondition', 'winloss.lossCondition', 'winloss.competitiveEnd',
  'util.linkOut', 'util.linkIn', 'util.group', 'util.comment', 'util.catch',
] as const;

export type NodeKind = (typeof NODE_KINDS)[number];

// Documentation-only kinds: never executed by the engine, never wired, exempt from L3 reachability.
export const ANNOTATION_KINDS = new Set<NodeKind>(['util.comment', 'util.group']);

export interface SchemaNode {
  id: string;
  kind: NodeKind;
  label?: string;
  description?: string;
  surface?: 'app' | 'tower' | 'media' | 'silent' | 'authorOnly';
  props?: Record<string, unknown>;
  wires?: Record<string, string[]>;
}

// props shape for kind === 'util.group'
export interface GroupProps {
  color?: string;
  nodeIds: string[];
}

export interface LayoutPosition {
  x: number;
  y: number;
}

export interface LayoutSidecar {
  positions?: Record<string, LayoutPosition>;
}

export interface ScenarioDoc {
  schemaVersion: string;
  meta: {
    title: string;
    description?: string;
    scenarioVersion?: string;
    designer?: { name?: string; handle?: string };
    pins?: Record<string, string>;
    provenance?: Record<string, unknown>;
    tags?: string[];
    layout?: LayoutSidecar;
    [key: string]: unknown;
  };
  setup: Record<string, unknown>;
  library?: Record<string, unknown>;
  graph: {
    entry: string;
    nodes: SchemaNode[];
  };
}

export interface LayerResult {
  ok: boolean;
  errors: string[];
}

export interface ValidationResults {
  l1: LayerResult;
  l2: LayerResult;
  l3: LayerResult;
  allOk: boolean;
}

export interface NodeCategory {
  prefix: string;
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}

export const NODE_CATEGORIES: NodeCategory[] = [
  { prefix: 'lifecycle', label: 'Lifecycle', color: '#2563EB', bgColor: '#DBEAFE', textColor: '#1E3A8A' },
  { prefix: 'action', label: 'Actions', color: '#059669', bgColor: '#D1FAE5', textColor: '#064E3B' },
  { prefix: 'battle', label: 'Battle', color: '#DC2626', bgColor: '#FEE2E2', textColor: '#7F1D1D' },
  { prefix: 'dungeon', label: 'Dungeon', color: '#7C3AED', bgColor: '#EDE9FE', textColor: '#4C1D95' },
  { prefix: 'event', label: 'Events', color: '#D97706', bgColor: '#FEF3C7', textColor: '#78350F' },
  { prefix: 'cond', label: 'Conditions', color: '#CA8A04', bgColor: '#FEF9C3', textColor: '#713F12' },
  { prefix: 'trigger', label: 'Triggers', color: '#0891B2', bgColor: '#CFFAFE', textColor: '#164E63' },
  { prefix: 'effect', label: 'Effects', color: '#65A30D', bgColor: '#ECFCCB', textColor: '#365314' },
  { prefix: 'tower', label: 'Tower', color: '#4B5563', bgColor: '#F3F4F6', textColor: '#1F2937' },
  { prefix: 'media', label: 'Media', color: '#DB2777', bgColor: '#FCE7F3', textColor: '#831843' },
  { prefix: 'winloss', label: 'Win / Loss', color: '#B45309', bgColor: '#FEF3C7', textColor: '#78350F' },
  { prefix: 'util', label: 'Utility', color: '#374151', bgColor: '#E5E7EB', textColor: '#111827' },
];

export function categoryFor(kind: string): NodeCategory {
  const prefix = kind.split('.')[0];
  return (
    NODE_CATEGORIES.find((c) => c.prefix === prefix) ??
    NODE_CATEGORIES[NODE_CATEGORIES.length - 1]
  );
}

// Named output handles per node kind — any kind not listed defaults to ['out']
export const OUTPUT_HANDLES: Partial<Record<NodeKind, string[]>> = {
  'lifecycle.actionMiddle': ['out', 'battle', 'dungeon', 'trade'],
  'lifecycle.gameEnd': ['won', 'lost'],
  'cond.branch': ['true', 'false'],
  'cond.check': ['pass', 'fail'],
  'cond.glyphGate': ['match', 'nomatch'],
  'cond.random': ['out'],
  'dungeon.subflow': ['enter', 'completed', 'left'],
  'event.router': ['quest', 'foesStrike', 'foesSpawn', 'foesGrow', 'towerStirs', 'towerActs', 'companion', 'newWares'],
  'util.catch': ['out'],
};

export function outputHandlesFor(kind: NodeKind): string[] {
  const explicit = OUTPUT_HANDLES[kind];
  if (explicit !== undefined) return explicit;
  if (kind === 'util.group' || kind === 'util.comment' || kind === 'util.linkIn') return [];
  return ['out'];
}

// Data carried by each RF node — must extend Record<string, unknown> for @xyflow/react
export interface CreatorNodeData extends Record<string, unknown> {
  schemaNode: SchemaNode;
  isEntry: boolean;
  hasErrors: boolean;
  errorMessages: string[];
}
