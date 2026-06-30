// fixtures.js — conformance base fixture + clone helper for the RTDT scenario schema.
// Reconstructed (2026-06-25) for the v0.3 baseline / v0.4 work. The `base` is a minimal but
// fully valid MVP scenario — *Recover Azkol's Treasures* (Ashstrider; Brigands/Frost Trolls/
// Dragons; ally Zaida; seed AA9A-AAGS-W634) — exercising every field the harness mutates.
// Node ordering is contractual: nodes[2] is the effect.apply node, nodes[3] the tower.op node.

const effGainWarriors = { op: "resource.gain", resource: "warriors", amount: 1 };

const buildingType = (freeEffect, enhancedEffect) => ({
  free: [freeEffect],
  enhanced: { cost: { resource: "spirit", amount: 1 }, effects: [enhancedEffect] },
  skullCapacity: 3
});

const base = {
  schemaVersion: "0.4.0",
  meta: {
    title: "Recover Azkol's Treasures",
    description: "MVP golden fixture — the recommended first game.",
    scenarioVersion: "0.1.0",
    designer: { name: "ChessMess" },
    pins: { udt: "4.1.0" },
    provenance: {
      importedSeed: {
        seed: "AA9A-AAGS-W634",
        decodedSetup: {
          tier1Foe: "Brigands", tier2Foe: "Frost Trolls", tier3Foe: "Dragons",
          adversary: "Ashstrider", ally: "Zaida",
          difficulty: "Heroic", source: "Core", playerCount: 1
        }
      }
    }
  },
  setup: {
    mode: "coop",
    difficulty: { profile: "heroic", skullSupply: 24 },
    playerCountScaling: { turnsPerMonth: { "1": 6, "2": 7, "3": 8, "4": 9 } },
    monthEnd: { resolution: "randomInRange", default: { minTurn: 3, maxTurn: 6 } },
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
      citadel:   buildingType(effGainWarriors, { op: "resource.gain", resource: "warriors", amount: 2 }),
      sanctuary: buildingType(effGainWarriors, { op: "corruption.remove", all: true }),
      village:   buildingType(effGainWarriors, { op: "resource.gain", resource: "spirit", amount: 1 }),
      bazaar:    buildingType(effGainWarriors, { op: "market.refresh" })
    }
  },
  graph: {
    entry: "n-start",
    nodes: [
      { id: "n-start",  kind: "lifecycle.gameStart" },
      { id: "n-import", kind: "lifecycle.importSeed" },
      { id: "n-eff",    kind: "effect.apply", props: { effects: [{ op: "resource.gain", resource: "warriors", amount: 2 }] } },
      { id: "n-tower",  kind: "tower.op",     props: { towerOp: { channel: "skull.dropTrigger" } } }
    ]
  }
};

// Deep clone so mutations in one case never leak into the next.
const clone = (x) => (typeof structuredClone === "function"
  ? structuredClone(x)
  : JSON.parse(JSON.stringify(x)));

module.exports = { base, clone };
