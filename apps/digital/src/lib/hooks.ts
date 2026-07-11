/**
 * Hooks that give components access to game state without prop-drilling the
 * imperative UDT objects (PRD-00 FR-00.7).
 *
 * Selectors that return a fresh object MUST use `useShallow`, or Zustand v5's
 * default Object.is equality treats every render's new object as a change and
 * loops forever.
 */
import { useCallback, useSyncExternalStore } from 'react';
import { useShallow } from 'zustand/react/shallow';
import type { LocationPickStore, TokenSelection } from 'ultimatedarktowerboard';
import { useGameStore } from '@/state/gameStore';
import type { BoardStateSource } from '@/sources/types';
import type { GameSession } from '@/session';

/** The tower's player-facing snapshot: skull-drop count, broken seals, drum positions. */
export function useTowerState() {
  return useGameStore(
    useShallow((s) => ({
      skullDropCount: s.skullDropCount,
      brokenSeals: s.brokenSeals,
      drumPositions: s.drumPositions,
    })),
  );
}

/**
 * The player's "physical" tower actions (PRD-01): drop a skull and break/restore a seal.
 * Drum rotation, lights, and sounds are driven by the official app (PRD-05 bridge), not the
 * player, so they aren't exposed here — `rotateDrum` stays on the store for hydration/bridge.
 */
export function useTowerActions() {
  return useGameStore(
    useShallow((s) => ({
      dropSkull: s.dropSkull,
      breakSeal: s.breakSeal,
      restoreSeal: s.restoreSeal,
    })),
  );
}

/** The active board source, or null until the stage has mounted. */
export function useBoardSource(): BoardStateSource | null {
  return useGameStore((s) => s.boardSource);
}

/** The current board state snapshot, or null until the stage has mounted. */
export function useBoardState() {
  return useGameStore((s) => s.boardState);
}

/** Board actions (PRD-02): place/move/remove every token kind, skulls, and markers. */
export function useBoardActions() {
  return useGameStore(
    useShallow((s) => ({
      placeFoe: s.placeFoe,
      removeFoe: s.removeFoe,
      setFoeStatus: s.setFoeStatus,
      placeHero: s.placeHero,
      removeHero: s.removeHero,
      setAdversary: s.setAdversary,
      clearAdversary: s.clearAdversary,
      moveToken: s.moveToken,
      addSkull: s.addSkull,
      removeSkull: s.removeSkull,
      setSpaceMarker: s.setSpaceMarker,
    })),
  );
}

/**
 * The currently selected board token (PRD-02 FR-02.9), or null. Subscribes to the stage's
 * selection store (set when a token is clicked in 2D or 3D); re-renders on every change.
 */
export function useBoardSelection(): TokenSelection | null {
  const store = useGameStore((s) => s.boardSelection);
  const subscribe = useCallback(
    (onChange: () => void) => store?.subscribe(onChange) ?? (() => {}),
    [store],
  );
  const getSnapshot = useCallback(() => store?.get() ?? null, [store]);
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** The stage's armed "click a space to place" store, or null until the stage mounts. */
export function useBoardLocationPick(): LocationPickStore | null {
  return useGameStore((s) => s.boardLocationPick);
}

/**
 * The whole authoritative session object. It only changes by reference when an action
 * replaces it, so it's safe to derive (e.g. `activeReminders`) with `useMemo` keyed on it.
 */
export function useSession(): GameSession {
  return useGameStore((s) => s.session);
}

/** The current month/turn progress slice. */
export function useProgress() {
  return useGameStore((s) => s.session.progress);
}

/** Turn/month controls + reminder dismissal (PRD-04 FR-04.9). */
export function useProgressActions() {
  return useGameStore(
    useShallow((s) => ({
      advanceTurn: s.advanceTurn,
      retreatTurn: s.retreatTurn,
      goToMonth: s.goToMonth,
      dismissReminder: s.dismissReminder,
    })),
  );
}

/**
 * The per-hero player-board updater (PRD-03). A single stable function reference, so no
 * `useShallow` is needed; callers pass a pure transform from `session/playerBoard`.
 */
export function usePlayerBoardAction() {
  return useGameStore((s) => s.updatePlayerBoard);
}
