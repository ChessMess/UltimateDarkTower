import { createDefaultBoardState, applyBoardCommand } from '../src/index';
import type { BoardState } from '../src/index';

const BUILDING = 'Dayside'; // a real building location
const GENERIC = 'Broken Lands'; // a real non-building location

describe('createDefaultBoardState', () => {
  it('seeds all 16 building spaces at { skulls: 0, destroyed: false } and nothing else', () => {
    const s = createDefaultBoardState();
    expect(Object.keys(s.buildings)).toHaveLength(16);
    for (const b of Object.values(s.buildings)) {
      expect(b).toEqual({ skulls: 0, destroyed: false });
    }
    expect(s.heroes).toEqual({});
    expect(s.foes).toEqual({});
    expect(s.spaceMarkers).toEqual({});
    expect(s.adversary).toBeUndefined();
    expect(s.selections).toBeUndefined();
    expect(s.meta).toBeUndefined();
  });
});

describe('reducer — heroes', () => {
  it('placeHero adds an entry (with optional owner) without mutating the input', () => {
    const s0 = createDefaultBoardState();
    const s1 = applyBoardCommand(s0, {
      type: 'placeHero',
      heroId: 'h1',
      location: GENERIC,
      owner: 'north',
    });
    expect(s1).not.toBe(s0);
    expect(s0.heroes).toEqual({});
    expect(s1.heroes).toEqual({ h1: { location: GENERIC, owner: 'north' } });
  });

  it('moveHero updates location; unknown hero is a no-op (same reference)', () => {
    const s1 = applyBoardCommand(createDefaultBoardState(), {
      type: 'placeHero',
      heroId: 'h1',
      location: GENERIC,
    });
    const s2 = applyBoardCommand(s1, { type: 'moveHero', heroId: 'h1', location: BUILDING });
    expect(s2.heroes.h1.location).toBe(BUILDING);

    const s3 = applyBoardCommand(s2, { type: 'moveHero', heroId: 'nope', location: GENERIC });
    expect(s3).toBe(s2);
  });

  it('removeHero deletes the key', () => {
    const s1 = applyBoardCommand(createDefaultBoardState(), {
      type: 'placeHero',
      heroId: 'h1',
      location: GENERIC,
    });
    const s2 = applyBoardCommand(s1, { type: 'removeHero', heroId: 'h1' });
    expect(s2.heroes).toEqual({});
    expect(s1.heroes.h1).toBeDefined(); // input unchanged
  });
});

describe('reducer — foes', () => {
  it('spawnFoe defaults status to ready; honors an explicit status', () => {
    const s1 = applyBoardCommand(createDefaultBoardState(), {
      type: 'spawnFoe',
      foeId: 'f1',
      foe: 'Brigands',
      location: GENERIC,
    });
    expect(s1.foes.f1).toEqual({ foe: 'Brigands', location: GENERIC, status: 'ready' });

    const s2 = applyBoardCommand(s1, {
      type: 'spawnFoe',
      foeId: 'f2',
      foe: 'Oreks',
      location: BUILDING,
      status: 'lethal',
    });
    expect(s2.foes.f2.status).toBe('lethal');
  });

  it('moveFoe, setFoeStatus, removeFoe', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'spawnFoe',
      foeId: 'f1',
      foe: 'Brigands',
      location: GENERIC,
    });
    s = applyBoardCommand(s, { type: 'moveFoe', foeId: 'f1', location: BUILDING });
    expect(s.foes.f1.location).toBe(BUILDING);
    s = applyBoardCommand(s, { type: 'setFoeStatus', foeId: 'f1', status: 'savage' });
    expect(s.foes.f1.status).toBe('savage');
    s = applyBoardCommand(s, { type: 'removeFoe', foeId: 'f1' });
    expect(s.foes).toEqual({});
  });
});

describe('reducer — adversary', () => {
  it('select, place, then clear', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'selectAdversary',
      id: 'utuk-ku',
    });
    expect(s.adversary).toEqual({ id: 'utuk-ku' });
    s = applyBoardCommand(s, { type: 'placeAdversary', location: BUILDING });
    expect(s.adversary).toEqual({ id: 'utuk-ku', location: BUILDING });
    s = applyBoardCommand(s, { type: 'clearAdversary' });
    expect(s.adversary).toBeUndefined();
  });
});

describe('reducer — buildings (no rule enforcement)', () => {
  it('addSkull defaults to 1 and does NOT clamp (3 -> 4 stays 4)', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'setSkulls',
      location: BUILDING,
      n: 3,
    });
    s = applyBoardCommand(s, { type: 'addSkull', location: BUILDING });
    expect(s.buildings[BUILDING].skulls).toBe(4);
  });

  it('removeSkull floors at 0; setSkulls writes exactly (incl. > 3)', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'removeSkull',
      location: BUILDING,
      n: 5,
    });
    expect(s.buildings[BUILDING].skulls).toBe(0);
    s = applyBoardCommand(s, { type: 'setSkulls', location: BUILDING, n: 7 });
    expect(s.buildings[BUILDING].skulls).toBe(7);
  });

  it('destroy/restore toggle the flag and leave skulls untouched', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'setSkulls',
      location: BUILDING,
      n: 2,
    });
    s = applyBoardCommand(s, { type: 'destroyBuilding', location: BUILDING });
    expect(s.buildings[BUILDING]).toMatchObject({ skulls: 2, destroyed: true });
    s = applyBoardCommand(s, { type: 'restoreBuilding', location: BUILDING });
    expect(s.buildings[BUILDING]).toMatchObject({ skulls: 2, destroyed: false });
  });

  it('setMonument writes then clears with null', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'setMonument',
      location: BUILDING,
      monumentId: 'argent-oak',
    });
    expect(s.buildings[BUILDING].monument).toBe('argent-oak');
    s = applyBoardCommand(s, { type: 'setMonument', location: BUILDING, monumentId: null });
    expect(s.buildings[BUILDING].monument).toBeNull();
  });

  it('a building command on an unknown location still applies (stores it) and only warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const s = applyBoardCommand(createDefaultBoardState(), {
      type: 'addSkull',
      location: 'Nowhere Real',
      n: 2,
    });
    expect(s.buildings['Nowhere Real']).toEqual({ skulls: 2, destroyed: false });
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Nowhere Real'));
    warn.mockRestore();
  });
});

describe('reducer — space markers', () => {
  it('adds (deduped), removes, and drops the key when empty', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'setSpaceMarker',
      location: GENERIC,
      marker: 'wasteland',
      on: true,
    });
    expect(s.spaceMarkers[GENERIC]).toEqual(['wasteland']);

    s = applyBoardCommand(s, {
      type: 'setSpaceMarker',
      location: GENERIC,
      marker: 'wasteland',
      on: true,
    });
    expect(s.spaceMarkers[GENERIC]).toEqual(['wasteland']); // deduped

    s = applyBoardCommand(s, {
      type: 'setSpaceMarker',
      location: GENERIC,
      marker: 'power-skull',
      on: true,
    });
    expect(s.spaceMarkers[GENERIC]).toEqual(['wasteland', 'power-skull']);

    s = applyBoardCommand(s, {
      type: 'setSpaceMarker',
      location: GENERIC,
      marker: 'wasteland',
      on: false,
    });
    s = applyBoardCommand(s, {
      type: 'setSpaceMarker',
      location: GENERIC,
      marker: 'power-skull',
      on: false,
    });
    expect(GENERIC in s.spaceMarkers).toBe(false); // key removed
  });
});

describe('reducer — quest markers', () => {
  it('adds (deduped), removes, and drops the key when empty', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'setQuestMarker',
      location: GENERIC,
      marker: 'main-goal',
      on: true,
    });
    expect(s.questMarkers[GENERIC]).toEqual(['main-goal']);

    s = applyBoardCommand(s, {
      type: 'setQuestMarker',
      location: GENERIC,
      marker: 'main-goal',
      on: true,
    });
    expect(s.questMarkers[GENERIC]).toEqual(['main-goal']); // deduped

    s = applyBoardCommand(s, {
      type: 'setQuestMarker',
      location: GENERIC,
      marker: 'guild-quest',
      on: true,
    });
    expect(s.questMarkers[GENERIC]).toEqual(['main-goal', 'guild-quest']);

    s = applyBoardCommand(s, {
      type: 'setQuestMarker',
      location: GENERIC,
      marker: 'main-goal',
      on: false,
    });
    s = applyBoardCommand(s, {
      type: 'setQuestMarker',
      location: GENERIC,
      marker: 'guild-quest',
      on: false,
    });
    expect(GENERIC in s.questMarkers).toBe(false); // key removed
  });
});

describe('reducer — selections / replace / reset', () => {
  it('setSelections shallow-merges', () => {
    let s = applyBoardCommand(createDefaultBoardState(), {
      type: 'setSelections',
      selections: { difficulty: 'Heroic', allies: ['a1'] },
    });
    s = applyBoardCommand(s, { type: 'setSelections', selections: { difficulty: 'Gritty' } });
    expect(s.selections).toEqual({ difficulty: 'Gritty', allies: ['a1'] });
  });

  it('replaceState returns the given state; reset returns a fresh default', () => {
    const replacement: BoardState = {
      heroes: { x: { location: GENERIC } },
      foes: {},
      buildings: {},
      spaceMarkers: {},
      questMarkers: {},
    };
    expect(
      applyBoardCommand(createDefaultBoardState(), { type: 'replaceState', state: replacement }),
    ).toBe(replacement);

    const reset = applyBoardCommand(replacement, { type: 'reset' });
    expect(reset).toEqual(createDefaultBoardState());
  });
});
