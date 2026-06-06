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
