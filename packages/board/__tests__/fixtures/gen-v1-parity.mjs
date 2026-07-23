#!/usr/bin/env node
/**
 * Generates `v1-parity.json` — the pre-0.5.0 behavioural baseline for
 * `controller.parity.test.ts`.
 *
 * This is a frozen, self-contained JS transliteration of the pre-0.5.0
 * `BoardStateController`/`applyBoardCommand` (captured from git HEAD at the commit
 * immediately before the "board spots & open token types" refactor —
 * `613d2123 fix(creator): PR #50 review remediation, effect forms, and dialog polish`,
 * see `packages/board/src/state/{boardState,commands,reducer,controller}.ts` at that
 * commit) — NOT an import of deleted source. It exists so the pre-refactor behavioural
 * contract has one committed, reproducible source of truth, independent of git history.
 *
 * Do not "fix" this file to match new behaviour — it is deliberately frozen. Run it again
 * only if a mistake in the transliteration itself is found (verify against `git show
 * 613d2123:packages/board/src/state/{reducer,controller}.ts` when in doubt).
 *
 *   node __tests__/fixtures/gen-v1-parity.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

// ---- pre-0.5.0 createDefaultBoardState (16 RtDT building spaces, hardcoded here since the
// old code sourced them from BOARD_LOCATIONS — stable, unaffected by this refactor) ----
const BUILDING_LOCATIONS = [
  'Dayside',
  "Egan's End",
  'Radiant Mountains',
  'Upper Ice Fangs',
  'Duwani',
  'Greater Tombstones',
  'Inner Kinghills',
  'Three Rivers',
  'Howling Desert',
  'Sands of Madness',
  'Southern Wastes',
  'The Emerald Expanse',
  'Anza',
  'Arkartus',
  'Hissing Groves',
  'Plains of Plovo',
];

function createDefaultBoardState() {
  const buildings = {};
  for (const loc of BUILDING_LOCATIONS) buildings[loc] = { skulls: 0, destroyed: false };
  return { heroes: {}, foes: {}, buildings, spaceMarkers: {}, questMarkers: {} };
}

// ---- pre-0.5.0 reducer (transliterated verbatim from reducer.ts at 613d2123) ----
function buildingAt(state, location) {
  return state.buildings[location] ?? { skulls: 0, destroyed: false };
}
function withBuilding(state, location, next) {
  return { ...state.buildings, [location]: next };
}

function applyBoardCommand(state, command) {
  switch (command.type) {
    case 'placeHero':
      return {
        ...state,
        heroes: {
          ...state.heroes,
          [command.heroId]: {
            location: command.location,
            ...(command.owner !== undefined ? { owner: command.owner } : {}),
          },
        },
      };
    case 'moveHero': {
      const hero = state.heroes[command.heroId];
      if (!hero) return state;
      return {
        ...state,
        heroes: { ...state.heroes, [command.heroId]: { ...hero, location: command.location } },
      };
    }
    case 'removeHero': {
      if (!(command.heroId in state.heroes)) return state;
      const heroes = { ...state.heroes };
      delete heroes[command.heroId];
      return { ...state, heroes };
    }
    case 'spawnFoe':
      return {
        ...state,
        foes: {
          ...state.foes,
          [command.foeId]: {
            foe: command.foe,
            location: command.location,
            status: command.status ?? 'ready',
          },
        },
      };
    case 'moveFoe': {
      const foe = state.foes[command.foeId];
      if (!foe) return state;
      return {
        ...state,
        foes: { ...state.foes, [command.foeId]: { ...foe, location: command.location } },
      };
    }
    case 'setFoeStatus': {
      const foe = state.foes[command.foeId];
      if (!foe) return state;
      return {
        ...state,
        foes: { ...state.foes, [command.foeId]: { ...foe, status: command.status } },
      };
    }
    case 'removeFoe': {
      if (!(command.foeId in state.foes)) return state;
      const foes = { ...state.foes };
      delete foes[command.foeId];
      return { ...state, foes };
    }
    case 'selectAdversary':
      return { ...state, adversary: { ...state.adversary, id: command.id } };
    case 'placeAdversary':
      return {
        ...state,
        adversary: {
          ...state.adversary,
          id: state.adversary?.id ?? '',
          location: command.location,
        },
      };
    case 'clearAdversary': {
      if (!state.adversary) return state;
      const next = { ...state };
      delete next.adversary;
      return next;
    }
    case 'addSkull': {
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, {
          ...b,
          skulls: b.skulls + (command.n ?? 1),
        }),
      };
    }
    case 'removeSkull': {
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, {
          ...b,
          skulls: Math.max(0, b.skulls - (command.n ?? 1)),
        }),
      };
    }
    case 'setSkulls': {
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, { ...b, skulls: command.n }),
      };
    }
    case 'destroyBuilding': {
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, { ...b, destroyed: true }),
      };
    }
    case 'restoreBuilding': {
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, { ...b, destroyed: false }),
      };
    }
    case 'setMonument': {
      const b = buildingAt(state, command.location);
      return {
        ...state,
        buildings: withBuilding(state, command.location, { ...b, monument: command.monumentId }),
      };
    }
    case 'setSpaceMarker': {
      const current = state.spaceMarkers[command.location] ?? [];
      const next = command.on
        ? current.includes(command.marker)
          ? current
          : [...current, command.marker]
        : current.filter((m) => m !== command.marker);
      const spaceMarkers = { ...state.spaceMarkers };
      if (next.length === 0) delete spaceMarkers[command.location];
      else spaceMarkers[command.location] = next;
      return { ...state, spaceMarkers };
    }
    case 'setQuestMarker': {
      const current = state.questMarkers[command.location] ?? [];
      const next = command.on
        ? current.includes(command.marker)
          ? current
          : [...current, command.marker]
        : current.filter((m) => m !== command.marker);
      const questMarkers = { ...state.questMarkers };
      if (next.length === 0) delete questMarkers[command.location];
      else questMarkers[command.location] = next;
      return { ...state, questMarkers };
    }
    case 'setSelections':
      return { ...state, selections: { ...state.selections, ...command.selections } };
    case 'replaceState':
      return command.state;
    case 'reset':
      return createDefaultBoardState();
    default:
      return state;
  }
}

// ---- pre-0.5.0 controller convenience methods, driving the reducer above ----
class Controller {
  constructor() {
    this.state = createDefaultBoardState();
  }
  dispatch(command) {
    this.state = applyBoardCommand(this.state, command);
    return this.state;
  }
  placeHero(heroId, location, owner) {
    this.dispatch({ type: 'placeHero', heroId, location, owner });
  }
  moveHero(heroId, location) {
    this.dispatch({ type: 'moveHero', heroId, location });
  }
  removeHero(heroId) {
    this.dispatch({ type: 'removeHero', heroId });
  }
  spawnFoe(foeId, foe, location, status) {
    this.dispatch({ type: 'spawnFoe', foeId, foe, location, status });
  }
  moveFoe(foeId, location) {
    this.dispatch({ type: 'moveFoe', foeId, location });
  }
  setFoeStatus(foeId, status) {
    this.dispatch({ type: 'setFoeStatus', foeId, status });
  }
  removeFoe(foeId) {
    this.dispatch({ type: 'removeFoe', foeId });
  }
  selectAdversary(id) {
    this.dispatch({ type: 'selectAdversary', id });
  }
  placeAdversary(location) {
    this.dispatch({ type: 'placeAdversary', location });
  }
  clearAdversary() {
    this.dispatch({ type: 'clearAdversary' });
  }
  addSkull(location, n) {
    this.dispatch({ type: 'addSkull', location, n });
  }
  removeSkull(location, n) {
    this.dispatch({ type: 'removeSkull', location, n });
  }
  setSkulls(location, n) {
    this.dispatch({ type: 'setSkulls', location, n });
  }
  destroyBuilding(location) {
    this.dispatch({ type: 'destroyBuilding', location });
  }
  restoreBuilding(location) {
    this.dispatch({ type: 'restoreBuilding', location });
  }
  setMonument(location, monumentId) {
    this.dispatch({ type: 'setMonument', location, monumentId });
  }
  setSpaceMarker(location, marker, on) {
    this.dispatch({ type: 'setSpaceMarker', location, marker, on });
  }
  setQuestMarker(location, marker, on) {
    this.dispatch({ type: 'setQuestMarker', location, marker, on });
  }
  setSelections(selections) {
    this.dispatch({ type: 'setSelections', selections });
  }
}

// ---- the ~40-step sequence: every convenience method, plus the edge cases the plan
// singled out as most likely to be lost in a rewrite ----
const A = 'Broken Lands'; // non-building
const B = 'Dayside'; // building
const C = "Egan's End"; // building

const c = new Controller();
const steps = [];
function record(label) {
  steps.push({ label, state: JSON.parse(JSON.stringify(c.state)) });
}

record('initial');
c.placeHero('h1', A, 'north');
record('placeHero h1@A north');
c.placeHero('h2', B);
record('placeHero h2@B no-owner');
c.moveHero('h1', B);
record('moveHero h1 -> B');
c.moveHero('nope', A); // unknown id: no-op
record('moveHero unknown-id (no-op)');
c.removeHero('h2');
record('removeHero h2');
c.removeHero('nope'); // unknown id: no-op
record('removeHero unknown-id (no-op)');

c.spawnFoe('f1', 'Brigands', A);
record('spawnFoe f1 default status ready');
c.spawnFoe('f2', 'Oreks', B, 'lethal');
record('spawnFoe f2 explicit status lethal');
c.moveFoe('f1', B);
record('moveFoe f1 -> B');
c.moveFoe('nope', A); // unknown id: no-op
record('moveFoe unknown-id (no-op)');
c.setFoeStatus('f1', 'savage');
record('setFoeStatus f1 savage');
c.setFoeStatus('nope', 'savage'); // unknown id: no-op
record('setFoeStatus unknown-id (no-op)');
c.removeFoe('f2');
record('removeFoe f2');
c.removeFoe('nope'); // unknown id: no-op
record('removeFoe unknown-id (no-op)');

c.selectAdversary('utuk-ku'); // before placeAdversary
record('selectAdversary before placeAdversary');
c.placeAdversary(B);
record('placeAdversary B');
c.clearAdversary();
record('clearAdversary');
c.placeAdversary(A); // placeAdversary before selectAdversary -> id ''
record('placeAdversary before selectAdversary (empty id)');
c.selectAdversary('gravemaw'); // now backfills identity, keeps location
record('selectAdversary after placeAdversary (identity backfilled)');

c.addSkull(B); // default 1
record('addSkull B default 1');
c.addSkull(B, 2);
record('addSkull B +2 (3 total)');
c.addSkull(B); // 3 -> 4, no clamp
record('addSkull B +1 (4 total, no clamp)');
c.removeSkull(B, 10); // floors at 0
record('removeSkull B -10 (floors at 0)');
c.setSkulls(B, 7); // no clamp, writes exactly
record('setSkulls B = 7 (no clamp)');
c.destroyBuilding(B);
record('destroyBuilding B');
c.restoreBuilding(B);
record('restoreBuilding B');
c.setMonument(C, 'argent-oak');
record('setMonument C argent-oak');
c.setMonument(C, null);
record('setMonument C null (cleared)');
c.addSkull('Nowhere Real', 2); // unknown location still applies
record('addSkull unknown location (still applies)');

c.setSpaceMarker(A, 'wasteland', true);
record('setSpaceMarker A wasteland on');
c.setSpaceMarker(A, 'wasteland', true); // idempotent
record('setSpaceMarker A wasteland on (idempotent re-add)');
c.setSpaceMarker(A, 'power-skull', true);
record('setSpaceMarker A power-skull on');
c.setSpaceMarker(A, 'wasteland', false);
record('setSpaceMarker A wasteland off');
c.setSpaceMarker(A, 'nope', false); // absent marker: no-op, key survives via power-skull
record('setSpaceMarker A nope off (absent, no-op)');
c.setSpaceMarker(A, 'power-skull', false);
record('setSpaceMarker A power-skull off (key removed)');

c.setQuestMarker(B, 'main-goal', true);
record('setQuestMarker B main-goal on');
c.setQuestMarker(B, 'main-goal', true); // idempotent
record('setQuestMarker B main-goal on (idempotent re-add)');
c.setQuestMarker(B, 'main-goal', false);
record('setQuestMarker B main-goal off (key removed)');

c.setSelections({ difficulty: 'Heroic', allies: ['a1'] });
record('setSelections difficulty+allies');
c.setSelections({ difficulty: 'Gritty' }); // shallow merge
record('setSelections difficulty overwrite (shallow merge)');

c.dispatch({ type: 'reset' });
record('reset');

writeFileSync(resolve(here, 'v1-parity.json'), JSON.stringify(steps, null, 2) + '\n');
console.log(`Wrote v1-parity.json (${steps.length} steps)`);
