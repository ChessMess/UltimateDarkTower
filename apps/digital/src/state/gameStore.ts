/**
 * The single store the React tree reads from. It subscribes to the active state
 * sources and projects primitive snapshots (so React re-renders on change), and
 * exposes actions that delegate to the sources. Components never touch a source or
 * the UDT board controller directly — they go through this store.
 */
import { create } from 'zustand';
import type {
  BoardState,
  FoeStatus,
  LocationPickStore,
  SelectionStore,
} from 'ultimatedarktowerboard';
import { ManualTowerSource } from '@/sources/ManualTowerSource';
import type { BoardStateSource, SealRef, TowerStateSource, Unsubscribe } from '@/sources/types';
import {
  applyGameSession,
  captureSession,
  copySessionToClipboard,
  createDefaultConfig,
  createNewGameSession,
  downloadSession,
  loadFromLocalStorage,
  nextTurn,
  parseSessionText,
  previousTurn,
  saveToLocalStorage,
  setMonth as setMonthOnProgress,
  type GameConfig,
  type GameSession,
  type PlayerBoard,
} from '@/session';

interface GameStore {
  // --- sources (swap these for Bridge/Network sources later; UI is unchanged) ---
  readonly towerSource: TowerStateSource;
  boardSource: BoardStateSource | null;

  /**
   * The stage's UI-only stores (PRD-02 FR-02.2): the selected token and the armed
   * "click a space to place" flow. Kept separate from `BoardState`; null until the
   * stage mounts. The board palette/inspector read these.
   */
  boardSelection: SelectionStore | null;
  boardLocationPick: LocationPickStore | null;

  // --- projected snapshots (primitives / fresh refs so selectors update) ---
  skullDropCount: number;
  brokenSeals: SealRef[];
  drumPositions: [number, number, number];
  boardState: BoardState | null;

  /**
   * The non-live parts of the game (meta / config / progress / playerBoards) are the
   * authoritative copy here; its `tower`/`board` fields are a last snapshot and are
   * ignored when capturing (live tower/board come from the sources). PRD-03/04 will add
   * granular config/progress/playerBoard update actions.
   */
  session: GameSession;

  // --- board registration (called by the stage wrapper on mount) ---
  registerBoard(
    source: BoardStateSource,
    selection: SelectionStore,
    locationPick: LocationPickStore,
  ): void;
  unregisterBoard(): void;

  // --- whole-game save / load / share (PRD-04) ---
  /** Build the single portable GameSession from `session` (base) + live sources. */
  captureSession(): GameSession;
  /** Start a new game from a config: hydrate sources + replace base. */
  newGame(config: GameConfig, name?: string): void;
  /** Restart the current game from its config (fresh tower/board/progress, same id/name). */
  resetSession(): void;
  saveSession(): void;
  /** Load from localStorage; returns false if there was no save. */
  loadSession(): boolean;
  exportSession(): void;
  copySession(): Promise<void>;
  importSessionText(text: string): void;

  // --- turn / month progress (PRD-04 FR-04.9) ---
  advanceTurn(): void;
  retreatTurn(): void;
  goToMonth(month: number): void;
  dismissReminder(id: string): void;

  // --- player boards (PRD-03) ---
  /** Replace one hero's player board via a pure transform (see `session/playerBoard`). */
  updatePlayerBoard(heroId: string, fn: (pb: PlayerBoard) => PlayerBoard): void;

  // --- tower actions ---
  dropSkull(): void;
  breakSeal(seal: SealRef): void;
  restoreSeal(seal: SealRef): void;
  rotateDrum(drumIndex: 0 | 1 | 2, position: 0 | 1 | 2 | 3): void;

  // --- board actions (PRD-02) ---
  placeFoe(foeId: string, foe: string, location: string, status?: FoeStatus): void;
  removeFoe(foeId: string): void;
  setFoeStatus(foeId: string, status: FoeStatus): void;
  /** Place a hero; the owning kingdom is looked up from the session config for token color. */
  placeHero(heroId: string, location: string): void;
  removeHero(heroId: string): void;
  setAdversary(id: string, location?: string): void;
  clearAdversary(): void;
  moveToken(id: string, location: string): void;
  addSkull(location: string, n?: number): void;
  removeSkull(location: string, n?: number): void;
  setSpaceMarker(location: string, marker: string, on: boolean): void;
}

const towerSource = new ManualTowerSource();

let boardUnsub: Unsubscribe | null = null;

/** Replace a session's progress, stamping `updatedAt`. Keeps progress edits immutable. */
function withProgress(session: GameSession, progress: GameSession['progress']): GameSession {
  return {
    ...session,
    progress,
    meta: { ...session.meta, updatedAt: new Date().toISOString() },
  };
}

export const useGameStore = create<GameStore>((set, get) => ({
  towerSource,
  boardSource: null,
  boardSelection: null,
  boardLocationPick: null,

  skullDropCount: towerSource.getSkullDropCount(),
  brokenSeals: towerSource.getBrokenSeals(),
  drumPositions: [
    towerSource.getState().drum[0].position,
    towerSource.getState().drum[1].position,
    towerSource.getState().drum[2].position,
  ],
  boardState: null,

  session: createNewGameSession(createDefaultConfig()),

  registerBoard(source, selection, locationPick) {
    boardUnsub?.();
    boardUnsub = source.subscribe((state) => set({ boardState: state }));
    set({ boardSource: source, boardSelection: selection, boardLocationPick: locationPick });
  },
  unregisterBoard() {
    boardUnsub?.();
    boardUnsub = null;
    get().boardSource?.dispose();
    set({ boardSource: null, boardState: null, boardSelection: null, boardLocationPick: null });
  },

  dropSkull: () => towerSource.dropSkull(),
  breakSeal: (seal) => towerSource.breakSeal(seal),
  restoreSeal: (seal) => towerSource.restoreSeal(seal),
  rotateDrum: (drumIndex, position) => towerSource.rotateDrum(drumIndex, position),

  placeFoe: (foeId, foe, location, status) =>
    get().boardSource?.placeFoe(foeId, foe, location, status),
  removeFoe: (foeId) => get().boardSource?.removeFoe(foeId),
  setFoeStatus: (foeId, status) => get().boardSource?.setFoeStatus(foeId, status),
  placeHero: (heroId, location) => {
    const owner = get().session.config.heroes.find((h) => h.heroId === heroId)?.homeKingdom;
    get().boardSource?.placeHero(heroId, location, owner);
  },
  removeHero: (heroId) => get().boardSource?.removeHero(heroId),
  setAdversary: (id, location) => get().boardSource?.setAdversary(id, location),
  clearAdversary: () => get().boardSource?.clearAdversary(),
  moveToken: (id, location) => get().boardSource?.moveToken(id, location),
  addSkull: (location, n) => get().boardSource?.addSkull(location, n),
  removeSkull: (location, n) => get().boardSource?.removeSkull(location, n),
  setSpaceMarker: (location, marker, on) => get().boardSource?.setSpaceMarker(location, marker, on),

  captureSession() {
    const { session, boardSource } = get();
    if (!boardSource) throw new Error('Board not ready — cannot capture session yet.');
    return captureSession(session, towerSource, boardSource);
  },

  newGame(config, name) {
    const fresh = createNewGameSession(config, name);
    const { boardSource } = get();
    if (boardSource) applyGameSession(fresh, towerSource, boardSource);
    set({ session: fresh });
  },

  resetSession() {
    const { session, boardSource } = get();
    const fresh = createNewGameSession(session.config, session.meta.name);
    // Keep the session's identity; only the play state is wiped.
    fresh.meta.id = session.meta.id;
    fresh.meta.createdAt = session.meta.createdAt;
    if (boardSource) applyGameSession(fresh, towerSource, boardSource);
    set({ session: fresh });
  },

  advanceTurn() {
    const { session } = get();
    set({ session: withProgress(session, nextTurn(session.progress, session.config.playerCount)) });
  },
  retreatTurn() {
    const { session } = get();
    set({
      session: withProgress(session, previousTurn(session.progress, session.config.playerCount)),
    });
  },
  goToMonth(month) {
    const { session } = get();
    set({ session: withProgress(session, setMonthOnProgress(session.progress, month)) });
  },
  dismissReminder(id) {
    const { session } = get();
    const dismissed = session.progress.dismissedReminders ?? [];
    if (dismissed.includes(id)) return;
    set({
      session: withProgress(session, {
        ...session.progress,
        dismissedReminders: [...dismissed, id],
      }),
    });
  },

  updatePlayerBoard(heroId, fn) {
    const { session } = get();
    const playerBoards = session.playerBoards.map((pb) => (pb.heroId === heroId ? fn(pb) : pb));
    set({
      session: {
        ...session,
        playerBoards,
        meta: { ...session.meta, updatedAt: new Date().toISOString() },
      },
    });
  },

  saveSession() {
    saveToLocalStorage(get().captureSession());
  },

  loadSession() {
    const loaded = loadFromLocalStorage();
    if (!loaded) return false;
    const { boardSource } = get();
    if (boardSource) applyGameSession(loaded, towerSource, boardSource);
    set({ session: loaded });
    return true;
  },

  exportSession() {
    downloadSession(get().captureSession());
  },

  copySession() {
    return copySessionToClipboard(get().captureSession());
  },

  importSessionText(text) {
    const loaded = parseSessionText(text);
    const { boardSource } = get();
    if (boardSource) applyGameSession(loaded, towerSource, boardSource);
    set({ session: loaded });
  },
}));

// Project tower changes into primitive snapshots after the store exists.
towerSource.subscribe((state) => {
  useGameStore.setState({
    skullDropCount: towerSource.getSkullDropCount(),
    brokenSeals: towerSource.getBrokenSeals(),
    drumPositions: [state.drum[0].position, state.drum[1].position, state.drum[2].position],
  });
});
