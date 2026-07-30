/**
 * gameStore.test.ts — the app's central mutable state had no test referencing it, though the
 * surrounding pure logic in session/* and sources/* is tested. This covers the store's own job:
 * delegating actions to the registered sources, projecting tower snapshots, and driving session
 * lifecycle (new/reset/save/load) through the pure session helpers.
 *
 * `saveToLocalStorage` / `downloadSession` / `copySessionToClipboard` are mocked (side effects
 * outside the store's own logic — Blob/clipboard, and save is a one-line localStorage.setItem
 * wrapper); everything else from '@/session' (createNewGameSession, applyGameSession,
 * captureSession, nextTurn, deserializeSession, …) is real. `loadSession` reads REAL
 * localStorage directly (it needs the raw bytes for `staleSession`'s download-before-discard
 * path), so load tests write to it via the real `serializeSession`/`STORAGE_KEY` rather than
 * mocking the read.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDefaultTowerState } from 'ultimatedarktower';
import type { BoardState, FoeStatus } from 'ultimatedarktowerboard';
import type { BoardStateSource, SealRef, Unsubscribe } from '@/sources/types';
import type { GameSession } from '@/session';

vi.mock('@/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/session')>();
  return {
    ...actual,
    saveToLocalStorage: vi.fn(),
    downloadSession: vi.fn(),
    copySessionToClipboard: vi.fn().mockResolvedValue(undefined),
  };
});

// Imported AFTER the mock so the store picks up the mocked persistence functions.
const { useGameStore, startAutosave } = await import('./gameStore');
const sessionMod = await import('@/session');

function emptyBoardState(): BoardState {
  return { tokens: {} };
}

/** A minimal, spy-friendly BoardStateSource — records every delegated call. */
class FakeBoardSource implements BoardStateSource {
  state: BoardState = emptyBoardState();
  listeners = new Set<(state: BoardState) => void>();
  calls: Array<{ method: string; args: unknown[] }> = [];

  private record(method: string, args: unknown[]): void {
    this.calls.push({ method, args });
  }

  getState(): BoardState {
    return this.state;
  }
  subscribe(listener: (state: BoardState) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }
  placeFoe(foeId: string, foe: string, location: string, status?: FoeStatus): void {
    this.record('placeFoe', [foeId, foe, location, status]);
  }
  removeFoe(foeId: string): void {
    this.record('removeFoe', [foeId]);
  }
  setFoeStatus(foeId: string, status: FoeStatus): void {
    this.record('setFoeStatus', [foeId, status]);
  }
  placeHero(heroId: string, location: string, owner?: string): void {
    this.record('placeHero', [heroId, location, owner]);
  }
  removeHero(heroId: string): void {
    this.record('removeHero', [heroId]);
  }
  setAdversary(id: string, location?: string): void {
    this.record('setAdversary', [id, location]);
  }
  clearAdversary(): void {
    this.record('clearAdversary', []);
  }
  moveToken(id: string, location: string): void {
    this.record('moveToken', [id, location]);
  }
  addSkull(location: string, n?: number): void {
    this.record('addSkull', [location, n]);
  }
  removeSkull(location: string, n?: number): void {
    this.record('removeSkull', [location, n]);
  }
  setSpaceMarker(location: string, marker: string, on: boolean): void {
    this.record('setSpaceMarker', [location, marker, on]);
  }
  load(state: BoardState): void {
    this.state = state;
    this.record('load', [state]);
  }
  dispose(): void {
    this.listeners.clear();
    this.record('dispose', []);
  }
}

describe('useGameStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Reset the shared ManualTowerSource singleton to a known, calibrated baseline so tower
    // assertions don't leak state between tests.
    const fresh = createDefaultTowerState();
    fresh.drum.forEach((d) => {
      d.calibrated = true;
    });
    useGameStore.getState().towerSource.load(fresh, []);
    useGameStore.getState().unregisterBoard();
    useGameStore.setState({
      session: sessionMod.createNewGameSession(sessionMod.createDefaultConfig()),
      // `unregisterBoard` above just parked the previous test's board state; without this
      // reset it leaks into this test's first `registerBoard` as a stray `load` call.
      pendingBoardState: null,
    });
  });

  describe('tower actions + projected snapshots', () => {
    it('dropSkull delegates to the tower source and updates skullDropCount', () => {
      const before = useGameStore.getState().skullDropCount;
      useGameStore.getState().dropSkull();
      expect(useGameStore.getState().skullDropCount).toBe(before + 1);
    });

    it('breakSeal / restoreSeal round-trip through brokenSeals', () => {
      const seal: SealRef = { level: 'top', side: 'north' };
      useGameStore.getState().breakSeal(seal);
      expect(useGameStore.getState().brokenSeals).toEqual([seal]);

      useGameStore.getState().restoreSeal(seal);
      expect(useGameStore.getState().brokenSeals).toEqual([]);
    });

    it('rotateDrum updates the projected drumPositions tuple at the right index', () => {
      useGameStore.getState().rotateDrum(1, 2);
      expect(useGameStore.getState().drumPositions).toEqual([0, 2, 0]);
    });
  });

  describe('board action delegation', () => {
    it('no-ops without throwing when no board is registered', () => {
      expect(() => useGameStore.getState().placeFoe('f1', 'Brigands', 'Delmsmire')).not.toThrow();
      expect(() => useGameStore.getState().moveToken('f1', 'Narrow Vale')).not.toThrow();
      expect(() => useGameStore.getState().setLevelStatus(2, 'savage')).not.toThrow();
    });

    it('delegates board actions to the registered BoardStateSource', () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);

      useGameStore.getState().placeFoe('f1', 'Brigands', 'Delmsmire', 'ready');
      useGameStore.getState().removeFoe('f1');
      useGameStore.getState().setFoeStatus('f1', 'unsteady');
      useGameStore.getState().removeHero('h1');
      useGameStore.getState().setAdversary('ashstrider', 'Narrow Vale');
      useGameStore.getState().clearAdversary();
      useGameStore.getState().moveToken('f1', 'Narrow Vale');
      useGameStore.getState().addSkull('Delmsmire', 2);
      useGameStore.getState().removeSkull('Delmsmire', 1);
      useGameStore.getState().setSpaceMarker('Delmsmire', 'wasteland', true);

      expect(board.calls.map((c) => c.method)).toEqual([
        'placeFoe',
        'removeFoe',
        'setFoeStatus',
        'removeHero',
        'setAdversary',
        'clearAdversary',
        'moveToken',
        'addSkull',
        'removeSkull',
        'setSpaceMarker',
      ]);
    });

    it('setLevelStatus cascades only to same-level placed foes and records the level status', () => {
      const board = new FakeBoardSource();
      board.state = {
        tokens: {
          'brigands-1': {
            id: 'brigands-1',
            typeId: 'foe',
            art: 'brigands',
            location: 'Delmsmire',
            data: { status: 'ready' },
          },
          'oreks-1': {
            id: 'oreks-1',
            typeId: 'foe',
            art: 'oreks',
            location: 'Narrow Vale',
            data: { status: 'ready' },
          },
          'frost-trolls-1': {
            id: 'frost-trolls-1',
            typeId: 'foe',
            art: 'frost-trolls',
            location: 'Ollow',
            data: { status: 'ready' },
          },
        },
      };
      useGameStore.getState().registerBoard(board, {} as never, {} as never);

      useGameStore.getState().setLevelStatus(2, 'savage');

      const loadCall = board.calls.find((c) => c.method === 'load');
      expect(loadCall).toBeDefined();
      const next = loadCall!.args[0] as BoardState;
      expect(next.tokens['brigands-1'].data?.status).toBe('savage');
      expect(next.tokens['oreks-1'].data?.status).toBe('savage');
      expect(next.tokens['frost-trolls-1'].data?.status).toBe('ready');
      expect((next.meta?.levelStatus as Record<number, string>)[2]).toBe('savage');
    });

    it('setLevelStatus records the level status even with nothing of that level placed', () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);

      useGameStore.getState().setLevelStatus(3, 'lethal');

      const loadCall = board.calls.find((c) => c.method === 'load');
      expect(loadCall).toBeDefined();
      const next = loadCall!.args[0] as BoardState;
      expect((next.meta?.levelStatus as Record<number, string>)[3]).toBe('lethal');
    });

    it('placeHero looks up the owning kingdom from session config before delegating', () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);
      useGameStore.setState((s) => ({
        session: {
          ...s.session,
          config: {
            ...s.session.config,
            heroes: [{ heroId: 'brutal-warlord', homeKingdom: 'north' }] as never,
          },
        },
      }));

      useGameStore.getState().placeHero('brutal-warlord', 'Radiant Mountains');

      expect(board.calls).toEqual([
        { method: 'placeHero', args: ['brutal-warlord', 'Radiant Mountains', 'north'] },
      ]);
    });

    it('unregisterBoard disposes the source and clears board-related store state', () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);
      expect(useGameStore.getState().boardState).not.toBeNull();

      useGameStore.getState().unregisterBoard();

      expect(board.calls.map((c) => c.method)).toContain('dispose');
      expect(useGameStore.getState().boardSource).toBeNull();
      expect(useGameStore.getState().boardState).toBeNull();
      expect(useGameStore.getState().boardSelection).toBeNull();
      expect(useGameStore.getState().boardLocationPick).toBeNull();
    });

    it('registerBoard tears down a previously registered source before adopting the new one', () => {
      const first = new FakeBoardSource();
      const second = new FakeBoardSource();
      useGameStore.getState().registerBoard(first, {} as never, {} as never);
      useGameStore.getState().registerBoard(second, {} as never, {} as never);

      expect(useGameStore.getState().boardSource).toBe(second);
      // The first source's subscription must have been torn down, not merely superseded — assert
      // via dispose-independent evidence: mutating `first` no longer reaches the store.
      first.state = { ...emptyBoardState(), foes: { ghost: {} } } as unknown as BoardState;
      for (const l of first.listeners) l(first.state);
      expect(useGameStore.getState().boardState).not.toBe(first.state);
    });
  });

  describe('turn / month / reminder progress', () => {
    it('advanceTurn and retreatTurn move progress.turn and bump meta.updatedAt', () => {
      vi.useFakeTimers();
      try {
        const before = useGameStore.getState().session;
        vi.advanceTimersByTime(1);
        useGameStore.getState().advanceTurn();
        const afterAdvance = useGameStore.getState().session;
        expect(afterAdvance.progress.turn).toBe(before.progress.turn + 1);
        expect(afterAdvance.meta.updatedAt).not.toBe(before.meta.updatedAt);

        useGameStore.getState().retreatTurn();
        expect(useGameStore.getState().session.progress.turn).toBe(before.progress.turn);
      } finally {
        vi.useRealTimers();
      }
    });

    it('goToMonth sets the month and resets turn to 1', () => {
      useGameStore.getState().advanceTurn();
      useGameStore.getState().goToMonth(3);
      expect(useGameStore.getState().session.progress).toMatchObject({ month: 3, turn: 1 });
    });

    it('dismissReminder adds an id once and is idempotent on repeat', () => {
      useGameStore.getState().dismissReminder('final-month');
      useGameStore.getState().dismissReminder('final-month');
      expect(useGameStore.getState().session.progress.dismissedReminders).toEqual(['final-month']);
    });
  });

  describe('session lifecycle', () => {
    it('newGame replaces the session and applies it to a registered board', () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);
      const config = sessionMod.createDefaultConfig();

      useGameStore.getState().newGame(config, 'My Game');

      expect(useGameStore.getState().session.meta.name).toBe('My Game');
      expect(board.calls.some((c) => c.method === 'load')).toBe(true);
    });

    it('resetSession keeps identity but resets progress', () => {
      useGameStore.getState().advanceTurn();
      const id = useGameStore.getState().session.meta.id;
      const createdAt = useGameStore.getState().session.meta.createdAt;

      useGameStore.getState().resetSession();

      const session = useGameStore.getState().session;
      expect(session.meta.id).toBe(id);
      expect(session.meta.createdAt).toBe(createdAt);
      expect(session.progress).toMatchObject({ month: 1, turn: 1 });
    });

    it('captureSession throws when no board is registered yet', () => {
      expect(() => useGameStore.getState().captureSession()).toThrow(/[Bb]oard/);
    });

    it('saveSession captures the current session and persists it', () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);

      useGameStore.getState().saveSession();

      expect(sessionMod.saveToLocalStorage).toHaveBeenCalledTimes(1);
      const saved = vi.mocked(sessionMod.saveToLocalStorage).mock.calls[0][0];
      expect(saved.meta.id).toBe(useGameStore.getState().session.meta.id);
    });

    it('loadSession returns false and leaves the session untouched when there is no save', () => {
      const before = useGameStore.getState().session;
      const ok = useGameStore.getState().loadSession();
      expect(ok).toBe(false);
      expect(useGameStore.getState().session).toBe(before);
    });

    it('loadSession hydrates the session and applies it to the board when a save exists', () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);
      const loaded: GameSession = {
        ...useGameStore.getState().session,
        meta: { ...useGameStore.getState().session.meta, name: 'Loaded Game' },
      };
      localStorage.setItem(sessionMod.STORAGE_KEY, sessionMod.serializeSession(loaded));

      const ok = useGameStore.getState().loadSession();

      expect(ok).toBe(true);
      expect(useGameStore.getState().session.meta.name).toBe('Loaded Game');
      expect(board.calls.some((c) => c.method === 'load')).toBe(true);
    });

    it('loadSession hydrates the tower even with no board registered, and parks the board state', () => {
      const base = useGameStore.getState().session;
      const loaded: GameSession = {
        ...base,
        meta: { ...base.meta, name: 'Loaded Game' },
        tower: { state: base.tower.state, brokenSeals: [{ level: 'top', side: 'north' }] },
        board: { tokens: { 'foe:ghost': { typeId: 'foe', location: 'Narrow Vale' } } } as never,
      };
      localStorage.setItem(sessionMod.STORAGE_KEY, sessionMod.serializeSession(loaded));

      const ok = useGameStore.getState().loadSession();

      expect(ok).toBe(true);
      expect(useGameStore.getState().session.meta.name).toBe('Loaded Game');
      expect(useGameStore.getState().towerSource.getBrokenSeals()).toEqual([
        { level: 'top', side: 'north' },
      ]);
      expect(useGameStore.getState().pendingBoardState).toEqual(loaded.board);

      // Registering a board afterwards adopts the parked state.
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);
      expect(board.calls).toEqual([{ method: 'load', args: [loaded.board] }]);
      expect(useGameStore.getState().pendingBoardState).toBeNull();
    });

    it('unregisterBoard parks the board state so a remounted board is re-hydrated', () => {
      const first = new FakeBoardSource();
      useGameStore.getState().registerBoard(first, {} as never, {} as never);
      first.state = { tokens: { 'hero:h1': { typeId: 'hero', location: 'Delmsmire' } } } as never;
      for (const l of first.listeners) l(first.state);
      expect(useGameStore.getState().boardState).toEqual(first.state);

      useGameStore.getState().unregisterBoard();
      expect(useGameStore.getState().pendingBoardState).toEqual(first.state);

      const second = new FakeBoardSource();
      useGameStore.getState().registerBoard(second, {} as never, {} as never);
      expect(second.calls).toEqual([{ method: 'load', args: [first.state] }]);
    });

    it('loadSession refuses a save with an incompatible schemaVersion, surfacing it as staleSession', () => {
      const current = useGameStore.getState().session;
      const stale = {
        ...current,
        schemaVersion: 2,
        meta: { ...current.meta, name: 'stale-should-not-load' },
      };
      const raw = JSON.stringify(stale, null, 2);
      localStorage.setItem(sessionMod.STORAGE_KEY, raw);

      const ok = useGameStore.getState().loadSession();

      expect(ok).toBe(false);
      const stored = useGameStore.getState().staleSession;
      expect(stored?.raw).toBe(raw); // byte-identical — nothing is silently altered
      expect(stored?.error.foundVersion).toBe(2);
      // The session in memory is untouched — nothing was loaded.
      expect(useGameStore.getState().session.meta.name).not.toBe('stale-should-not-load');
    });

    it('discardStaleSession clears the stored save and the staleSession dialog state', () => {
      localStorage.setItem(sessionMod.STORAGE_KEY, JSON.stringify({ schemaVersion: 2 }));
      useGameStore.getState().loadSession();
      expect(useGameStore.getState().staleSession).not.toBeNull();

      useGameStore.getState().discardStaleSession();

      expect(useGameStore.getState().staleSession).toBeNull();
      expect(localStorage.getItem(sessionMod.STORAGE_KEY)).toBeNull();
    });

    it('dismissStaleSession closes the dialog without touching localStorage', () => {
      const raw = JSON.stringify({ schemaVersion: 2 });
      localStorage.setItem(sessionMod.STORAGE_KEY, raw);
      useGameStore.getState().loadSession();

      useGameStore.getState().dismissStaleSession();

      expect(useGameStore.getState().staleSession).toBeNull();
      expect(localStorage.getItem(sessionMod.STORAGE_KEY)).toBe(raw);
    });

    it('exportSession downloads the captured session', () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);

      useGameStore.getState().exportSession();

      expect(sessionMod.downloadSession).toHaveBeenCalledTimes(1);
    });

    it('copySession copies the captured session to the clipboard', async () => {
      const board = new FakeBoardSource();
      useGameStore.getState().registerBoard(board, {} as never, {} as never);

      await useGameStore.getState().copySession();

      expect(sessionMod.copySessionToClipboard).toHaveBeenCalledTimes(1);
    });
  });

  describe('relay bridge (PRD-05)', () => {
    // The bridge itself is covered in sources/BridgeTowerSource.test.ts against a
    // mock socket. The store only owns the wiring: an initial projected status and
    // two delegating actions.
    it('starts disconnected and exposes connect/disconnect', () => {
      const { relayStatus, connectRelay, disconnectRelay } = useGameStore.getState();
      expect(relayStatus).toEqual({ state: 'disconnected' });
      expect(typeof connectRelay).toBe('function');
      expect(typeof disconnectRelay).toBe('function');
    });
  });

  describe('updatePlayerBoard', () => {
    it('applies the transform only to the matching hero and bumps updatedAt', () => {
      useGameStore.setState((s) => ({
        session: {
          ...s.session,
          playerBoards: [
            sessionMod.createPlayerBoard('h1', 'north'),
            sessionMod.createPlayerBoard('h2', 'south'),
          ],
        },
      }));

      useGameStore
        .getState()
        .updatePlayerBoard('h1', (pb) => ({ ...pb, warriors: pb.warriors + 5 }));

      const boards = useGameStore.getState().session.playerBoards;
      expect(boards.find((b) => b.heroId === 'h1')?.warriors).toBe(
        sessionMod.createPlayerBoard('h1', 'north').warriors + 5,
      );
      expect(boards.find((b) => b.heroId === 'h2')?.warriors).toBe(
        sessionMod.createPlayerBoard('h2', 'south').warriors,
      );
    });
  });

  describe('startAutosave', () => {
    it('debounce-saves after a change, once a board is registered', () => {
      vi.useFakeTimers();
      try {
        const board = new FakeBoardSource();
        useGameStore.getState().registerBoard(board, {} as never, {} as never);
        const stop = startAutosave(750);

        useGameStore.getState().dropSkull();
        vi.advanceTimersByTime(749);
        expect(sessionMod.saveToLocalStorage).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(sessionMod.saveToLocalStorage).toHaveBeenCalledTimes(1);

        stop();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not save while no board is registered', () => {
      vi.useFakeTimers();
      try {
        const stop = startAutosave(750);
        useGameStore.getState().dropSkull();
        vi.advanceTimersByTime(750);
        expect(sessionMod.saveToLocalStorage).not.toHaveBeenCalled();
        stop();
      } finally {
        vi.useRealTimers();
      }
    });

    it('does not save while a stale session is pending', () => {
      vi.useFakeTimers();
      try {
        const board = new FakeBoardSource();
        useGameStore.getState().registerBoard(board, {} as never, {} as never);
        useGameStore.setState({
          staleSession: { raw: '{}', error: new sessionMod.GameSessionLoadError('stale') },
        });
        const stop = startAutosave(750);

        useGameStore.getState().dropSkull();
        vi.advanceTimersByTime(750);

        expect(sessionMod.saveToLocalStorage).not.toHaveBeenCalled();
        stop();
      } finally {
        vi.useRealTimers();
      }
    });

    it('stops saving once unsubscribed', () => {
      vi.useFakeTimers();
      try {
        const board = new FakeBoardSource();
        useGameStore.getState().registerBoard(board, {} as never, {} as never);
        const stop = startAutosave(750);

        stop();
        useGameStore.getState().dropSkull();
        vi.advanceTimersByTime(750);

        expect(sessionMod.saveToLocalStorage).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
