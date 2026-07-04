// types.ts — the single, TYPE-CHECKED source of truth for @udtc/engine's public surface (build
// guide §6). `src/index.d.ts` re-exports from this file, so the type model is validated by the
// engine's `tsc --noEmit` gate rather than drifting in a hand-maintained declaration file.
//
// This file is TYPES ONLY — it has no runtime and the engine's JS never imports it, so it cannot
// affect determinism. It closes the effect-op and node-kind vocabularies (invariant #4): the unions
// below are the authoritative catalog the reducer implements. (Compile-time *exhaustiveness* of the
// reducer switches against these unions lands with the deferred `.js`→`.ts` port; today the JS runs
// unchecked and these unions serve consumers + document the closed sets.)

// ---- core status & game-state ----

export type Status = 'running' | 'awaitingInput' | 'won' | 'lost' | 'ended';

export type FoeStatus = 'panicked' | 'unsteady' | 'ready' | 'savage' | 'lethal';

export type Kingdom = 'north' | 'south' | 'east' | 'west';

export type BuildingType = 'citadel' | 'sanctuary' | 'village' | 'bazaar';

export type ActionChoice =
  | 'quest'
  | 'cleanse'
  | 'reinforce'
  | 'pass'
  | 'battle'
  | 'trade'
  | 'move'
  | 'dungeon'
  // full-turn protocol (scenarios whose actionMiddle carries props.turn === "full"):
  | 'banner'
  | 'endTurn';

/** Full-turn action decision: `{ choice, ...args }`; a bare ActionChoice string stays valid. */
export interface ActionDecision {
  choice: ActionChoice;
  /** quest: which library quest to attempt (required in the full-turn protocol) */
  questId?: string;
  /** reinforce: pay the building's enhanced cost instead of taking the free effect */
  enhanced?: boolean;
}

/** Observed emergence with app-named building placements (rules.md §Placing Skulls). */
export interface SkullObservation {
  count: number;
  placements?: Array<{ kingdom: Kingdom; type?: BuildingType; location?: string }>;
}

export interface BuildingState {
  kingdom: Kingdom;
  type: BuildingType;
  location: string;
  skulls: number;
  destroyed: boolean;
}

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
  location: string | null;
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
  /** set by the adversary.spawn effect; absent until the adversary actually spawns */
  location?: string | null;
}

export interface BattleCard {
  advantage: string;
  strikes: number;
  critical?: boolean;
  onResolve?: Effect[];
}

export interface BattleCursor {
  foeId: string;
  instanceId?: string;
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
  moveUsed: boolean;
  heroicActionUsed: boolean;
  reinforceUsed: boolean;
  tradeUsed: boolean;
  itemLock: boolean;
}

export interface EngineClock {
  month: number;
  turnInMonth: number;
  turnsThisMonth: number;
  globalTurn: number;
  cursor: string | undefined;
  pending: { request: InputRequest } | null;
  activeHero: string;
  turnOrder: string[];
  firstPlayerOfMonth: string;
  latches: ClockLatches;
  dungeon: DungeonCursor | null;
  battle: BattleCursor | null;
  /** end-of-turn events raised via the onState bus, drained at the next boundary (effects.ts raiseEvent) */
  pendingEvents?: string[];
  /** remaining due event-chain roots to fire before resuming the stashed turn spine (run.ts) */
  eventQueue?: string[] | null;
  /** stashed turn-spine resumption point once an event chain drains (run.ts) */
  afterEvents?: { target: string; rotate: boolean } | null;
}

export interface SkullsState {
  supply: number;
  onBoard: number;
}

/** the engine-local pcg32 PRNG's serialized state (BigInt fields stringified for JSON-safety, §6) */
export interface RngState {
  state: string;
  inc: string;
}

export interface TowerMirror {
  drums: [number, number, number];
  glyphFacing: Record<string, string | null>;
  calibrated: boolean;
}

export interface DungeonRunState {
  clearedRooms: string[];
  /** lazily added by dungeon.ts's dungeonState() on first access; absent right after quest.spawnDungeon */
  improvedRooms?: string[];
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
  /** Buildings registry (full-turn scenarios authoring setup.board.boardState.buildings) */
  buildings?: BuildingState[];
  /** Currently issued monthly quests (full-turn scenarios with a lifecycle.newQuests node) */
  activeQuests?: Array<{ questId: string; kind: 'companion' | 'adversary'; expiresMonth: number }>;
  tower: TowerMirror;
  rng: RngState;
  outcome: Outcome;
  // Load-time private fields (present at runtime; do not construct or mutate)
  _nodes: Record<string, EngineNode>;
  _lib: ScenarioLibrary;
  _spine: Record<string, string | undefined>;
  _setup: {
    monthEnd: unknown;
    mainGoalId: string;
    goalThreshold: number;
    adversaryToughness: number;
    fullTurn?: boolean;
  };
  _triggers?: unknown[];
  _lastDraw?: unknown;
}

// ---- conditions (§4.4 closed predicate vocabulary) ----
// A loose (not strictly discriminated) shape mirroring the authored condition JSON: allOf/anyOf/not
// combinators, or a leaf `{subject, comparator, value, key}`. Kept as one interface with optional
// fields (like `Effect`/`EngineNode`) rather than a discriminated union, since evalCondition's own
// combinator checks (`if (cond.allOf) ...`) aren't tagged by a common literal field.

export type ConditionSubject =
  | 'resource'
  | 'flag'
  | 'counter'
  | 'sealsRemoved'
  | 'foeOnSpace'
  | 'heroAtLocation'
  | 'supply'
  | 'month'
  | 'endOfMonth';

export type Comparator = 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'has' | 'in';

export interface Condition {
  allOf?: Condition[];
  anyOf?: Condition[];
  not?: Condition;
  subject?: ConditionSubject;
  comparator?: Comparator;
  value?: unknown;
  key?: string;
}

// ---- scenario library (setup.library) ----
// The injected content the reducer reads by id — quests/tokens/buildings/foes/battle defs/dungeons.
// Modeled once here (rather than `unknown` + per-callsite casts) since five modules (effects, turn,
// battle, dungeon, nodes) all read it. Sub-shapes stay loose (optional fields, `unknown` for opaque
// display/bitmap data) — this mirrors authored content, not a strict schema.

export interface TokenTypeDef {
  removable?: boolean;
  threshold?: { at: number; onReach?: Effect[] };
}
export interface BuildingTypeDef {
  skullCapacity?: number;
}
export interface QuestDef {
  outcomes?: { success?: Effect[]; failure?: Effect[] };
  isMainGoal?: boolean;
}
export interface CompanionDef {
  grantedByQuestId?: string;
}
export interface FoeDef {
  level?: number;
  strike?: { effects?: Effect[] };
}
export interface BattleDef {
  cards?: BattleCard[];
}
export interface DungeonRoomDef {
  id: string;
  bitmapSlice?: unknown;
  displayText?: string;
  isTarget?: boolean;
  enterRequirement?: { condition?: Condition; spiritCost?: number; onFail?: Effect[] };
  insideEvent?: Effect[];
  improveOnce?: { effects: Effect[] };
  exits?: Partial<Record<CardinalDirection, string>>;
}
export interface DungeonDef {
  rooms?: DungeonRoomDef[];
  spawningQuestId?: string;
  idleLight?: string;
  ambientSoundCategory?: string;
}
export interface ScenarioLibrary {
  tokenTypes?: Record<string, TokenTypeDef>;
  buildingTypes?: Record<string, BuildingTypeDef>;
  quests?: Record<string, QuestDef>;
  companions?: Record<string, CompanionDef>;
  foes?: Record<string, FoeDef>;
  battleDefs?: Record<string, BattleDef>;
  dungeons?: Record<string, DungeonDef>;
}

// ---- effects (§4.3 closed verb vocabulary) ----
// The authoritative catalog of effect ops the reducer's applyEffect implements. An unknown op faults
// at runtime (invariant #4). `Effect` keeps the op closed while leaving verb-specific fields open,
// since the payload shape varies per op (a full per-op discriminated union lands with the .ts port).

export type EffectOp =
  | 'resource.gain'
  | 'resource.lose'
  | 'resource.spend'
  | 'corruption.gain'
  | 'corruption.remove'
  | 'virtue.activate'
  | 'virtue.grant'
  | 'item.gain'
  | 'item.enforceLimits'
  | 'foe.spawn'
  | 'foe.move'
  | 'foe.remove'
  | 'foe.escalateStatus'
  | 'adversary.spawn'
  | 'token.place'
  | 'token.counterIncrement'
  | 'token.remove'
  | 'hero.placeOrMove'
  | 'board.placeMonument'
  | 'board.placeMarker'
  | 'skull.place'
  | 'skull.remove'
  | 'building.destroy'
  | 'skull.modifySupply'
  | 'deck.draw'
  | 'deck.discard'
  | 'deck.reshuffle'
  | 'market.refresh'
  | 'market.acquireReplace'
  | 'quest.complete'
  | 'quest.spawnDungeon'
  | 'quest.placeMarker'
  | 'seal.remove'
  | 'seal.replace'
  | 'flag.set'
  | 'counter.set';

export type Effect = { op: EffectOp } & Record<string, unknown>;

// ---- nodes (§4.2 closed node-kind vocabulary) ----
// The catalog of node kinds interpretNode implements. Unknown kinds fault (invariant #4). Node
// `props`/`wires` shapes are kind-specific; kept open here pending the .ts port.

export type NodeKind =
  | 'lifecycle.gameStart'
  | 'lifecycle.boardSetup'
  | 'lifecycle.startMonth'
  | 'lifecycle.playerTurn'
  | 'lifecycle.actionStart'
  | 'lifecycle.actionMiddle'
  | 'lifecycle.actionEnd'
  | 'lifecycle.newMonthCheck'
  | 'lifecycle.newQuests'
  | 'lifecycle.gameEnd'
  | 'effect.apply'
  | 'tower.op'
  | 'cond.branch'
  | 'cond.check'
  | 'cond.glyphGate'
  | 'winloss.mainGoal'
  | 'winloss.winCondition'
  | 'winloss.lossCondition'
  | 'action.banner'
  | 'action.battle'
  | 'action.trade'
  | 'action.move'
  | 'action.cleanse'
  | 'action.quest'
  | 'action.reinforce'
  | 'battle.selectFoe'
  | 'battle.applyAdvantage'
  | 'battle.end'
  | 'media.narration'
  | 'dungeon.subflow'
  | 'dungeon.room'
  | 'trigger.schedule'
  | 'trigger.onState'
  | 'event.foesStrike'
  | 'event.foesGrow'
  | 'event.foesSpawn'
  | 'event.towerStirs'
  | 'event.towerActs'
  | 'event.newWares'
  | 'event.companion'
  | 'event.readAloud'
  | 'event.router';

export interface EngineNode {
  id: string;
  kind: NodeKind;
  props?: Record<string, unknown>;
  wires?: Record<string, string[]>;
}

// ---- directives (§5.2 closed vocabulary) ----
// Each directive type is the `type` discriminant; payloads match what the reducer pushes.

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
  | 'light.named'
  | 'light.custom'
  | 'light.effect'
  | 'sound'
  | 'drum.rotate'
  | 'seal.break'
  | 'seal.replace'
  | 'skull.dropTrigger'
  | 'wait'
  | 'rotationBundle'
  | 'timeline';

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
  | {
      id: 'dungeonMove';
      kind: 'choice';
      requestId: string;
      text: string;
      room: string;
      doors: string[];
    }
  | {
      id: 'dungeonRoomAdvantage';
      kind: 'advantageSpend';
      requestId: string;
      text: string;
      room: string;
    }
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
  | { requestId: 'action'; value: ActionChoice | ActionDecision; kind: 'decision' }
  | {
      requestId: 'target';
      value: { foeId?: string; instanceId?: string; adversary?: boolean; cancel?: boolean };
      kind: 'decision';
    }
  | {
      requestId: 'advantageSpend';
      value: { spend?: number; retreat?: boolean; improve?: boolean };
      kind: 'decision';
    }
  | { requestId: 'trade'; value: TradeDecision; kind: 'decision' }
  | { requestId: 'moveTarget'; value: { to: unknown }; kind: 'decision' }
  | { requestId: 'dungeonRoomAdvantage'; value: { improve?: boolean }; kind: 'decision' }
  | {
      requestId: 'dungeonMove';
      value: { leave?: boolean; direction?: CardinalDirection };
      kind: 'decision';
    }
  | { requestId: 'skullCounter'; value: number | SkullObservation; kind: 'observed' }
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
