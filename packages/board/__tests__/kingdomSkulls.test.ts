import { describe, expect, it } from 'vitest';
import {
  BoardStateController,
  createDefaultBoardState,
  destroyedInKingdom,
  skullsInKingdom,
} from '../src/index';

describe('skullsInKingdom / destroyedInKingdom', () => {
  it('sums skulls per kingdom, counts destroyed buildings, and ignores non-building locations', () => {
    const controller = new BoardStateController({ initial: createDefaultBoardState() });

    // Dayside (north, Bazaar) — 2 skulls, standing.
    controller.addSkull('Dayside', 2);
    // Egan's End (north, Village) — destroyed.
    controller.addSkull("Egan's End", 4);
    controller.destroyBuilding("Egan's End");
    // Duwani (east, Village) — 1 skull, standing.
    controller.addSkull('Duwani', 1);
    // Broken Lands (north, no building) — never a legal skull target, but confirm it
    // contributes nothing even if a caller places a marker/foe there.
    controller.setSpaceMarker('Broken Lands', 'wasteland', true);

    const state = controller.getState();

    expect(skullsInKingdom(state, 'north')).toBe(6); // 2 + 4
    expect(destroyedInKingdom(state, 'north')).toBe(1);
    expect(skullsInKingdom(state, 'east')).toBe(1);
    expect(destroyedInKingdom(state, 'east')).toBe(0);
    expect(skullsInKingdom(state, 'south')).toBe(0);
    expect(destroyedInKingdom(state, 'south')).toBe(0);
  });
});
