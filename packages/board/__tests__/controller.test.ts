import { BoardStateController, createDefaultBoardState } from '../src/index';
import {
  adversaryOf,
  buildingAt,
  markersAt,
  monumentAt,
  questsAt,
  skullsAt,
} from '../src/state/selectors';
import type { BoardEvent } from '../src/index';

const BUILDING = 'Dayside';
const GENERIC = 'Broken Lands';

describe('BoardStateController — self mode (default)', () => {
  it('dispatch updates getState() and emits change + the specific event', () => {
    const c = new BoardStateController();
    const events: BoardEvent[] = [];
    c.subscribe((e) => events.push(e));

    c.placeHero('h1', GENERIC, 'north');

    expect(c.getState().tokens.h1).toEqual({
      id: 'h1',
      typeId: 'hero',
      location: GENERIC,
      art: 'h1',
      data: { owner: 'north' },
    });
    expect(events.map((e) => e.type)).toEqual(['change', 'tokenAdded']);
    expect(events[1]).toEqual({ type: 'tokenAdded', kind: 'hero', id: 'h1', location: GENERIC });
  });

  it('derives tokenChanged / selectionChanged with the right payload', () => {
    const c = new BoardStateController();

    let building: BoardEvent | undefined;
    c.on('tokenChanged', (e) => (building = e));
    c.addSkull(BUILDING, 2);
    expect(building).toEqual({ type: 'tokenChanged', kind: 'skull', id: `skull:${BUILDING}` });
    expect(skullsAt(c.getState(), BUILDING)).toBe(2);

    let selection: BoardEvent | undefined;
    c.on('selectionChanged', (e) => (selection = e));
    c.setSelections({ difficulty: 'Heroic' });
    expect(selection).toEqual({ type: 'selectionChanged', selections: { difficulty: 'Heroic' } });
  });

  it('on(type) filters and unsubscribe stops delivery', () => {
    const c = new BoardStateController();
    const changes: BoardEvent[] = [];
    const off = c.on('change', (e) => changes.push(e));

    c.placeHero('h1', GENERIC);
    expect(changes).toHaveLength(1);

    off();
    c.placeHero('h2', GENERIC);
    expect(changes).toHaveLength(1); // no further delivery after unsubscribe
  });
});

describe('BoardStateController — convenience methods over the generic ops', () => {
  it('placeHero / moveHero / removeHero', () => {
    const c = new BoardStateController();
    c.placeHero('h1', GENERIC, 'north');
    expect(c.getState().tokens.h1).toMatchObject({ location: GENERIC, typeId: 'hero' });
    c.moveHero('h1', BUILDING);
    expect(c.getState().tokens.h1.location).toBe(BUILDING);
    c.moveHero('nope', GENERIC); // unknown id: no-op
    expect(c.getState().tokens.nope).toBeUndefined();
    c.removeHero('h1');
    expect(c.getState().tokens.h1).toBeUndefined();
  });

  it('spawnFoe defaults status to ready; moveFoe/setFoeStatus/removeFoe', () => {
    const c = new BoardStateController();
    c.spawnFoe('f1', 'Brigands', GENERIC);
    expect(c.getState().tokens.f1).toMatchObject({ art: 'Brigands', data: { status: 'ready' } });
    c.spawnFoe('f2', 'Oreks', BUILDING, 'lethal');
    expect(c.getState().tokens.f2.data).toEqual({ status: 'lethal' });

    c.moveFoe('f1', BUILDING);
    expect(c.getState().tokens.f1.location).toBe(BUILDING);
    c.setFoeStatus('f1', 'savage');
    expect(c.getState().tokens.f1.data).toEqual({ status: 'savage' });
    c.setFoeStatus('nope', 'savage'); // unknown id: no-op, no throw
    c.removeFoe('f1');
    expect(c.getState().tokens.f1).toBeUndefined();
  });

  it('selectAdversary then placeAdversary then clearAdversary', () => {
    const c = new BoardStateController();
    c.selectAdversary('utuk-ku');
    expect(adversaryOf(c.getState())).toEqual({ id: 'utuk-ku' });
    c.placeAdversary(BUILDING);
    expect(adversaryOf(c.getState())).toEqual({ id: 'utuk-ku', location: BUILDING });
    c.clearAdversary();
    expect(adversaryOf(c.getState())).toBeUndefined();
  });

  it('placeAdversary before selectAdversary leaves an empty-identity placeholder', () => {
    const c = new BoardStateController();
    c.placeAdversary(GENERIC);
    expect(adversaryOf(c.getState())).toEqual({ id: '', location: GENERIC });
    c.selectAdversary('gravemaw');
    expect(adversaryOf(c.getState())).toEqual({ id: 'gravemaw', location: GENERIC }); // location preserved
  });

  it('addSkull defaults to 1 and does NOT clamp (3 -> 4 stays 4)', () => {
    const c = new BoardStateController();
    c.setSkulls(BUILDING, 3);
    c.addSkull(BUILDING);
    expect(skullsAt(c.getState(), BUILDING)).toBe(4);
  });

  it('removeSkull floors at 0; setSkulls writes exactly (incl. > 3)', () => {
    const c = new BoardStateController();
    c.removeSkull(BUILDING, 5);
    expect(skullsAt(c.getState(), BUILDING)).toBe(0);
    c.setSkulls(BUILDING, 7);
    expect(skullsAt(c.getState(), BUILDING)).toBe(7);
  });

  it('destroy/restore toggle the flag and leave skulls untouched', () => {
    const c = new BoardStateController();
    c.setSkulls(BUILDING, 2);
    c.destroyBuilding(BUILDING);
    expect(buildingAt(c.getState(), BUILDING).destroyed).toBe(true);
    expect(skullsAt(c.getState(), BUILDING)).toBe(2);
    c.restoreBuilding(BUILDING);
    expect(buildingAt(c.getState(), BUILDING).destroyed).toBe(false);
  });

  it('setMonument writes then clears with null', () => {
    const c = new BoardStateController();
    c.setMonument(BUILDING, 'argent-oak');
    expect(monumentAt(c.getState(), BUILDING)).toBe('argent-oak');
    c.setMonument(BUILDING, null);
    expect(monumentAt(c.getState(), BUILDING)).toBeUndefined();
  });

  it('a building command on an unknown (never-seeded) location still applies and only warns', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const c = new BoardStateController();
    c.addSkull('Nowhere Real', 2);
    expect(skullsAt(c.getState(), 'Nowhere Real')).toBe(2);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Nowhere Real'));
    warn.mockRestore();
  });

  it('setSpaceMarker adds (idempotent), removes; setQuestMarker likewise', () => {
    const c = new BoardStateController();
    c.setSpaceMarker(GENERIC, 'wasteland', true);
    expect(markersAt(c.getState(), GENERIC)).toEqual(['wasteland']);
    c.setSpaceMarker(GENERIC, 'wasteland', true); // re-adding is idempotent
    expect(markersAt(c.getState(), GENERIC)).toEqual(['wasteland']);
    c.setSpaceMarker(GENERIC, 'power-skull', true);
    expect(markersAt(c.getState(), GENERIC).sort()).toEqual(['power-skull', 'wasteland']);
    c.setSpaceMarker(GENERIC, 'wasteland', false);
    expect(markersAt(c.getState(), GENERIC)).toEqual(['power-skull']);
    c.setSpaceMarker(GENERIC, 'nope', false); // removing an absent marker is a no-op, no throw

    c.setQuestMarker(GENERIC, 'main-goal', true);
    expect(questsAt(c.getState(), GENERIC)).toEqual(['main-goal']);
    c.setQuestMarker(GENERIC, 'main-goal', false);
    expect(questsAt(c.getState(), GENERIC)).toEqual([]);
  });

  it('placeToken / removeToken (the adapter/engine directive surface)', () => {
    const c = new BoardStateController();
    const id = c.placeToken({ typeId: 'trap', location: GENERIC });
    expect(c.getState().tokens[id]).toMatchObject({ typeId: 'trap', location: GENERIC });

    // A second placement of the same custom type at the same location...
    c.placeToken({ typeId: 'trap', location: GENERIC });
    expect(Object.values(c.getState().tokens).filter((t) => t.typeId === 'trap')).toHaveLength(2);

    // ...and removeToken(typeId, location) removes every match, mirroring the engine's own
    // filter semantics (the directive carries no instance id).
    c.removeToken('trap', GENERIC);
    expect(Object.values(c.getState().tokens).filter((t) => t.typeId === 'trap')).toHaveLength(0);
  });
});

describe('BoardStateController — one flat token collection', () => {
  it('a hero and foe can no longer coexist under the same instance id (unlike the pre-0.5.0 buckets) — placing overwrites', () => {
    const c = new BoardStateController();
    c.placeHero('x', GENERIC);
    c.spawnFoe('x', 'goblin', GENERIC);
    expect(c.getState().tokens.x.typeId).toBe('foe'); // the later placement won
  });
});

describe('BoardStateController — moveToken (kind resolver)', () => {
  const A = GENERIC;
  const B = BUILDING;

  it('resolves a hero by id and emits tokenMoved {kind:hero}', () => {
    const c = new BoardStateController();
    c.placeHero('h1', A);
    const moved: BoardEvent[] = [];
    c.on('tokenMoved', (e) => moved.push(e));

    expect(c.moveToken('h1', B)).toBe('hero');
    expect(c.getState().tokens.h1.location).toBe(B);
    expect(moved).toEqual([{ type: 'tokenMoved', kind: 'hero', id: 'h1', location: B }]);
  });

  it('resolves a foe by id and emits tokenMoved {kind:foe}', () => {
    const c = new BoardStateController();
    c.spawnFoe('f1', 'goblin', A);
    const moved: BoardEvent[] = [];
    c.on('tokenMoved', (e) => moved.push(e));

    expect(c.moveToken('f1', B)).toBe('foe');
    expect(c.getState().tokens.f1.location).toBe(B);
    expect(moved).toEqual([{ type: 'tokenMoved', kind: 'foe', id: 'f1', location: B }]);
  });

  it('resolves the adversary by identity and emits tokenMoved {kind:adversary}', () => {
    const c = new BoardStateController();
    c.selectAdversary('ad1');
    c.placeAdversary(A);
    const moved: BoardEvent[] = [];
    c.on('tokenMoved', (e) => moved.push(e));

    expect(c.moveToken('ad1', B)).toBe('adversary');
    expect(adversaryOf(c.getState())).toEqual({ id: 'ad1', location: B });
    expect(moved).toEqual([{ type: 'tokenMoved', kind: 'adversary', id: 'ad1', location: B }]);
  });

  it('a hero/foe instance id wins over an adversary sharing the same identity', () => {
    const c = new BoardStateController();
    c.placeHero('x', A);
    c.selectAdversary('x');
    c.placeAdversary(A);

    expect(c.moveToken('x', B)).toBe('hero');
    expect(c.getState().tokens.x.location).toBe(B);
    expect(adversaryOf(c.getState())?.location).toBe(A); // adversary untouched
  });

  it('returns null and is a no-op for an unknown id', () => {
    const c = new BoardStateController();
    c.placeHero('h1', A);
    const before = c.getState();
    const events: BoardEvent[] = [];
    c.subscribe((e) => events.push(e));

    expect(c.moveToken('nope', B)).toBeNull();
    expect(c.getState()).toBe(before); // identity unchanged
    expect(events).toHaveLength(0); // nothing dispatched
  });

  it('does not match an adversary that has no real identity (empty-id placeholder)', () => {
    const c = new BoardStateController();
    c.placeAdversary(A); // placed before selectAdversary → identity is ''
    expect(adversaryOf(c.getState())).toEqual({ id: '', location: A });

    expect(c.moveToken('', B)).toBeNull();
    expect(adversaryOf(c.getState())).toEqual({ id: '', location: A }); // not moved
  });
});

describe('BoardStateController — host mode', () => {
  it('dispatch does not mutate held state but emits the projected change intent', () => {
    const c = new BoardStateController({ mode: 'host' });
    const events: BoardEvent[] = [];
    c.subscribe((e) => events.push(e));

    const projected = c.dispatch({
      type: 'placeToken',
      id: 'h1',
      typeId: 'hero',
      location: GENERIC,
    });

    expect(c.getState().tokens.h1).toBeUndefined(); // held state untouched
    expect(projected.tokens.h1).toBeDefined(); // returned projection reflects the command
    expect(events.map((e) => e.type)).toEqual(['change']); // no specific events in host mode
    expect((events[0] as Extract<BoardEvent, { type: 'change' }>).state.tokens.h1).toBeDefined();
  });

  it('applyState is the commit path and emits a replaceState-shaped change', () => {
    const c = new BoardStateController({ mode: 'host' });
    const events: BoardEvent[] = [];
    c.subscribe((e) => events.push(e));

    const next = createDefaultBoardState();
    next.tokens.h1 = { id: 'h1', typeId: 'hero', location: GENERIC };
    c.applyState(next);

    expect(c.getState()).toBe(next);
    expect(events).toHaveLength(1);
    const change = events[0] as Extract<BoardEvent, { type: 'change' }>;
    expect(change.type).toBe('change');
    expect(change.command).toEqual({ type: 'replaceState', state: next });
  });
});
