// types.ts — the single, TYPE-CHECKED source of truth for @udtc/engine's public surface (build
// guide §6). `src/index.d.ts` re-exports from this file, so the type model is validated by the
// engine's `tsc --noEmit` gate rather than drifting in a hand-maintained declaration file.
//
// This file is TYPES ONLY — it has no runtime and its declarations are erased at emit, so it cannot
// affect determinism. It closes the effect-op and node-kind vocabularies (invariant #4): the `Effect`
// and `EngineNode` discriminated unions below are the authoritative catalog the reducer implements,
// each member carrying its per-variant `props` field shape. The reducer switches on `eff.op` /
// `node.kind` narrow to the exact member, so an unknown tag AND an unknown field shape are both
// compile errors (deferred-followups.md item 5); an unknown op/kind additionally faults at runtime
// for un-typechecked callers.

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
  /** UDT hero identity this seat picked via lifecycle.selectHero; null until assigned (or if the
   * scenario never authors that node — legacy scenarios stay byte-identical). */
  heroRef: string | null;
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
  /** persistent card-ladder deck, lazily instantiated at the FIRST adversary card-battle; per-card
   *  `.step` improvement state persists for the rest of the game (incl. through retreat). Absent in
   *  legacy scenarios and until the adversary is first battled with a ladder deck. */
  cardDeck?: LadderDeckCard[];
}

export interface BattleCard {
  advantage: string;
  strikes: number;
  critical?: boolean;
  onResolve?: Effect[];
}

/** authored improvement-ladder battle card (schema 0.4.2 $defs/battleLadderCard). */
export interface BattleCardStep {
  text: string;
  effects?: Effect[];
}
/** presentational card appearance (schema 0.4.3 $defs/cardAppearance) — a deck's shared card back,
 * front template, and accent color. The engine passes this through OPAQUELY (never resolves refs);
 * apps resolve backRef/artRef against library.resources.images. `template` is the closed 3-value
 * enum (kept as a local literal union to preserve the headless rule — no @udtc/card-render import). */
export interface CardAppearance {
  backRef?: string;
  template?: 'classic' | 'fullArt' | 'textOnly';
  accent?: string;
}
export interface LadderBattleCard {
  name: string;
  advantage: string;
  /** presentation flavor only (red styling/ribbon); an unimprovable card is a 1-step ladder */
  critical?: boolean;
  copies?: number;
  note?: string;
  /** presentational front-art resourceKey (schema 0.4.3); apps resolve against library.resources.images */
  artRef?: string;
  steps: BattleCardStep[];
}

/** runtime instance of one ladder card in a shuffled deck; `.step` is the current ladder position
 * (0 = worst). On the adversary's persistent deck, `.step` improvements survive across battles. */
export interface LadderDeckCard {
  defIndex: number;
  copy: number;
  step: number;
}

export interface BattleCursor {
  foeId: string;
  instanceId?: string;
  isAdversary: boolean;
  level: number;
  cards: BattleCard[];
  resolved: number;
  // ---- new-format (card-ladder) battle only; all optional & absent in legacy battles, so
  //      canonical() drops them and legacy digests stay byte-identical ----
  /** battleDefs key the ladder deck was built from */
  defId?: string;
  /** regular foes: this battle's shuffled full deck (fresh each battle). Adversary battles leave
   *  this undefined — the persistent deck lives on state.adversary.cardDeck. */
  deck?: LadderDeckCard[];
  /** deck indexes pre-drawn at battle start (length = level), in PRNG reveal order */
  hand?: number[];
  /** hand[0..revealedCount-1] are face-up (invariant: revealedCount - resolved ∈ {0,1}) */
  revealedCount?: number;
  /** 0..10 this battle (heroic-action cap; spends cannot be undone) */
  advantagesSpent?: number;
  /** position within the active card's step effects (a hero-choice pauses mid-resolve) */
  resolveIndex?: number;
  /** set while awaiting a battleHeroTarget pick for a choice-scope hero.scope effect */
  pendingHeroChoice?: { effectIndex: number; scope: HeroScope };
  /** heroIds already shortfall-corrupted by the CURRENT card (FAQ: ≤1 corruption per card per hero) */
  cardCorrupted?: string[];
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
  /** lifecycle.selectHero in-progress cursor: which seat is being asked and what's left in the
   * authored pool. Null once all seats are assigned (or the node was never entered). */
  heroSelect: { pool: string[]; seatOrder: string[]; seatIndex: number } | null;
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
    monthEnd: MonthEndConfig;
    mainGoalId: string;
    goalThreshold: number;
    adversaryToughness: number;
    fullTurn?: boolean;
    /** foe level by selection tier (setup.ts init) */
    foeTiers?: Record<string, number>;
    /** quests issued by the authored newQuests node, attemptable only while active (setup.ts init) */
    monthlyQuestIds?: string[];
  };
  _triggers?: TriggerRecord[];
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
  /** Reinforce's free effect (buildings.md) */
  free?: Effect[];
  /** Reinforce's enhanced effect, paid via resource.spend of `cost` (buildings.md) */
  enhanced?: { cost: { resource?: string; amount: number }; effects: Effect[] };
}
export interface QuestDef {
  outcomes?: { success?: Effect[]; failure?: Effect[] };
  isMainGoal?: boolean;
  requirements?: Array<{ condition?: Condition; label?: string }>;
}
export interface CompanionDef {
  grantedByQuestId?: string;
}
export interface FoeDef {
  level?: number;
  strike?: { effects?: Effect[] };
  /** optional override of the battleDefs key to draw cards from; defaults to the foeId (schema
   * library.foes[*].battleDefId). */
  battleDefId?: string;
}
export interface BattleDef {
  cards?: Array<BattleCard | LadderBattleCard>;
  /** presentational deck appearance (schema 0.4.3 ladder branch); passthrough only */
  appearance?: CardAppearance;
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
/** a card in library.cards (schema 0.4.3 $defs/card) — a generic deck card the engine can draw,
 * reveal (emit a cardDraw prompt), and resolve (apply its own effects). */
export interface GenericCardDef {
  id: string;
  name: string;
  type: string;
  description?: string;
  flavor?: string;
  /** presentational front-art resourceKey; apps resolve against library.resources.images */
  artRef?: string;
  effects?: Effect[];
}
/** a deck in library.decks (schema 0.4.3 $defs/deck). Seeded into state.decks at init in AUTHORED
 * order (copies expanded), never shuffled at init (correction C1). */
export interface GenericDeckDef {
  category: string;
  cards: Array<{ cardId: string; copies: number }>;
  marketSize?: number;
  appearance?: CardAppearance;
}
export interface ScenarioLibrary {
  tokenTypes?: Record<string, TokenTypeDef>;
  buildingTypes?: Record<string, BuildingTypeDef>;
  quests?: Record<string, QuestDef>;
  companions?: Record<string, CompanionDef>;
  foes?: Record<string, FoeDef>;
  battleDefs?: Record<string, BattleDef>;
  dungeons?: Record<string, DungeonDef>;
  /** generic card catalog + deck composition (schema 0.4.3 library.cards / library.decks) */
  cards?: Record<string, GenericCardDef>;
  decks?: Record<string, GenericDeckDef>;
  /** declared hero roster manifest (schema library.heroes) — static; the engine only reads it to
   * validate lifecycle.selectHero's authored pool, never mutates it (the runtime pick lands on
   * HeroState.heroRef instead). */
  heroes?: Record<string, { heroId: string; source?: string }>;
}

// ---- effects (§4.3 closed verb vocabulary) ----
// The authoritative catalog of effect ops the reducer's applyEffect implements, modeled as a full
// per-op discriminated union: each member carries the exact field shape its case in applyEffect
// (effects.ts) reads/authors, so both an unknown op AND an unknown field shape are compile errors
// (invariant #4). An unknown op still faults at runtime for un-typechecked callers. Optional-vs-
// required fields track the reducer's actual reads cross-checked against the authored literals in
// golden-fixture.ts (deferred-followups.md item 5). `EffectOp` is derived from the union's tags so
// the exported op-name catalog stays identical.

export type Effect =
  | { op: 'resource.gain'; resource: string; amount: number }
  | { op: 'resource.lose'; resource: string; amount: number }
  | { op: 'resource.spend'; resource: string; amount: number }
  | { op: 'corruption.gain'; source?: string }
  | { op: 'corruption.remove'; all?: boolean; count?: number }
  | { op: 'virtue.activate'; virtue?: string }
  | { op: 'virtue.grant'; virtue: string }
  | { op: 'item.gain'; itemType: string; item?: string; from?: string }
  | { op: 'item.enforceLimits' }
  | { op: 'foe.spawn'; foeId: string; status?: FoeStatus; location?: string | null }
  | { op: 'foe.move'; foeId: string; to: string | null }
  | { op: 'foe.remove'; foeId?: string; instanceId?: string }
  | { op: 'foe.escalateStatus'; foeId?: string; instanceId?: string; steps?: number }
  | { op: 'adversary.spawn'; location?: string }
  | { op: 'token.place'; tokenTypeId: string; target: unknown }
  | { op: 'token.counterIncrement'; hero?: string; tokenTypeId: string; amount?: number }
  | { op: 'token.remove'; tokenTypeId: string; target: unknown }
  | { op: 'hero.placeOrMove'; hero?: string; to?: string | null }
  | { op: 'board.placeMonument'; location: unknown }
  | { op: 'board.placeMarker'; location: unknown; markerType: string }
  | { op: 'skull.place'; count: number; kingdom?: Kingdom; chooser?: string }
  | { op: 'skull.remove'; count: number }
  | { op: 'building.destroy'; location?: string; kingdom?: Kingdom }
  | { op: 'skull.modifySupply'; delta: number }
  | { op: 'deck.draw'; deck: string; reveal?: boolean; resolve?: boolean }
  | { op: 'deck.discard'; deck: string; card?: unknown }
  | { op: 'deck.reshuffle'; deck: string }
  | { op: 'market.refresh'; cards?: unknown[] }
  | { op: 'market.acquireReplace' }
  | { op: 'quest.complete'; questId: string }
  | { op: 'quest.spawnDungeon'; dungeon: string; quest?: string }
  | { op: 'quest.placeMarker'; location: unknown; quest?: string }
  | { op: 'seal.remove'; seal?: string }
  | { op: 'seal.replace'; seal: string }
  | { op: 'flag.set'; name: string; value: unknown }
  | { op: 'counter.set'; name: string; value: number }
  | { op: 'hero.scope'; scope: HeroScope; effects: Effect[] };

/** hero.scope targets (schema 0.4.2). Deterministic scopes resolve without input; the two choice
 * scopes prompt the active player and are only supported inside the interactive battle-card flow. */
export type HeroScope = 'self' | 'other' | 'selfAndOther' | 'allOthers' | 'all' | 'kingdom';

export type EffectOp = Effect['op'];

// ---- nodes (§4.2 closed node-kind vocabulary) ----
// The catalog of node kinds interpretNode implements, modeled as a discriminated union on `kind`
// with per-variant `props` field shapes (item 5). An unknown kind is a compile error where a node is
// typed, and still faults at runtime (invariant #4). `props` is REQUIRED on a variant iff the reducer
// asserts it unconditionally today (`node.props!.x`), matching authored reality; OPTIONAL where the
// reducer reads defensively (`node.props?.x` / `(node.props || {})`). The 16 props-less kinds carry
// `props?: never` (authoring props on them is rejected). `wires` stays generic on the base fields —
// port names vary too unsystematically per kind (out / true|false / N|E|S|W / battle|dungeon|trade|
// move) to close usefully. Optional-vs-required was cross-checked against golden-fixture.ts's authored
// literals, not just the reducer's read sites (deferred-followups.md item 5).

/** end-of-turn trigger table entry (schema `$defs/trigger`; consumed by turn.ts collectDueEvents) */
export interface TriggerDef {
  on: 'schedule' | 'onState';
  month?: number;
  turn?: number;
  everyNTurns?: number;
  event?: string;
}

/** a trigger node flattened into EngineState._triggers at init (setup.ts); read by collectDueEvents */
export interface TriggerRecord {
  id: string;
  trigger?: TriggerDef;
  next?: string;
}

type NodeBase = { id: string; wires?: Record<string, string[]> };
/** a node with no authored props (interpretNode reads none) */
type PropslessNode<K extends string> = NodeBase & { kind: K; props?: never };

export type EngineNode =
  | PropslessNode<'lifecycle.gameStart'>
  | (NodeBase & {
      kind: 'lifecycle.boardSetup';
      props?: { spawns?: Array<{ foeId: string; location?: string; status?: FoeStatus }> };
    })
  // real runtime await boundary: each active seat (turnOrder) picks one distinct heroId from
  // props.heroIds (authored candidate pool, schema-enforced ≥1/unique) in seat order; the pick
  // lands on HeroState.heroRef via resume.ts's 'heroSelect' case.
  | (NodeBase & { kind: 'lifecycle.selectHero'; props: { heroIds: string[] } })
  | PropslessNode<'lifecycle.startMonth'>
  | PropslessNode<'lifecycle.playerTurn'>
  | PropslessNode<'lifecycle.actionStart'>
  // props.turn === "full" is the full-turn fidelity discriminator (setup.ts); only ever compared to "full"
  | (NodeBase & { kind: 'lifecycle.actionMiddle'; props?: { turn?: 'full' } })
  | PropslessNode<'lifecycle.actionEnd'>
  | PropslessNode<'lifecycle.newMonthCheck'>
  | (NodeBase & {
      kind: 'lifecycle.newQuests';
      props?: { monthly?: Record<string, Record<string, string>> };
    })
  | PropslessNode<'lifecycle.gameEnd'>
  | (NodeBase & { kind: 'effect.apply'; props: { effects?: Effect[]; effect?: Effect } })
  | (NodeBase & { kind: 'tower.op'; props: { towerOp: TowerChannelOp } })
  | (NodeBase & { kind: 'cond.branch'; props: { condition?: Condition } })
  | (NodeBase & { kind: 'cond.check'; props: { condition?: Condition } })
  | (NodeBase & { kind: 'cond.glyphGate'; props: { action: string } })
  | PropslessNode<'winloss.mainGoal'>
  | (NodeBase & { kind: 'winloss.winCondition'; props: { condition?: Condition } })
  | (NodeBase & { kind: 'winloss.lossCondition'; props: { condition?: Condition } })
  | (NodeBase & { kind: 'action.banner'; props: { title: string } })
  | PropslessNode<'action.battle'>
  // authored template only (never read by the reducer — the runtime supplies the finalized decision)
  | (NodeBase & { kind: 'action.trade'; props?: Partial<TradeDecision> })
  | PropslessNode<'action.move'>
  | PropslessNode<'action.cleanse'>
  | (NodeBase & { kind: 'action.quest'; props?: { questId?: string } })
  | PropslessNode<'action.reinforce'>
  | PropslessNode<'battle.selectFoe'>
  | PropslessNode<'battle.applyAdvantage'>
  | PropslessNode<'battle.end'>
  | (NodeBase & { kind: 'media.narration'; props: { text: string } })
  | (NodeBase & { kind: 'dungeon.subflow'; props: { dungeonId: string } })
  // roomId read defensively in dungeon.ts (faults if absent); golden always authors it
  | (NodeBase & { kind: 'dungeon.room'; props?: { roomId: string } })
  | (NodeBase & { kind: 'trigger.schedule'; props?: { trigger: TriggerDef } })
  | (NodeBase & { kind: 'trigger.onState'; props?: { trigger: TriggerDef } })
  | (NodeBase & {
      kind: 'event.foesStrike';
      props?: { foeIds?: string[]; moves?: Array<{ foeId: string; to: string | null }> };
    })
  | (NodeBase & { kind: 'event.foesGrow'; props?: { steps?: number } })
  | (NodeBase & {
      kind: 'event.foesSpawn';
      props?: { spawns?: Array<{ foeId: string; location?: string; status?: FoeStatus }> };
    })
  | (NodeBase & { kind: 'event.towerStirs'; props?: { level?: string; removeSeal?: boolean } })
  | (NodeBase & { kind: 'event.towerActs'; props?: { effects?: Effect[] } })
  | (NodeBase & { kind: 'event.newWares'; props?: { cards?: unknown[] } })
  | (NodeBase & { kind: 'event.companion'; props?: { companionId?: string } })
  | (NodeBase & { kind: 'event.readAloud'; props?: { text?: string } })
  | PropslessNode<'event.router'>;

/** the closed node-kind catalog, derived from the union's tags (unchanged export surface) */
export type NodeKind = EngineNode['kind'];
/** narrow the EngineNode union to a single kind's shape (e.g. for a per-kind helper's parameter) */
export type NodeOfKind<K extends NodeKind> = Extract<EngineNode, { kind: K }>;

// ---- directives (§5.2 closed vocabulary) ----
// Each directive type is the `type` discriminant; payloads match what the reducer pushes.

export interface UiUpdateDirective {
  type: 'ui.update';
  delta: Record<string, unknown>;
}

/** one card in a battle-card prompt — everything the player UI needs to render, so the UI never
 * reads engine internals. Face-down cards omit `text`/`nextText`. */
export interface BattlePromptCard {
  name: string;
  advantage: string;
  critical: boolean;
  revealed: boolean;
  resolved: boolean;
  step: number;
  stepCount: number;
  text?: string;
  nextText?: string;
  /** presentational front-art resourceKey (schema 0.4.3); present only when the card authored one */
  artRef?: string;
}
/** payload for the interactive card-battle prompt (schema 0.4.2). */
export interface BattlePromptPayload {
  foeId: string;
  isAdversary: boolean;
  deckSize: number;
  handSize: number;
  cards: BattlePromptCard[];
  revealedCount: number;
  resolvedCount: number;
  advantagesSpent: number;
  advantagesMax: number;
  canReveal: boolean;
  canImprove: boolean;
  canResolve: boolean;
  canRetreat: boolean;
  /** present only while awaiting a battleHeroTarget pick for a choice-scope hero.scope effect */
  heroChoice?: { text: string; candidates: Array<{ heroId: string }> };
  /** presentational deck appearance passthrough (schema 0.4.3); present only for decks that authored one */
  appearance?: CardAppearance;
}

/** payload for the fire-and-forget cardDraw ui.prompt (schema 0.4.3 deck.draw reveal:true). Carries
 * resourceKeys (artRef) and passthrough appearance — NEVER resolved data URLs; apps resolve against
 * library.resources.images. Fully client-side in the player (no engine input; dismissal is local). */
export interface DrawnCardPayload {
  deckId: string;
  cardId: string;
  name: string;
  type: string;
  description?: string;
  flavor?: string;
  artRef?: string;
  appearance?: CardAppearance;
}

export interface UiPromptDirective {
  type: 'ui.prompt';
  kind: string;
  requestId?: string;
  text?: string;
  /** the ui.prompt directive's action-choice list is bare strings; the awaited InputRequest's own
   * `options` (action variant) is the separate {id}-wrapped shape nodes.ts builds via .map() */
  options?: string[];
  cards?: number;
  room?: string;
  doors?: string[];
  /** interactive card-battle presentation (ui.prompt kind === 'battleCard') */
  battle?: BattlePromptPayload;
  /** drawn generic card presentation (ui.prompt kind === 'cardDraw', schema 0.4.3 deck.draw reveal) */
  card?: DrawnCardPayload;
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
  // dungeonMove/dungeonRoomAdvantage keep the awaited request minimal ({id, kind}) — the
  // room/doors/text detail goes out separately via the ui.prompt directive, not the request itself
  // (dungeon.ts's awaitDungeonMove/resolveRoomEntry).
  | { id: 'dungeonMove'; kind: 'choice' }
  | { id: 'dungeonRoomAdvantage'; kind: 'advantageSpend' }
  // interactive card-battle loop (schema 0.4.2). Minimal {id, kind}; the rich BattlePromptPayload
  // goes out separately via the ui.prompt directive (battle.ts's emitBattlePrompt).
  | { id: 'battleCard'; kind: 'battleCard' }
  | { id: 'battleHeroTarget'; kind: 'heroSelect' }
  | { id: 'skullCounter'; kind: 'observed'; observed: 'skullCounter' }
  // lifecycle.selectHero: one seat picks one hero per await; options is the REMAINING candidate
  // pool for the CURRENT seat (shrinks each pick, same shape convention as 'action').
  | { id: 'heroSelect'; kind: 'choice'; options: Array<{ id: string }> };

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
  | {
      requestId: 'battleCard';
      value: { reveal?: boolean; improve?: boolean; resolve?: boolean; retreat?: boolean };
      kind: 'decision';
    }
  | { requestId: 'battleHeroTarget'; value: { heroId: string }; kind: 'decision' }
  | { requestId: 'skullCounter'; value: number | SkullObservation; kind: 'observed' }
  | { requestId: 'heroSelect'; value: { heroId: string }; kind: 'decision' }
  | { kind: 'control' };

// ---- public API (§2.3) ----

// ---- node/dungeon control-flow result (§4.2/§4 row 157) ----
// The ad-hoc {goto}|{await}|{terminal}|{end} shape interpretNode/dungeon.ts's room-flow functions
// return, consumed by run.ts/resume.ts. One loose interface (not a discriminated union) since
// callers check each field's presence independently rather than switching on a tag. `end` is
// currently never actually set by any producer — run.ts's `r.end` check is effectively dead but
// kept exactly as the original reducer wrote it (see run.ts port notes).
export interface NodeResult {
  goto?: string;
  await?: { request: InputRequest };
  terminal?: true;
  end?: boolean;
}

/** month-length resolution config (scenario setup.monthEnd, mirrored onto _setup.monthEnd) */
export interface MonthEndConfig {
  resolution?: string;
  default: { minTurn: number; maxTurn: number };
  perMonth?: Record<string, { minTurn: number; maxTurn: number }>;
}

// ---- scenario (setup.ts init's input) ----
// A minimal internal shape covering only what the reducer actually reads (setup.ts, golden-fixture.ts).
// Deliberately not @udtc/schema's canonical Scenario type (invariant #2 allows the dependency, but
// importing it risks a wall of unrelated type errors from strictness/shape gaps between the authoring
// schema and what a compact fixture populates) — adopting the real schema type is a follow-up, not
// part of this mechanical, behavior-preserving port.
export interface Scenario {
  schemaVersion: string;
  meta: {
    scenarioVersion: string;
    tuning?: { goalThreshold?: number; adversaryToughness?: number };
  };
  graph: {
    entry: string;
    nodes: EngineNode[];
  };
  library: ScenarioLibrary;
  setup: {
    playerCountScaling?: {
      dormantKingdoms?: { byPlayerCount?: Record<string, Kingdom[]> };
    };
    board?: {
      boardState?: {
        home?: Record<string, string>;
        buildings?: Array<{ kingdom: Kingdom; type: BuildingType; location: string }>;
      };
    };
    selections: {
      // Optional since schema 0.4.1: rule-variant scenarios may omit the standard adversary/
      // foe-tier/main-goal mechanics. setup.ts falls back to an empty-string sentinel that never
      // matches a real foe/quest id, so the adversary battle and legacy goal-completion paths
      // stay inert (no-op, no throw) for a scenario that omits them.
      adversaryId?: string;
      mainGoalId?: string;
      foes?: { tier1?: string; tier2?: string; tier3?: string };
    };
    difficulty: { skullSupply: number };
    monthEnd: MonthEndConfig;
  };
}

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
