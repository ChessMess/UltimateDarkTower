import { createSelectionStore, createLocationPickStore } from '../src/index';
import type { TokenSelection } from '../src/index';

describe('createSelectionStore', () => {
  it('starts empty and notifies subscribers on set', () => {
    const store = createSelectionStore();
    expect(store.get()).toBeNull();

    const seen: (TokenSelection | null)[] = [];
    const unsubscribe = store.subscribe((s) => seen.push(s));

    const sel: TokenSelection = { kind: 'foe', id: 'foe-1', location: 'Dayside' };
    store.set(sel);
    expect(store.get()).toBe(sel);
    expect(seen).toEqual([sel]);

    store.set(null);
    expect(store.get()).toBeNull();
    expect(seen).toEqual([sel, null]);

    unsubscribe();
    store.set(sel);
    expect(seen).toEqual([sel, null]); // no further notifications
  });
});

describe('createLocationPickStore', () => {
  it('arms, picks, and disarms with matching events', () => {
    const store = createLocationPickStore();
    const events: string[] = [];
    store.subscribe((e) => events.push(e.type === 'picked' ? `picked:${e.location}` : e.type));

    expect(store.isArmed()).toBe(false);
    store.pick('Dayside'); // stray pick before arming → ignored
    expect(events).toEqual([]);

    store.arm({ kind: 'foe', label: 'Brigands (foe)', targets: 'all' });
    expect(store.isArmed()).toBe(true);
    expect(store.getPending()).toEqual({ kind: 'foe', label: 'Brigands (foe)', targets: 'all' });

    store.pick('Dayside');
    store.disarm();
    expect(store.isArmed()).toBe(false);
    expect(events).toEqual(['armed', 'picked:Dayside', 'disarmed']);

    store.disarm(); // idempotent → no extra event
    expect(events).toEqual(['armed', 'picked:Dayside', 'disarmed']);
  });
});
