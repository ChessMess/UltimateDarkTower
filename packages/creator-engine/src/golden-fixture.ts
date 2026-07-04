// golden-fixture.ts — the playable golden MVP scenario (rules-engine §9 / schema L4).
// A schema-valid superset of the conformance `base`: *Recover Azkol's Treasures* (Ashstrider;
// Brigands/Frost Trolls/Dragons; ally Zaida; seed AA9A-AAGS-W634, Core/Heroic/1P). The graph is
// a compact-but-real turn loop the engine walks to a clean WIN and a clean LOSS (§9).
//
// Turn loop: gameStart → boardSetup → banner → [startMonth → playerTurn → actionStart →
// actionMiddle(decision) → actionEnd(observed skullCounter) → winCheck → endOfMonth?]* →
// newMonthCheck → month≥6? → lossChecks → gameEnd.
//
// Deliberately NOT typed as `Scenario` (types.ts) here: this authoring literal carries many
// fields Scenario doesn't model (meta.title/designer/pins, setup.mode, library entry
// display/flavor fields, …) since Scenario only covers what setup.ts's reducer reads. Annotating
// the literal directly would trigger excess-property-check errors on every one of those; leaving
// it inferred and relying on structural typing at call sites (engine.init(golden, opts)) avoids
// that without widening Scenario into a second authoring-schema.

// Building Reinforce effects per rules.md §Reinforce + buildings.md (base game): free effect or
// a spirit-cost enhanced effect; every building holds 3 skulls and the 4th destroys it (schema
// pins skullCapacity=3 / destroyOnSkull=4).
import type { Effect, ConditionSubject, Comparator, EngineNode, DungeonRoomDef } from './engine/types';

const buildingType = (freeEffect: Effect, cost: number, enhancedEffect: Effect) => ({
  free: [freeEffect],
  enhanced: { cost: { resource: "spirit", amount: cost }, effects: [enhancedEffect] },
  skullCapacity: 3,
  destroyOnSkull: 4
});
const cond = (subject: ConditionSubject, comparator: Comparator, value: unknown, key?: string) => (key === undefined ? { subject, comparator, value } : { subject, comparator, value, key });

const golden = {
  schemaVersion: "0.4.0",
  meta: {
    title: "Recover Azkol's Treasures",
    description: "Playable golden MVP fixture — drives to a clean win and a clean loss (rules-engine §9).",
    scenarioVersion: "0.1.0",
    designer: { name: "ChessMess" },
    pins: { udt: "5.0.0" },
    provenance: { importedSeed: { seed: "AA9A-AAGS-W634" } }
  },
  setup: {
    mode: "coop",
    difficulty: { profile: "heroic", skullSupply: 24 },
    playerCountScaling: { turnsPerMonth: { "1": 6, "2": 7, "3": 8, "4": 9 } },
    monthEnd: { resolution: "randomInRange", default: { minTurn: 3, maxTurn: 6 }, perMonth: { "6": { minTurn: 2, maxTurn: 4 } } },
    selections: {
      adversaryId: "ashstrider",
      foes: { tier1: "brigands", tier2: "frost-trolls", tier3: "dragons" },
      mainGoalId: "recover-azkols-treasures",
      allyId: "zaida"
    },
    board: { boardStateRef: "board-main" }
  },
  library: {
    buildingTypes: {
      // rules.md §Reinforce / buildings.md — the real base-game effects.
      citadel:   buildingType({ op: "item.gain", itemType: "potion" }, 5, { op: "virtue.activate" }),
      sanctuary: buildingType({ op: "resource.gain", resource: "spirit", amount: 1 }, 5, { op: "corruption.remove", all: true }),
      village:   buildingType({ op: "resource.gain", resource: "warriors", amount: 6 }, 1, { op: "resource.gain", resource: "warriors", amount: 12 }),
      bazaar:    buildingType({ op: "item.gain", itemType: "gear" }, 2, { op: "item.gain", itemType: "treasure", from: "market" })
    },
    // Selected foes with author-editable defaults (schema library.foes — level is engine-owned,
    // derived from setup.selections.foes tiers: tier1→2, tier2→3, tier3→4).
    foes: {
      brigands: {
        foeId: "brigands", startingStatus: "ready", traits: ["Humanoid", "Melee"],
        strike: { cadence: "monthly", effects: [{ op: "resource.lose", resource: "warriors", amount: 1 }] },
        movement: { pattern: "stationary", note: "board adjacency deferred to the Board adapter" }
      },
      "frost-trolls": {
        foeId: "frost-trolls", startingStatus: "ready", traits: ["Beast", "Melee"],
        strike: { cadence: "monthly", effects: [{ op: "resource.lose", resource: "warriors", amount: 1 }] },
        movement: { pattern: "stationary", note: "board adjacency deferred to the Board adapter" }
      },
      dragons: {
        foeId: "dragons", startingStatus: "ready", traits: ["Beast", "Magic"],
        strike: { cadence: "monthly", effects: [{ op: "resource.lose", resource: "warriors", amount: 1 }] },
        movement: { pattern: "stationary", note: "board adjacency deferred to the Board adapter" }
      }
    },
    // The selected ally (setup.selections.allyId) — granted by completing her monthly companion quest.
    companions: {
      zaida: {
        id: "zaida", name: "Zaida",
        abilities: [{ op: "resource.gain", resource: "spirit", amount: 1 }],
        grantedByQuestId: "zaida-escort"
      }
    },
    quests: {
      // Main goal (rules.md §Completing the Main Goal): requires the two Azkol relic quests done,
      // taken at the Tower; completion spawns the adversary on the board.
      "recover-azkols-treasures": {
        id: "recover-azkols-treasures",
        name: "Recover Azkol's Treasures",
        isMainGoal: true,
        requirements: [
          { label: "The vault relic is recovered", condition: cond("flag", "eq", true, "vaultCleared") },
          { label: "The shrine relic is recovered", condition: cond("flag", "eq", true, "shrineRelicFound") },
          { label: "Stand before the Dark Tower", condition: cond("heroAtLocation", "gte", 1, "the-tower") }
        ],
        outcomes: { success: [{ op: "flag.set", name: "goalDone", value: true }], failure: [{ op: "corruption.gain" }] }
      },
      "azkol-vault": {
        id: "azkol-vault",
        name: "Plunder the Azkol Vault",
        spawnsDungeonId: "azkol-vault-dungeon",
        outcomes: { success: [{ op: "resource.gain", resource: "spirit", amount: 1 }], failure: [] }
      },
      // Location quest (rules.md §Completing a Quest: be at the location, spend resources).
      "azkol-shrine": {
        id: "azkol-shrine",
        name: "Cleanse Azkol's Shrine",
        requirements: [
          { label: "At Azkol's Bane", condition: cond("heroAtLocation", "gte", 1, "Azkol's Bane") },
          { label: "2 warriors to spend", condition: cond("resource", "gte", 2, "warriors") }
        ],
        outcomes: {
          success: [
            { op: "resource.spend", resource: "warriors", amount: 2 },
            { op: "flag.set", name: "shrineRelicFound", value: true },
            { op: "item.gain", itemType: "questItem" }
          ],
          failure: []
        }
      },
      // Monthly companion quest (issued month 2; completing it grants Zaida — rules.md §Monthly Quests).
      "zaida-escort": {
        id: "zaida-escort",
        name: "Escort Zaida through the Great Woods",
        requirements: [{ label: "Reach Delmsmire", condition: cond("heroAtLocation", "gte", 1, "Delmsmire") }],
        outcomes: { success: [{ op: "resource.gain", resource: "spirit", amount: 1 }], failure: [] }
      },
      // Monthly adversary quests (issued months 2–6; failing one lets Ashstrider advance —
      // rules.md §Monthly Quests: "the world gets worse" = a scenario-determined skull).
      "adv-quest-m2": {
        id: "adv-quest-m2", name: "Disrupt the Ashstrider's Scouts",
        requirements: [
          { label: "Reach The Tundra", condition: cond("heroAtLocation", "gte", 1, "The Tundra") },
          { label: "1 warrior to spend", condition: cond("resource", "gte", 1, "warriors") }
        ],
        outcomes: { success: [{ op: "resource.spend", resource: "warriors", amount: 1 }],
                    failure: [{ op: "skull.place", count: 1, kingdom: "north" }] }
      },
      "adv-quest-m3": {
        id: "adv-quest-m3", name: "Burn the Ashstrider's Totems",
        requirements: [
          { label: "Reach Broken Lands", condition: cond("heroAtLocation", "gte", 1, "Broken Lands") },
          { label: "1 warrior to spend", condition: cond("resource", "gte", 1, "warriors") }
        ],
        outcomes: { success: [{ op: "resource.spend", resource: "warriors", amount: 1 }],
                    failure: [{ op: "skull.place", count: 1, kingdom: "north" }] }
      },
      "adv-quest-m4": {
        id: "adv-quest-m4", name: "Scatter the Ash Cults",
        requirements: [
          { label: "Reach Muted Forest", condition: cond("heroAtLocation", "gte", 1, "Muted Forest") },
          { label: "1 warrior to spend", condition: cond("resource", "gte", 1, "warriors") }
        ],
        outcomes: { success: [{ op: "resource.spend", resource: "warriors", amount: 1 }],
                    failure: [{ op: "skull.place", count: 1, kingdom: "north" }] }
      },
      "adv-quest-m5": {
        id: "adv-quest-m5", name: "Break the Siege Lines",
        requirements: [
          { label: "Reach Green Bridge", condition: cond("heroAtLocation", "gte", 1, "Green Bridge") },
          { label: "1 warrior to spend", condition: cond("resource", "gte", 1, "warriors") }
        ],
        outcomes: { success: [{ op: "resource.spend", resource: "warriors", amount: 1 }],
                    failure: [{ op: "skull.place", count: 1, kingdom: "north" }] }
      },
      "adv-quest-m6": {
        id: "adv-quest-m6", name: "Hold the Last Road",
        requirements: [
          { label: "Reach Pearl of the North", condition: cond("heroAtLocation", "gte", 1, "Pearl of the North") },
          { label: "1 warrior to spend", condition: cond("resource", "gte", 1, "warriors") }
        ],
        outcomes: { success: [{ op: "resource.spend", resource: "warriors", amount: 1 }],
                    failure: [{ op: "skull.place", count: 1, kingdom: "north" }] }
      }
    },
    dungeons: {
      // A small 3-room dungeon (catalog §5): entrance → hall (spirit-tax gate) → target.
      // Clearing the target completes the dungeon AND its spawning quest "azkol-vault".
      "azkol-vault-dungeon": {
        id: "azkol-vault-dungeon",
        name: "The Azkol Vault",
        trait: "Magic",
        grid: { cols: 3, rows: 1 },
        masterBitmap: "azkol-vault-master",
        spawningQuestId: "azkol-vault",
        rooms: [
          { id: "vault-entry", cell: { col: 0, row: 0 }, exits: { N: "wall", E: "door", S: "wall", W: "wall" },
            isEntrance: true, displayText: "A cold antechamber.",
            insideEvent: [{ op: "resource.gain", resource: "spirit", amount: 1 }],
            improveOnce: { effects: [{ op: "resource.gain", resource: "warriors", amount: 2 }] } },
          { id: "vault-hall", cell: { col: 1, row: 0 }, exits: { N: "wall", E: "door", S: "wall", W: "door" },
            displayText: "A warded hall hums with spirit-magic.",
            enterRequirement: { spiritCost: 1, onFail: [{ op: "corruption.gain" }] },
            insideEvent: [{ op: "resource.gain", resource: "warriors", amount: 1 }] },
          { id: "vault-target", cell: { col: 2, row: 0 }, exits: { N: "wall", E: "wall", S: "wall", W: "door" },
            isTarget: true, displayText: "Azkol's reliquary.",
            insideEvent: [{ op: "flag.set", name: "vaultCleared", value: true }] }
        ]
      }
    },
    battleDefs: {
      // Battle cards per foe (rules.md §Battle: cards drawn = foe level; tier1=2, tier2=3, tier3=4,
      // adversary=5). Author-editable defaults, advantage-keyed (schema v0.4 §battleDefs).
      brigands: { cards: [
        { advantage: "Humanoid", strikes: 1 },
        { advantage: "Melee",    strikes: 1 }
      ] },
      "frost-trolls": { cards: [
        { advantage: "Beast", strikes: 1 },
        { advantage: "Melee", strikes: 2 },
        { advantage: "Wild",  strikes: 1 }
      ] },
      dragons: { cards: [
        { advantage: "Beast", strikes: 2 },
        { advantage: "Magic", strikes: 2 },
        { advantage: "Wild",  strikes: 1 },
        { advantage: "Magic", strikes: 1, critical: true, note: "dragonfire — cannot be improved" }
      ] },
      // Ashstrider (adversary, level 5): clearing all 5 cards with spent Advantages defeats it.
      ashstrider: { cards: [
        { advantage: "Magic",    strikes: 1 },
        { advantage: "Beast",    strikes: 1 },
        { advantage: "Humanoid", strikes: 1 },
        { advantage: "Melee",    strikes: 1 },
        { advantage: "Undead",   strikes: 1 }
      ] }
    }
  },
  graph: {
    entry: "n-start",
    nodes: [
      { id: "n-start",   kind: "lifecycle.gameStart",    wires: { out: ["n-setup"] } },
      { id: "n-setup",   kind: "lifecycle.boardSetup",   props: { spawns: [
          { foeId: "brigands",     location: "Delmsmire" },
          { foeId: "frost-trolls", location: "The Tundra" },
          { foeId: "dragons",      location: "Dragontooth Lake" }
        ] }, wires: { out: ["n-banner"] } },
      { id: "n-banner",  kind: "action.banner", props: { title: "Recover Azkol's Treasures" }, wires: { out: ["n-month"] } },
      { id: "n-month",   kind: "lifecycle.startMonth",   wires: { out: ["n-turn"] } },
      { id: "n-turn",    kind: "lifecycle.playerTurn",   wires: { out: ["n-astart"] } },
      { id: "n-astart",  kind: "lifecycle.actionStart",  wires: { out: ["n-amid"] } },
      { id: "n-amid",    kind: "lifecycle.actionMiddle", wires: { out: ["n-aend"], battle: ["n-bsel"], dungeon: ["n-dsub"], trade: ["n-trade"] } },
      { id: "n-bsel",    kind: "battle.selectFoe",       wires: { out: ["n-badv"] } },
      { id: "n-badv",    kind: "battle.applyAdvantage",  wires: { out: ["n-bend"] } },
      { id: "n-bend",    kind: "battle.end",             wires: { out: ["n-aend"] } },
      // Dungeon subflow (catalog §5): enter → entrance room; rooms wired N/E/S/W (doors); completed/left return to actionEnd.
      { id: "n-dsub",    kind: "dungeon.subflow", props: { dungeonId: "azkol-vault-dungeon" }, wires: { enter: ["n-room-a"], completed: ["n-aend"], left: ["n-aend"] } },
      { id: "n-room-a",  kind: "dungeon.room", props: { roomId: "vault-entry" },  wires: { E: ["n-room-b"] } },
      { id: "n-room-b",  kind: "dungeon.room", props: { roomId: "vault-hall" },   wires: { W: ["n-room-a"], E: ["n-room-c"] } },
      { id: "n-room-c",  kind: "dungeon.room", props: { roomId: "vault-target" }, wires: { W: ["n-room-b"] } },
      // Trade action (catalog §133; rules-engine §10.9): the authored props is a template; the engine
      // applies the finalized, unanimous-by-construction decision from the runtime input, then returns
      // to Action: End. Reachable from Action: Middle's `trade` port (resolved by _spine.tradeEntry).
      { id: "n-trade",   kind: "action.trade", props: { from: "hero1", to: "hero2", give: [{ asset: "warriors", amount: 1 }] }, wires: { out: ["n-aend"] } },
      { id: "n-aend",    kind: "lifecycle.actionEnd",    wires: { out: ["n-nmc"] } },
      { id: "n-nmc",     kind: "lifecycle.newMonthCheck",wires: { out: ["n-endeval"] } },
      { id: "n-endeval", kind: "winloss.winCondition", props: { condition: cond("flag", "eq", true, "adversaryDefeated") }, wires: { out: ["n-end"] } },
      { id: "n-end",     kind: "lifecycle.gameEnd" }
    ] satisfies EngineNode[]
  }
};
// Engine-intrinsic phase sequencing (§4.5) drives the turn loop (n-aend → n-turn | n-nmc) and the
// month rollover (n-nmc → n-month | n-endeval); the three default losses (third corruption / empty
// supply / end of month 6) are engine-intrinsic, not authored conditions — so the closed condition
// vocabulary (resource/flag/counter/sealsRemoved/foeOnSpace/heroAtLocation) is honored exactly.

// Supply variants for the lockstep loss corpus (corpus_test.js). Both are golden clones differing in
// one authored field, so both stay schema-valid (skullSupply minimum 1):
//  - goldenLowSupply (2): the mandatory end-of-turn skull drop empties the supply at turn 3, so the
//    empty-supply loss (§4.5 step 1) fires in Action: End — independent of seed-drawn month lengths.
//  - goldenAmpleSupply (99): supply outlasts all six months (max ~34 drops), so a no-win all-pass walk
//    reaches the out-of-time loss at the month-6 Game End rather than emptying the supply first.
function cloneWithSupply(supply: number) {
  const c = JSON.parse(JSON.stringify(golden));
  c.setup.difficulty.skullSupply = supply;
  return c;
}
const goldenLowSupply = cloneWithSupply(2);
const goldenAmpleSupply = cloneWithSupply(99);

// An AUTHORED-loss variant for the lockstep corpus (corpus_test.js): the three default losses
// (third corruption / empty supply / out of time) are engine-intrinsic, but the engine also honors an
// authored `winloss.lossCondition` node (engine.js: loseGame(state, directives, "loss-condition") when
// evalCondition(node.props.condition) is true). The golden graph only carries a winloss.winCondition,
// so this clone splices ONE extra node onto the default action path to exercise that distinct path:
//   n-amid (Action: Middle) --out--> n-lossguard (winloss.lossCondition) --out--> n-aend (Action: End)
// The condition reads the `goalProgress` counter (the `quest` action increments it, §performAction) and
// fires the authored loss the moment it reaches 2 — deliberately BELOW the main goal's threshold of 3,
// so a two-quest stream lands the authored loss cleanly and never completes the main goal. The
// subject/comparator (counter/gte) is inside the schema's closed condition vocabulary (subject ∈
// {resource,flag,counter,sealsRemoved,…}; note month/supply are engine-only and would fail L1), so the
// clone stays L1-valid under ajv strict draft 2020-12. The battle/dungeon/trade subflows return to
// n-aend directly (their wires are untouched), so the guard sits only on the plain action path.
function cloneAuthoredLoss() {
  const c = JSON.parse(JSON.stringify(golden));
  const nodes: EngineNode[] = c.graph.nodes;
  const amid = nodes.find((n) => n.id === "n-amid")!;
  amid.wires!.out = ["n-lossguard"]; // default action path now routes through the loss guard
  const aendIdx = nodes.findIndex((n) => n.id === "n-aend");
  nodes.splice(aendIdx, 0, {
    id: "n-lossguard", kind: "winloss.lossCondition",
    props: { condition: cond("counter", "gte", 2, "goalProgress") },
    wires: { out: ["n-aend"] }
  });
  return c;
}
const goldenAuthoredLoss = cloneAuthoredLoss();

// A SECOND authored-loss clone (engine-notes v0.7 / corpus task 2) that exercises the winloss.lossCondition
// path on a NON-COUNTER subject. Where goldenAuthoredLoss reads `counter goalProgress gte 2`, this reads
// `flag vaultCleared eq true` — a flag that is SET BY REAL GAMEPLAY: the dungeon target room's insideEvent
// (library.dungeons["azkol-vault-dungeon"].rooms[vault-target].insideEvent = [{op:"flag.set",
// name:"vaultCleared", value:true}]). `flag` is in the schema's closed condition-subject enum AND has an
// evalCondition branch — the intersection of {schema-valid} ∩ {engine-supported} is exactly
// resource/flag/counter/sealsRemoved (month/supply have engine branches but fail L1; foeOnSpace/
// heroAtLocation are in the enum but have no engine branch). So this clone stays L1-valid under ajv strict.
// Splice is identical to goldenAuthoredLoss — n-amid `out` (the plain-action path) routes through the
// guard; the dungeon/battle/trade ports return to n-aend directly, so they BYPASS it. Net effect: clearing
// the vault on turn 1 sets the flag but does NOT end the game (the dungeon's `completed` port skips the
// guard); the loss fires on the NEXT plain action that walks n-amid → n-lossguard with the flag now true.
function cloneAuthoredLossFlag() {
  const c = JSON.parse(JSON.stringify(golden));
  const nodes: EngineNode[] = c.graph.nodes;
  const amid = nodes.find((n) => n.id === "n-amid")!;
  amid.wires!.out = ["n-lossguard"];
  const aendIdx = nodes.findIndex((n) => n.id === "n-aend");
  nodes.splice(aendIdx, 0, {
    id: "n-lossguard", kind: "winloss.lossCondition",
    props: { condition: cond("flag", "eq", true, "vaultCleared") },
    wires: { out: ["n-aend"] }
  });
  return c;
}
const goldenAuthoredLossFlag = cloneAuthoredLossFlag();

// A WARDED-VAULT clone (engine-notes v0.7 / corpus task 3): the same golden dungeon, but vault-hall's
// enterRequirement.spiritCost is bumped 1 → 3. A hero reaches the hall with spirit 2 (start 1 + the
// entrance room's +1 insideEvent), so 2 < 3 → resolveRoomEntry (engine §dungeon) takes the BLOCK branch:
// it applies the room's onFail effects ([corruption.gain]) and forces a leave WITHOUT clearing the hall
// (catalog §5). The spiritCost is never debited on a blocked entry. Only one authored field changes from
// golden, so the clone stays L1-valid (spiritCost is an integer ≥ 0 in the schema's enterRequirement).
function cloneWardedVault() {
  const c = JSON.parse(JSON.stringify(golden));
  const rooms: DungeonRoomDef[] = c.library.dungeons["azkol-vault-dungeon"].rooms;
  const hall = rooms.find((r) => r.id === "vault-hall")!;
  hall.enterRequirement!.spiritCost = 3;
  return c;
}
const goldenWardedVault = cloneWardedVault();

// A THIRD authored-loss clone (engine-notes v0.8 / corpus task 1) on the `resource` subject — broadening
// the winloss.lossCondition proof past #6's `counter` and #8's `flag` to a per-hero RESOURCE reading.
// evalCondition's `resource` branch reads state.heroes[activeHero][key] (engine.js), so the condition
// `resource warriors gte 9` watches the ACTIVE hero's warrior count. The driver is the built-in
// `reinforce` action (performAction → resource.gain warriors +2, §4.1 once-per-turn latch): heroes start
// at 7 warriors, so a single reinforce lifts the active hero 7 → 9 and the guard fires on the SAME action
// that routes n-amid → n-lossguard. `resource` is in the schema's closed condition-subject enum and `key`
// is a free string (warriors ∈ the $defs/resource enum), so the clone stays L1-valid under ajv strict.
// Splice is identical to the prior guards — only the plain-action path (n-amid `out`) routes through it;
// the battle/dungeon/trade ports return to n-aend directly and BYPASS it. (Guard-hold: a plain `pass`
// leaves warriors at 7 < 9, so the loss fires only once reinforce reaches the threshold.)
function cloneAuthoredLossResource() {
  const c = JSON.parse(JSON.stringify(golden));
  const nodes: EngineNode[] = c.graph.nodes;
  const amid = nodes.find((n) => n.id === "n-amid")!;
  amid.wires!.out = ["n-lossguard"];
  const aendIdx = nodes.findIndex((n) => n.id === "n-aend");
  nodes.splice(aendIdx, 0, {
    id: "n-lossguard", kind: "winloss.lossCondition",
    props: { condition: cond("resource", "gte", 9, "warriors") },
    wires: { out: ["n-aend"] }
  });
  return c;
}
const goldenAuthoredLossResource = cloneAuthoredLossResource();

// A FOURTH authored-loss clone (engine-notes v0.8 / corpus task 2) on the `sealsRemoved` subject —
// completing the schema-valid ∩ engine-supported condition set (resource/flag/counter/sealsRemoved).
// evalCondition's `sealsRemoved` branch reads the engine-owned `state.sealsRemoved` mirror, which the
// `seal.remove` EFFECT advances (engine.js: state.sealsRemoved += 1, pushes a default seal id "(n)-north"
// into state.brokenSeals, raises a `sealRemoved` event). The golden slice authors NO native seal-break
// (no action choice and no quest/room/building effect touches a seal), so — unlike the flag clone, which
// reused an existing room's flag.set — this clone must SUPPLY the driver. It does so the minimal,
// content-free way: it splices an `effect.apply` node (a v0.3-spine node kind whose props.effects runs the
// closed effect vocabulary) carrying `[{op:"seal.remove"}]` onto the plain-action path, just ahead of the
// guard. So each plain action breaks one seal, and the guard `sealsRemoved gte 2` fires on the SECOND.
// Grounding note (handoff task 2): the seal subsystem's HARDWARE face lives in UDT/Display and is
// adapter-deferred — but `seal.remove`'s tower.program/ui.prompt directives are merely QUEUED headless,
// while the `state.sealsRemoved` field it mutates is fully engine-owned and lockstep-deterministic. So the
// engine DOES expose a headless break path; the only thing absent from the golden slice was an authored
// trigger, supplied here by the effect.apply node. Both `effect.apply` (node-kind enum) and `seal.remove`
// (effect-op enum) are in the closed schema vocabularies, so the clone stays L1-valid under ajv strict.
function cloneAuthoredLossSeal() {
  const c = JSON.parse(JSON.stringify(golden));
  const nodes: EngineNode[] = c.graph.nodes;
  const amid = nodes.find((n) => n.id === "n-amid")!;
  amid.wires!.out = ["n-sealbreak"];
  const aendIdx = nodes.findIndex((n) => n.id === "n-aend");
  nodes.splice(aendIdx, 0,
    { id: "n-sealbreak", kind: "effect.apply", props: { effects: [{ op: "seal.remove" }] }, wires: { out: ["n-lossguard"] } },
    { id: "n-lossguard", kind: "winloss.lossCondition", props: { condition: cond("sealsRemoved", "gte", 2) }, wires: { out: ["n-aend"] } }
  );
  return c;
}
const goldenAuthoredLossSeal = cloneAuthoredLossSeal();

// A FIFTH authored-loss clone (engine-notes v0.9 / first engine change since v0.6) on the `foeOnSpace`
// subject — the first of the two enum subjects that previously had NO evalCondition branch. v0.9 adds the
// branch: `case "foeOnSpace": lhs = (state.foes||[]).filter(f => f.location === key).length` — so `key`
// is the SPACE and lhs is the COUNT of foes currently on it (consistent with the other scalar subjects:
// key selects, value is the threshold). The driver, like the seal clone, is a spliced `effect.apply`
// carrying a `foe.spawn` (foeId "brigands" — the tier1 foe of the golden setup; location "the-tower"):
// each plain action spawns one foe onto the space (state.foes maintained headless by foe.spawn/foe.move),
// and the guard `foeOnSpace gte 2 key:"the-tower"` fires on the SECOND. (`heroAtLocation` is now
// implemented: heroes carry `location` in engine state, set by hero.placeOrMove and action.move.)
// `foe.spawn` requires foeId (matches the $defs/foeId pattern) + a free-string location, and `effect.apply`
// + `foe.spawn` are both in the closed schema vocabularies, so the clone stays L1-valid under ajv strict.
function cloneAuthoredLossFoe() {
  const c = JSON.parse(JSON.stringify(golden));
  const nodes: EngineNode[] = c.graph.nodes;
  const amid = nodes.find((n) => n.id === "n-amid")!;
  amid.wires!.out = ["n-foespawn"];
  const aendIdx = nodes.findIndex((n) => n.id === "n-aend");
  nodes.splice(aendIdx, 0,
    { id: "n-foespawn", kind: "effect.apply", props: { effects: [{ op: "foe.spawn", foeId: "brigands", location: "the-tower" }] }, wires: { out: ["n-lossguard"] } },
    { id: "n-lossguard", kind: "winloss.lossCondition", props: { condition: cond("foeOnSpace", "gte", 2, "the-tower") }, wires: { out: ["n-aend"] } }
  );
  return c;
}
const goldenAuthoredLossFoe = cloneAuthoredLossFoe();

// ============================= goldenFull — the base-game fidelity scenario =============================
// The scenario actually shipped in Creator/Player. `golden` above stays FROZEN as the compact
// regression fixture (every corpus stream depends on its single-action turn); goldenFull opts into
// the engine's full-turn fidelity via lifecycle.actionMiddle props.turn = "full" and adds:
//   - month 1 = exactly 1 turn per player (rules.md §Turns Per Month)
//   - the real 16-building board registry + hero start at the home citadel (boardState, opaque at L1)
//   - a full turn: optional banner + move + ONE heroic action (quest/cleanse/battle/dungeon,
//     then +2 spirit) + reinforce, in any order, then the mandatory skull drop (rules.md §Taking Your Turn)
//   - end-of-turn events (foes strike/grow, tower stirs, new wares — rules.md §Events)
//   - monthly companion + adversary quests from month 2 (rules.md §Monthly Quests)
//   - a located final confrontation: the main goal spawns Ashstrider at the Tower (rules.md §Main Goal)
function buildGoldenFull() {
  const c = JSON.parse(JSON.stringify(golden));
  c.meta.description = "Base-game fidelity golden scenario — full turn structure, buildings, events, monthly quests (rules.md).";
  // month 1 is exactly one turn per player (rules.md:62)
  c.setup.monthEnd.perMonth["1"] = { minTurn: 1, maxTurn: 1 };
  // the real board: one building of each type per kingdom (buildings.md), heroes start at the citadel
  c.setup.board = { boardState: {
    home: { north: "Radiant Mountains", east: "Inner Kinghills", west: "Hissing Groves", south: "Howling Desert" },
    buildings: [
      { kingdom: "north", type: "citadel",   location: "Radiant Mountains" },
      { kingdom: "north", type: "sanctuary", location: "Upper Ice Fangs" },
      { kingdom: "north", type: "village",   location: "Egan's End" },
      { kingdom: "north", type: "bazaar",    location: "Dayside" },
      { kingdom: "east",  type: "citadel",   location: "Inner Kinghills" },
      { kingdom: "east",  type: "sanctuary", location: "Greater Tombstones" },
      { kingdom: "east",  type: "village",   location: "Duwani" },
      { kingdom: "east",  type: "bazaar",    location: "Three Rivers" },
      { kingdom: "west",  type: "citadel",   location: "Hissing Groves" },
      { kingdom: "west",  type: "sanctuary", location: "Arkartus" },
      { kingdom: "west",  type: "village",   location: "Anza" },
      { kingdom: "west",  type: "bazaar",    location: "Plains of Plovo" },
      { kingdom: "south", type: "citadel",   location: "Howling Desert" },
      { kingdom: "south", type: "sanctuary", location: "Sands of Madness" },
      { kingdom: "south", type: "village",   location: "Southern Wastes" },
      { kingdom: "south", type: "bazaar",    location: "The Emerald Expanse" }
    ]
  } };
  const nodes: EngineNode[] = c.graph.nodes;
  const node = (id: string) => nodes.find((n) => n.id === id)!;
  // the full-turn discriminator + the action loop: performed actions return to Action: Middle
  const amidNode = node("n-amid");
  if (amidNode.kind === "lifecycle.actionMiddle") {
    amidNode.props = { turn: "full" };
  }
  amidNode.wires = { out: ["n-aend"], battle: ["n-bsel"], dungeon: ["n-dsub"], trade: ["n-trade"], move: ["n-move"] };
  node("n-bend").wires = { out: ["n-amid"] };
  node("n-dsub").wires = { enter: ["n-room-a"], completed: ["n-amid"], left: ["n-amid"] };
  node("n-trade").wires = { out: ["n-amid"] };
  const aendIdx = nodes.findIndex((n) => n.id === "n-aend");
  nodes.splice(aendIdx, 0,
    // the Move step (rules.md §Movement) — target-set until Board adjacency ships
    { id: "n-move", kind: "action.move", wires: { out: ["n-amid"] } });
  // monthly quests, issued at each month rollover from month 2 (rules.md §Monthly Quests)
  nodes.push(
    { id: "n-newq", kind: "lifecycle.newQuests", props: { monthly: {
      "2": { companion: "zaida-escort", adversary: "adv-quest-m2" },
      "3": { adversary: "adv-quest-m3" },
      "4": { adversary: "adv-quest-m4" },
      "5": { adversary: "adv-quest-m5" },
      "6": { adversary: "adv-quest-m6" }
    } }, wires: { out: ["n-month"] } },
    // end-of-turn events (rules.md §Events) — scheduled by turn-of-month
    { id: "n-trig-stirs",  kind: "trigger.schedule", props: { trigger: { on: "schedule", turn: 1 } }, wires: { out: ["n-ev-stirs"] } },
    { id: "n-ev-stirs",    kind: "event.towerStirs", props: { level: "top" }, wires: {} },
    { id: "n-trig-wares",  kind: "trigger.schedule", props: { trigger: { on: "schedule", turn: 1 } }, wires: { out: ["n-ev-wares"] } },
    { id: "n-ev-wares",    kind: "event.newWares", props: { cards: ["azkol-idol", "wyrm-scale", "warded-lantern"] }, wires: {} },
    { id: "n-trig-strike", kind: "trigger.schedule", props: { trigger: { on: "schedule", turn: 2 } }, wires: { out: ["n-ev-strike"] } },
    { id: "n-ev-strike",   kind: "event.foesStrike", wires: {} },
    { id: "n-trig-grow",   kind: "trigger.schedule", props: { trigger: { on: "schedule", turn: 3 } }, wires: { out: ["n-ev-grow"] } },
    { id: "n-ev-grow",     kind: "event.foesGrow", wires: {} }
  );
  return c;
}
const goldenFull = buildGoldenFull();

export { golden, goldenFull, goldenLowSupply, goldenAmpleSupply, goldenAuthoredLoss, goldenAuthoredLossFlag, goldenWardedVault, goldenAuthoredLossResource, goldenAuthoredLossSeal, goldenAuthoredLossFoe };
