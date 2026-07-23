// Board presets used by the sidebar buttons and the initial load.
import {
  ADVERSARIES,
  BOARD_LOCATIONS,
  TIER1_FOES,
  TIER2_FOES,
  TIER3_FOES,
  foesOf,
} from '../../src/index';
import type { BoardStateController } from '../../src/index';

const ALL_FOES = [...TIER1_FOES, ...TIER2_FOES, ...TIER3_FOES];
const ALL_LOCATIONS = BOARD_LOCATIONS.map((l) => l.name);
const BUILDING_LOCATIONS = BOARD_LOCATIONS.filter((l) => l.building).map((l) => l.name);

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** The canonical demo setup — real foes / adversary / monument / skull / marker / quest + a hero portrait. */
export function seedBoard(c: BoardStateController): void {
  c.placeHero('brutal-warlord', 'Broken Lands', 'north');
  c.spawnFoe('foe-1', 'Brigands', 'Dayside');
  c.spawnFoe('foe-2', 'Dragons', 'Radiant Mountains');
  c.spawnFoe('foe-3', 'Frost Trolls', 'Lower Ice Fangs');
  c.selectAdversary("Utuk'Ku");
  c.placeAdversary('Upper Ice Fangs');
  c.addSkull('Dayside', 2);
  c.setMonument("Egan's End", 'argent-oak');
  c.setSpaceMarker('Broken Lands', 'wasteland', true);
  c.setQuestMarker('Radiant Mountains', 'main-goal', true);
}

/** Clears, then scatters a handful of random foes / skulls / an adversary. */
export function randomizeBoard(c: BoardStateController): void {
  c.reset();
  const foeCount = 3 + Math.floor(Math.random() * 4);
  for (let i = 0; i < foeCount; i++) {
    c.spawnFoe(`foe-${i + 1}`, pick(ALL_FOES), pick(ALL_LOCATIONS));
  }
  c.selectAdversary(pick(ALL_ADVERSARIES));
  c.placeAdversary(pick(ALL_LOCATIONS));
  for (let i = 0; i < 3; i++) {
    c.addSkull(pick(BUILDING_LOCATIONS), 1 + Math.floor(Math.random() * 3));
  }
}

const ALL_ADVERSARIES = [...ADVERSARIES];

/** Next free `foe-N` instance id against the current state. */
export function nextFoeId(c: BoardStateController): string {
  const ids = new Set(foesOf(c.getState()).map((f) => f.id));
  let n = 1;
  while (ids.has(`foe-${n}`)) n++;
  return `foe-${n}`;
}

export function randomLocation(): string {
  return pick(ALL_LOCATIONS);
}

export function randomBuilding(): string {
  return pick(BUILDING_LOCATIONS);
}

export { ALL_FOES };
