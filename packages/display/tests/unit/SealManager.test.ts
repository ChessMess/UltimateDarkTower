import type { SealIdentifier } from 'ultimatedarktower';
import { SealManager } from '../../src/3d/SealManager';

describe('SealManager.onSealsApplied', () => {
  it('fires registered listeners after applySeals with the broken-seals list', () => {
    const mgr = new SealManager();
    const calls: SealIdentifier[][] = [];
    mgr.onSealsApplied((broken) => calls.push(broken));

    const broken1: SealIdentifier[] = [{ side: 'east', level: 'top' }];
    mgr.applySeals(broken1);

    expect(calls).toHaveLength(1);
    expect(calls[0]).toEqual(broken1);
  });

  it('fires listeners even when no seal nodes have been registered', () => {
    const mgr = new SealManager();
    const calls: SealIdentifier[][] = [];
    mgr.onSealsApplied((broken) => calls.push(broken));

    mgr.applySeals([]);
    mgr.applySeals([{ side: 'west', level: 'middle' }]);

    expect(calls).toHaveLength(2);
    expect(calls[1]).toEqual([{ side: 'west', level: 'middle' }]);
  });

  it('returns an unsubscribe function that stops further notifications', () => {
    const mgr = new SealManager();
    let count = 0;
    const unsub = mgr.onSealsApplied(() => {
      count++;
    });

    mgr.applySeals([]);
    expect(count).toBe(1);

    unsub();
    mgr.applySeals([]);
    expect(count).toBe(1);
    expect(mgr.sealListenerCount).toBe(0);
  });

  it('isolates listener exceptions so subsequent listeners still fire', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const mgr = new SealManager();
      let secondFired = false;
      mgr.onSealsApplied(() => {
        throw new Error('boom');
      });
      mgr.onSealsApplied(() => {
        secondFired = true;
      });

      mgr.applySeals([]);

      expect(secondFired).toBe(true);
      expect(spy).toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });

  it('dispose clears all registered listeners', () => {
    const mgr = new SealManager();
    mgr.onSealsApplied(() => {});
    mgr.onSealsApplied(() => {});
    expect(mgr.sealListenerCount).toBe(2);

    mgr.dispose();
    expect(mgr.sealListenerCount).toBe(0);
  });
});
