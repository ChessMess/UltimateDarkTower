import { BoardStateController, createDefaultBoardState } from '../src/index';
import type { BoardEvent } from '../src/index';

const BUILDING = 'Dayside';
const GENERIC = 'Broken Lands';

describe('BoardStateController — self mode (default)', () => {
  it('dispatch updates getState() and emits change + the specific event', () => {
    const c = new BoardStateController();
    const events: BoardEvent[] = [];
    c.subscribe((e) => events.push(e));

    c.placeHero('h1', GENERIC, 'north');

    expect(c.getState().heroes.h1).toEqual({ location: GENERIC, owner: 'north' });
    expect(events.map((e) => e.type)).toEqual(['change', 'tokenAdded']);
    expect(events[1]).toEqual({ type: 'tokenAdded', kind: 'hero', id: 'h1', location: GENERIC });
  });

  it('derives buildingChanged / spaceMarkerChanged / selectionChanged with the right payload', () => {
    const c = new BoardStateController();

    let building: BoardEvent | undefined;
    c.on('buildingChanged', (e) => (building = e));
    c.addSkull(BUILDING, 2);
    expect(building).toEqual({
      type: 'buildingChanged',
      location: BUILDING,
      building: { skulls: 2, destroyed: false },
    });

    let marker: BoardEvent | undefined;
    c.on('spaceMarkerChanged', (e) => (marker = e));
    c.setSpaceMarker(GENERIC, 'wasteland', true);
    expect(marker).toEqual({ type: 'spaceMarkerChanged', location: GENERIC, markers: ['wasteland'] });

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

describe('BoardStateController — moveToken (kind resolver)', () => {
  const A = GENERIC;
  const B = BUILDING;

  it('resolves a hero by id and emits tokenMoved {kind:hero}', () => {
    const c = new BoardStateController();
    c.placeHero('h1', A);
    const moved: BoardEvent[] = [];
    c.on('tokenMoved', (e) => moved.push(e));

    expect(c.moveToken('h1', B)).toBe('hero');
    expect(c.getState().heroes.h1.location).toBe(B);
    expect(moved).toEqual([{ type: 'tokenMoved', kind: 'hero', id: 'h1', location: B }]);
  });

  it('resolves a foe by id and emits tokenMoved {kind:foe}', () => {
    const c = new BoardStateController();
    c.spawnFoe('f1', 'goblin', A);
    const moved: BoardEvent[] = [];
    c.on('tokenMoved', (e) => moved.push(e));

    expect(c.moveToken('f1', B)).toBe('foe');
    expect(c.getState().foes.f1.location).toBe(B);
    expect(moved).toEqual([{ type: 'tokenMoved', kind: 'foe', id: 'f1', location: B }]);
  });

  it('resolves the adversary by id and emits tokenMoved {kind:adversary}', () => {
    const c = new BoardStateController();
    c.selectAdversary('ad1');
    c.placeAdversary(A);
    const moved: BoardEvent[] = [];
    c.on('tokenMoved', (e) => moved.push(e));

    expect(c.moveToken('ad1', B)).toBe('adversary');
    expect(c.getState().adversary).toEqual({ id: 'ad1', location: B });
    expect(moved).toEqual([{ type: 'tokenMoved', kind: 'adversary', id: 'ad1', location: B }]);
  });

  it('on a cross-kind id collision the hero wins and the foe is untouched', () => {
    const c = new BoardStateController();
    c.placeHero('x', A);
    c.spawnFoe('x', 'goblin', A);

    expect(c.moveToken('x', B)).toBe('hero');
    expect(c.getState().heroes.x.location).toBe(B);
    expect(c.getState().foes.x.location).toBe(A); // foe untouched
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

  it('does not match an adversary that has no real id (empty-id placeholder)', () => {
    const c = new BoardStateController();
    c.placeAdversary(A); // placed before selectAdversary → id is ''
    expect(c.getState().adversary).toEqual({ id: '', location: A });

    expect(c.moveToken('', B)).toBeNull();
    expect(c.getState().adversary).toEqual({ id: '', location: A }); // not moved
  });
});

describe('BoardStateController — host mode', () => {
  it('dispatch does not mutate held state but emits the projected change intent', () => {
    const c = new BoardStateController({ mode: 'host' });
    const events: BoardEvent[] = [];
    c.subscribe((e) => events.push(e));

    const projected = c.dispatch({ type: 'placeHero', heroId: 'h1', location: GENERIC });

    expect(c.getState().heroes).toEqual({}); // held state untouched
    expect(projected.heroes.h1).toBeDefined(); // returned projection reflects the command
    expect(events.map((e) => e.type)).toEqual(['change']); // no specific events in host mode
    expect((events[0] as Extract<BoardEvent, { type: 'change' }>).state.heroes.h1).toBeDefined();
  });

  it('applyState is the commit path and emits a replaceState-shaped change', () => {
    const c = new BoardStateController({ mode: 'host' });
    const events: BoardEvent[] = [];
    c.subscribe((e) => events.push(e));

    const next = createDefaultBoardState();
    next.heroes.h1 = { location: GENERIC };
    c.applyState(next);

    expect(c.getState()).toBe(next);
    expect(events).toHaveLength(1);
    const change = events[0] as Extract<BoardEvent, { type: 'change' }>;
    expect(change.type).toBe('change');
    expect(change.command).toEqual({ type: 'replaceState', state: next });
  });
});
