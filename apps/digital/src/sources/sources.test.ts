import { describe, expect, it } from 'vitest';
import {
  adversaryOf,
  BoardStateController,
  buildingAt,
  foesOf,
  markersAt,
  skullsAt,
  type FoeStatus,
} from 'ultimatedarktowerboard';
import { ManualTowerSource } from './ManualTowerSource';
import { ManualBoardSource } from './ManualBoardSource';

describe('ManualTowerSource', () => {
  it('starts calibrated with zero skulls', () => {
    const tower = new ManualTowerSource();
    expect(tower.getSkullDropCount()).toBe(0);
    expect(tower.getState().drum.every((d) => d.calibrated)).toBe(true);
  });

  it('increments the skull-drop count and notifies subscribers', () => {
    const tower = new ManualTowerSource();
    const seen: number[] = [];
    tower.subscribe(() => seen.push(tower.getSkullDropCount()));
    tower.dropSkull();
    tower.dropSkull();
    expect(tower.getSkullDropCount()).toBe(2);
    expect(seen).toEqual([0, 1, 2]); // initial emit + two drops
  });

  it('tracks broken seals and restores them', () => {
    const tower = new ManualTowerSource();
    tower.breakSeal({ level: 'top', side: 'north' });
    tower.breakSeal({ level: 'top', side: 'north' }); // idempotent
    expect(tower.getBrokenSeals()).toHaveLength(1);
    tower.restoreSeal({ level: 'top', side: 'north' });
    expect(tower.getBrokenSeals()).toHaveLength(0);
  });
});

describe('ManualBoardSource', () => {
  it('places a foe through the controller and reflects it in state', () => {
    const controller = new BoardStateController();
    const board = new ManualBoardSource(controller);
    board.placeFoe('shadow-wolves-1', 'shadow-wolves', 'Broken Lands', 'ready');
    const foe = board.getState().tokens['shadow-wolves-1'];
    expect(foe?.location).toBe('Broken Lands');
    expect(foe?.art).toBe('shadow-wolves');
  });

  it('emits to subscribers on board change', () => {
    const controller = new BoardStateController();
    const board = new ManualBoardSource(controller);
    let changes = 0;
    board.subscribe(() => changes++);
    board.placeFoe('brigands-1', 'brigands', 'Broken Lands');
    expect(changes).toBeGreaterThanOrEqual(2); // initial emit + change
  });

  it('accepts all five foe statuses (UDT lib extended from 3 → 5)', () => {
    // Regression guard: the official game's full status track must be usable here.
    const all: FoeStatus[] = ['panicked', 'unsteady', 'ready', 'savage', 'lethal'];
    const controller = new BoardStateController();
    const board = new ManualBoardSource(controller);
    all.forEach((status, i) => board.placeFoe(`foe-${i}`, 'brigands', 'Broken Lands', status));
    expect(foesOf(board.getState()).map((f) => f.data?.status)).toEqual(all);
  });
});

describe('ManualBoardSource — PRD-02 board actions', () => {
  const make = () => new ManualBoardSource(new BoardStateController());

  it('destroys a building at the 4th skull and restores it below the threshold', () => {
    const board = make();
    board.addSkull('Dayside', 3);
    expect(skullsAt(board.getState(), 'Dayside')).toBe(3);
    expect(buildingAt(board.getState(), 'Dayside').destroyed).toBe(false);
    board.addSkull('Dayside'); // 4th skull
    expect(skullsAt(board.getState(), 'Dayside')).toBe(4);
    expect(buildingAt(board.getState(), 'Dayside').destroyed).toBe(true);
    board.removeSkull('Dayside'); // back to 3
    expect(skullsAt(board.getState(), 'Dayside')).toBe(3);
    expect(buildingAt(board.getState(), 'Dayside').destroyed).toBe(false);
  });

  it('selects + places the adversary, then clears it', () => {
    const board = make();
    board.setAdversary('ashstrider', 'Broken Lands');
    expect(adversaryOf(board.getState())).toMatchObject({
      id: 'ashstrider',
      location: 'Broken Lands',
    });
    board.clearAdversary();
    expect(adversaryOf(board.getState())).toBeUndefined();
  });

  it('places a hero with its owning kingdom and removes it', () => {
    const board = make();
    board.placeHero('brutal-warlord', 'Radiant Mountains', 'north');
    expect(board.getState().tokens['brutal-warlord']).toMatchObject({
      location: 'Radiant Mountains',
      data: { owner: 'north' },
    });
    board.removeHero('brutal-warlord');
    expect(board.getState().tokens['brutal-warlord']).toBeUndefined();
  });

  it('toggles a space marker on and off', () => {
    const board = make();
    board.setSpaceMarker('Broken Lands', 'wasteland', true);
    expect(markersAt(board.getState(), 'Broken Lands')).toContain('wasteland');
    board.setSpaceMarker('Broken Lands', 'wasteland', false);
    expect(markersAt(board.getState(), 'Broken Lands')).not.toContain('wasteland');
  });

  it('moves a placed foe to a new location', () => {
    const board = make();
    board.placeFoe('sw-1', 'shadow-wolves', 'Broken Lands', 'ready');
    board.moveToken('sw-1', 'Dayside');
    expect(board.getState().tokens['sw-1']?.location).toBe('Dayside');
  });
});
