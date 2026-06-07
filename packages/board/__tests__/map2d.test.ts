import {
  BoardMap2D,
  BOARD_ANCHORS,
  BOARD_IMAGE_INFO,
  createDefaultBoardState,
  createLocationPickStore,
} from '../src/index';
import type { BoardState, TokenSelection } from '../src/index';

function populated(): BoardState {
  const s = createDefaultBoardState();
  s.heroes = { 'hero-1': { location: 'Broken Lands' } }; // north — no art → fallback
  s.foes = { 'foe-1': { foe: 'Brigands', location: 'Dayside', status: 'ready' } }; // north
  s.foes['foe-2'] = { foe: 'Dragons', location: 'Big Sister', status: 'ready' }; // east
  return s;
}

function makeMap(onTokenSelect?: (s: TokenSelection) => void): { map: BoardMap2D; host: HTMLElement } {
  const host = document.createElement('div');
  const map = new BoardMap2D(host, {
    assetBaseUrl: '/t/',
    boardImageUrl: '/board.png',
    onTokenSelect,
  });
  return { map, host };
}

describe('BoardMap2D', () => {
  it('renders the board image base layer', () => {
    const { map, host } = makeMap();
    map.render(createDefaultBoardState());
    const image = host.querySelector('svg > image');
    expect(image).not.toBeNull();
    expect(image?.getAttribute('href')).toBe('/board.png');
  });

  it('places a foe at its anchor pixel with art from the convention', () => {
    const { map, host } = makeMap();
    map.render(populated());
    const foe = host.querySelector('.udt-token[data-kind="foe"][data-id="foe-1"]') as SVGGElement;
    expect(foe).not.toBeNull();
    const a = BOARD_ANCHORS['Dayside'].foe!;
    const cx = a.x * BOARD_IMAGE_INFO.width;
    const cy = a.y * BOARD_IMAGE_INFO.height;
    expect(foe.getAttribute('transform')).toBe(`translate(${cx} ${cy})`);
    expect(foe.querySelector('image')?.getAttribute('href')).toBe('/t/foes/brigands.png');
  });

  it('renders heroes with the programmatic fallback (no hero art)', () => {
    const { map, host } = makeMap();
    map.render(populated());
    const hero = host.querySelector('.udt-token[data-kind="hero"]') as SVGGElement;
    expect(hero).not.toBeNull();
    expect(hero.querySelector('image')).toBeNull();
    expect(hero.querySelector('circle')).not.toBeNull();
  });

  it('fires onTokenSelect and draws a selection ring on click', () => {
    const onTokenSelect = jest.fn();
    const { map, host } = makeMap(onTokenSelect);
    map.render(populated());
    const foe = host.querySelector('.udt-token[data-kind="foe"][data-id="foe-1"]') as SVGGElement;
    foe.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onTokenSelect).toHaveBeenCalledWith({ kind: 'foe', id: 'foe-1', location: 'Dayside' });
    expect(host.querySelector('.udt-selection-ring')).not.toBeNull();
  });

  it('narrows the viewBox to a kingdom on focus', () => {
    const { map, host } = makeMap();
    map.render(createDefaultBoardState(), { kingdom: 'all', angle: 'overhead' });
    const full = host.querySelector('svg')?.getAttribute('viewBox');
    expect(full).toBe(`0 0 ${BOARD_IMAGE_INFO.width} ${BOARD_IMAGE_INFO.height}`);
    map.render(createDefaultBoardState(), { kingdom: 'north', angle: 'overhead' });
    const narrowed = host.querySelector('svg')?.getAttribute('viewBox');
    expect(narrowed).not.toBe(full);
  });

  it('dispose() empties the container', () => {
    const { map, host } = makeMap();
    map.render(populated());
    expect(host.childNodes.length).toBeGreaterThan(0);
    map.dispose();
    expect(host.childNodes.length).toBe(0);
  });

  it('armed space-pick: a space click reports a location; disarmed leaves token-select intact', () => {
    const locationPick = createLocationPickStore();
    const onLocationPick = jest.fn();
    const onTokenSelect = jest.fn();
    const host = document.createElement('div');
    const map = new BoardMap2D(host, { boardImageUrl: '/b.png', locationPick, onLocationPick, onTokenSelect });
    map.render(populated());

    // Disarmed → no space layer; token click still selects.
    expect(host.querySelector('.udt-space')).toBeNull();
    (host.querySelector('.udt-token[data-id="foe-1"]') as SVGGElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(onTokenSelect).toHaveBeenCalledTimes(1);

    // Arm → space targets appear; a space click reports the location and pings the store.
    locationPick.arm({ kind: 'foe', label: 'Brigands (foe)', targets: 'all' });
    const space = host.querySelector('.udt-space[data-location="Radiant Mountains"]') as SVGElement;
    expect(space).not.toBeNull();
    const picked: string[] = [];
    locationPick.subscribe((e) => e.type === 'picked' && picked.push(e.location));
    space.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(onLocationPick).toHaveBeenCalledWith('Radiant Mountains');
    expect(picked).toEqual(['Radiant Mountains']);
    // Token clicks are ignored while armed.
    onTokenSelect.mockClear();
    (host.querySelector('.udt-token[data-id="foe-1"]') as SVGGElement).dispatchEvent(
      new MouseEvent('click', { bubbles: true })
    );
    expect(onTokenSelect).not.toHaveBeenCalled();
  });

  it('armed skull pick only offers building spaces', () => {
    const locationPick = createLocationPickStore();
    const host = document.createElement('div');
    const map = new BoardMap2D(host, { locationPick });
    map.render(createDefaultBoardState());
    locationPick.arm({ kind: 'building', label: 'skull', targets: 'buildings' });
    expect(host.querySelector('.udt-space[data-location="Dayside"]')).not.toBeNull(); // Bazaar
    expect(host.querySelector('.udt-space[data-location="Broken Lands"]')).toBeNull(); // not a building
  });
});
