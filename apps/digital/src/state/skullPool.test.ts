/**
 * The pending-skull pool's arithmetic (collect → assign → destroy-at-4 → pool never
 * negative), exercised through the real store + a real ManualBoardSource/BoardStateController
 * — not a fake, since the destroy rule (ManualBoardSource.destroyIfFull) is part of what's
 * under test.
 */
import { describe, expect, it, vi } from 'vitest';
import { BoardStateController, buildingAt, skullsAt } from 'ultimatedarktowerboard';
import { ManualBoardSource } from '@/sources/ManualBoardSource';

vi.mock('@/session', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/session')>();
  return {
    ...actual,
    saveToLocalStorage: vi.fn(),
    downloadSession: vi.fn(),
    copySessionToClipboard: vi.fn().mockResolvedValue(undefined),
  };
});

const { useGameStore } = await import('./gameStore');

function registerFreshBoard() {
  const board = new ManualBoardSource(new BoardStateController());
  useGameStore.getState().registerBoard(board, {} as never, {} as never);
  return board;
}

describe('skull pool arithmetic', () => {
  it('collect fills the pool, assign drains it, and destroy-at-4 returns skulls to supply', () => {
    registerFreshBoard();

    useGameStore.getState().collectSkulls(3);
    expect(useGameStore.getState().boardState?.meta?.skullsPending).toBe(3);
    expect(useGameStore.getState().boardState?.meta?.skullsCollected).toBe(3);

    useGameStore.getState().placeSkulls({ Dayside: 2 });
    expect(useGameStore.getState().boardState?.meta?.skullsPending).toBe(1);
    expect(skullsAt(useGameStore.getState().boardState!, 'Dayside')).toBe(2);
    expect(buildingAt(useGameStore.getState().boardState!, 'Dayside').destroyed).toBe(false);

    // Over-assigning past the remaining pool (2 more against 1 left) still destroys the
    // building at its 4th skull — the store trusts the caller's assignment map — but the
    // pool itself never goes negative.
    useGameStore.getState().placeSkulls({ Dayside: 2 });
    expect(skullsAt(useGameStore.getState().boardState!, 'Dayside')).toBe(0); // returned to supply
    expect(buildingAt(useGameStore.getState().boardState!, 'Dayside').destroyed).toBe(true);
    expect(useGameStore.getState().boardState?.meta?.skullsPending).toBe(0);
  });

  it('adjustPendingSkulls corrects the pool without touching skullsCollected, and never goes negative', () => {
    registerFreshBoard();

    useGameStore.getState().adjustPendingSkulls(-5);
    expect(useGameStore.getState().boardState?.meta?.skullsPending).toBe(0);
    expect(useGameStore.getState().boardState?.meta?.skullsCollected ?? 0).toBe(0);

    useGameStore.getState().adjustPendingSkulls(2);
    expect(useGameStore.getState().boardState?.meta?.skullsPending).toBe(2);
    expect(useGameStore.getState().boardState?.meta?.skullsCollected ?? 0).toBe(0);
  });

  it('collectSkulls / placeSkulls / adjustPendingSkulls no-op without a registered board', () => {
    useGameStore.getState().unregisterBoard();
    expect(() => useGameStore.getState().collectSkulls(1)).not.toThrow();
    expect(() => useGameStore.getState().placeSkulls({ Dayside: 1 })).not.toThrow();
    expect(() => useGameStore.getState().adjustPendingSkulls(1)).not.toThrow();
  });
});
