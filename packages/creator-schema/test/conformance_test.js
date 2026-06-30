const Ajv = require("ajv/dist/2020");
const addFormats = require("ajv-formats");
const fs = require("fs");
const { base, clone } = require("./fixtures");

const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
let validate;
try {
  validate = ajv.compile(JSON.parse(fs.readFileSync(require("path").join(__dirname, "../src/scenario.schema.json"), "utf8")));
  console.log("SCHEMA COMPILED OK (strict mode)\n");
} catch (e) {
  console.log("SCHEMA FAILED TO COMPILE:\n" + e.message);
  process.exit(1);
}

let pass = 0, fail = 0;
function check(name, instance, expectValid) {
  const ok = validate(instance);
  const correct = ok === expectValid;
  console.log(`${correct ? "PASS" : "XXXX"}  ${name}  (expected ${expectValid ? "valid" : "INVALID"}, got ${ok ? "valid" : "invalid"})`);
  if (!correct) {
    fail++;
    if (validate.errors) console.log("      -> " + validate.errors.slice(0,2).map(e => e.instancePath + " " + e.message).join(" | "));
  } else pass++;
}

// Positive
check("valid full MVP scenario", base, true);

// Negative: unknown effect op
let t = clone(base); t.library.buildingTypes.citadel.free[0] = { op: "teleport.hero" };
check("unknown effect op rejected", t, false);

// Negative: extra prop on a closed effect
t = clone(base); t.library.buildingTypes.village.free[0] = { op: "resource.gain", resource: "warriors", amount: 2, bogus: 1 };
check("extra prop on resource.gain rejected", t, false);

// Negative: 5th building type
t = clone(base); t.library.buildingTypes.fortress = clone(base.library.buildingTypes.citadel);
check("5th building type rejected", t, false);

// Negative: skull.dropTrigger carrying a count (emergence count must be tower-determined)
t = clone(base); t.graph.nodes[3].props.towerOp = { channel: "skull.dropTrigger", count: 3 };
check("skull.dropTrigger with count rejected", t, false);

// Negative: missing meta.pins
t = clone(base); delete t.meta.pins;
check("missing meta.pins rejected", t, false);

// Negative: bad seed format
t = clone(base); t.meta.provenance.importedSeed.seed = "not-a-seed";
check("malformed seed rejected", t, false);

// Negative: foes selection missing tier3
t = clone(base); delete t.setup.selections.foes.tier3;
check("incomplete foe selection rejected", t, false);

// Negative: light.named without sequenceId
t = clone(base); t.graph.nodes[3].props.towerOp = { channel: "light.named" };
check("light.named missing sequenceId rejected", t, false);

// Negative: effect.apply node with neither effect nor effects
t = clone(base); t.graph.nodes[2].props = {};
check("effect.apply with empty props rejected", t, false);

// Negative: corruption.remove with neither all nor count
t = clone(base); t.library.buildingTypes.sanctuary.enhanced.effects[0] = { op: "corruption.remove" };
check("corruption.remove without all/count rejected", t, false);

// Positive: corruption.remove count form
t = clone(base); t.library.buildingTypes.sanctuary.enhanced.effects[0] = { op: "corruption.remove", count: 1 };
check("corruption.remove count form accepted", t, true);

// --- Corpus: fixtures/valid/ (expect valid) and fixtures/invalid/ (expect invalid) ---
const fixturesDir = require("path").join(__dirname, "../fixtures");
for (const [dir, expectValid] of [["valid", true], ["invalid", false]]) {
  const dirPath = require("path").join(fixturesDir, dir);
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith(".json")).sort();
  for (const file of files) {
    const doc = JSON.parse(fs.readFileSync(require("path").join(dirPath, file), "utf8"));
    check(file, doc, expectValid);
  }
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
