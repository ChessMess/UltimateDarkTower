// Hand-written public types for @udtc/engine (build guide §6).
// Derived from engine.js §2.3 public API surface + internal state shape (Phase 2).

export declare const ENGINE_VERSION: string;
export declare const SUPPORTED_SCHEMA_RANGE: string;

// ---- core status & game-state ----

export type Status = 'running' | 'awaitingInput' | 'won' | 'lost' | 'ended';

export type FoeStatus = 'panicked' | 'unsteady' | 'ready' | 'savage' | 'lethal';

export type Kingdom = 'north' | 'south' | 'east' | 'west';

export type ActionChoice = 'quest' | 'cleanse' | 'reinforce' | 'pass' | 'battle' | 'trade' | 'move' | 'dungeon';

export type CardinalDirection = 'N' | 'E' | 'S' | 'W';

export interface HeroState {
  warriors: number;
  spirit: number;
  corruption: number;
  advantages: number;
  virtues: { active: string[]; inactive: string[] };
  items: { gear: string[]; treasure: string[]; potions: string[]; questItems: string[] };
  companions: string[];
  counters: Record<string, number>;
}

export interface FoeInstance {
  instanceId: string;
  foeId: string;
  status: FoeStatus;
  traits?: string[];
  location: string | null;
}

export interface AdversaryState {
  foeId: string;
  spawned: boolean;
  defeated: boolean;
  advantages: unknown[];
  advantagesBanked: number;
  questProgress: number;
  battleProgress: number;
}

export interface BattleCard {
  advantage: string;
  strikes: number;
  critical?: boolean;
  onResolve?: unknown[];
}

export interface BattleCursor {
  foeId: string;
  isAdversary: boolean;
  level: number;
  cards: BattleCard[];
  resolved: number;
}

export interface DungeonCursor {
  dungeonId: string;
  completed: string | undefined;
  left: string | undefined;
  currentRoom: string | null;
  currentRoomNode: string | null;
}

export interface ClockLatches {
  bannerUsed: boolean;
  heroicActionUsed: boolean;
  reinforceUsed: boolean;
  tradeUsed: boolean;
  itemLock: boolean;
}

export interface EngineClock {
  month: number;
  turnInMonth: number;
  turnsThisMonth: number;
  cursor: string | undefined;
  pending: { request: InputRequest } | null;
  activeHero: string;
  turnOrder: string[];
  firstPlayerOfMonth: string;
  latches: ClockLatches;
  dungeon: DungeonCursor | null;
  battle: BattleCursor | null;
}

export interface SkullsState {
  supply: number;
  onBoard: number;
}

export interface TowerMirror {
  drums: [number, number, number];
  glyphFacing: Record<string, string | null>;
  calibrated: boolean;
}

export interface DungeonRunState {
  clearedRooms: string[];
  improvedRooms: string[];
}

export interface Outcome {
  status: Status;
  reason: string | null;
}

export interface EngineState {
  meta: { scenarioVersion: string; schemaVersion: string; engine: string };
  clock: EngineClock;
  kingdoms: { ownership: Record<string, string>; dormant: string[] };
  heroes: Record<string, HeroState>;
  foes: FoeInstance[];
  adversary: AdversaryState;
  skulls: SkullsState;
  decks: Record<string, { draw: unknown[]; discard: unknown[] }>;
  market: unknown[];
  monuments: unknown[];
  markers: Array<{ location: unknown; markerType: string; quest?: string }>;
  tokens: Array<{ tokenTypeId: string; target: unknown }>;
  flags: Record<string, unknown>;
  counters: Record<string, number>;
  sealsRemoved: number;
  brokenSeals: string[];
  quests: Record<string, { complete: boolean }>;
  mainGoalComplete: boolean;
  dungeons: Record<string, DungeonRunState>;
  tower: TowerMirror;
  rng: string;
  outcome: Outcome;
  // Load-time private fields (present at runtime; do not construct or mutate)
  _nodes: Record<string, unknown>;
  _lib: unknown;
  _spine: Record<string, string | undefined>;
  _setup: { monthEnd: unknown; mainGoalId: string; goalThreshold: number; adversaryToughness: number };
  _lastDraw?: unknown;
}

// ---- directives (§5.2 closed vocabulary) ----
// Each directive type is the `type` discriminant; payloads match what engine.js pushes.

export interface UiUpdateDirective {
  type: 'ui.update';
  delta: Record<string, unknown>;
}

export interface UiPromptDirective {
  type: 'ui.prompt';
  kind: string;
  requestId?: string;
  text?: string;
  options?: Array<{ id: string }>;
  cards?: number;
  room?: string;
  doors?: string[];
}

export type TowerChannelName =
  | 'light.named' | 'light.custom' | 'light.effect'
  | 'sound' | 'drum.rotate'
  | 'seal.break' | 'seal.replace'
  | 'skull.dropTrigger' | 'wait' | 'rotationBundle' | 'timeline';

export type TowerChannelOp =
  | { channel: 'skull.dropTrigger' }
  | { channel: 'light.named'; sequenceId: string }
  | { channel: 'light.custom'; sequenceId?: string; [k: string]: unknown }
  | { channel: 'light.effect'; [k: string]: unknown }
  | { channel: 'sound'; category: string }
  | { channel: 'drum.rotate'; [k: string]: unknown }
  | { channel: 'seal.break'; seal: string }
  | { channel: 'seal.replace'; seal: string }
  | { channel: 'wait'; [k: string]: unknown }
  | { channel: 'rotationBundle'; [k: string]: unknown }
  | { channel: 'timeline'; [k: string]: unknown };

export interface TowerProgramDirective {
  type: 'tower.program';
  ops?: TowerChannelOp[];
  /** Broken-seal sidecar — sent to the Display adapter (§5.2) */
  brokenSeals?: string[];
  target?: string;
}

export interface BoardMutateDirective {
  type: 'board.mutate';
  command: string;
  args: Record<string, unknown>;
}

export interface LogEntryDirective {
  type: 'log.entry';
  event: string;
  [k: string]: unknown;
}

export interface MediaPlayDirective {
  type: 'media.play';
  media: string;
  text?: string;
}

export type Directive =
  | UiUpdateDirective
  | UiPromptDirective
  | TowerProgramDirective
  | BoardMutateDirective
  | LogEntryDirective
  | MediaPlayDirective;

// ---- input requests (what the engine asks for at an await boundary) ----

export type InputRequest =
  | { id: 'action'; kind: 'choice'; options: Array<{ id: string }> }
  | { id: 'target'; kind: 'target' }
  | { id: 'advantageSpend'; kind: 'advantageSpend' }
  | { id: 'trade'; kind: 'choice' }
  | { id: 'moveTarget'; kind: 'target' }
  | { id: 'dungeonMove'; kind: 'choice'; requestId: string; text: string; room: string; doors: string[] }
  | { id: 'dungeonRoomAdvantage'; kind: 'advantageSpend'; requestId: string; text: string; room: string }
  | { id: 'skullCounter'; kind: 'observed'; observed: 'skullCounter' };

// ---- inputs (what the caller supplies in response to an InputRequest) ----

export type TradeAsset =
  | { asset: 'warriors' | 'spirit'; amount: number }
  | { asset: 'item'; itemRef: string }
  | { asset: 'companion'; companionId: string };

export interface TradeDecision {
  from: string;
  to: string;
  give?: TradeAsset[];
  receive?: TradeAsset[];
}

export type Input =
  | { requestId: 'action'; value: ActionChoice; kind: 'decision' }
  | { requestId: 'target'; value: { foeId?: string; adversary?: boolean }; kind: 'decision' }
  | { requestId: 'advantageSpend'; value: { spend?: number; retreat?: boolean; improve?: boolean }; kind: 'decision' }
  | { requestId: 'trade'; value: TradeDecision; kind: 'decision' }
  | { requestId: 'moveTarget'; value: { to: unknown }; kind: 'decision' }
  | { requestId: 'dungeonRoomAdvantage'; value: { improve?: boolean }; kind: 'decision' }
  | { requestId: 'dungeonMove'; value: { leave?: boolean; direction?: CardinalDirection }; kind: 'decision' }
  | { requestId: 'skullCounter'; value: number; kind: 'observed' }
  | { kind: 'control' };

// ---- public API (§2.3) ----

export interface InitOpts {
  seed: string;
  playerCount?: 1 | 2 | 3 | 4;
  resolver?: unknown;
}

export interface StepResult {
  state: EngineState;
  directives: Directive[];
  status: Status;
  awaiting?: InputRequest;
}

export declare function init(scenario: unknown, opts: InitOpts): StepResult;
export declare function step(state: EngineState, input: Input): StepResult;
export declare function replay(scenario: unknown, opts: InitOpts, inputs: Input[]): StepResult[];
export declare function serialize(state: EngineState): string;
export declare function deserialize(blob: string): EngineState;
export declare function digest(state: EngineState): string;
export declare function evalCondition(condition: unknown, state: EngineState): boolean;

/** The playable golden MVP scenario used by the engine test suite (lockstep_test). */
export declare const golden: unknown;
