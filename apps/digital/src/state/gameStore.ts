/**
 * The single store the React tree reads from. It subscribes to the active state
 * sources and projects primitive snapshots (so React re-renders on change), and
 * exposes actions that delegate to the sources. Components never touch a source or
 * the UDT board controller directly — they go through this store.
 */
import { create } from 'zustand';
import type {
  BoardState,
  FoeLevel,
  FoeStatus,
  LocationPickStore,
  SelectionStore,
} from 'ultimatedarktowerboard';
import { FOE_BY_ID } from 'ultimatedarktowerboard';
import { ManualTowerSource } from '@/sources/ManualTowerSource';
import { BridgeTowerSource, type RelayStatus } from '@/sources/BridgeTowerSource';
import type { BoardStateSource, SealRef, TowerStateSource, Unsubscribe } from '@/sources/types';
import {
  applyGameSession,
  captureSession,
  clearLocalStorage,
  copySessionToClipboard,
  createDefaultConfig,
  createNewGameSession,
  deserializeSession,
  downloadSession,
  GameSessionLoadError,
  nextTurn,
  parseSessionText,
  previousTurn,
  saveToLocalStorage,
  setMonth as setMonthOnProgress,
  STORAGE_KEY,
  type GameConfig,
  type GameSession,
  type PlayerBoard,
} from '@/session';

interface GameStore {
  // --- sources (swap the board one for a Network source later; UI is unchanged) ---
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
   * A session's board state waiting for a board to mount (boot restore, or the gap
   * left by `unregisterBoard` during a stage remount). Distinct from `boardState`,
   * which means "the live board's current state" and gates `BoardPalette`'s ready
   * check — leaving a stale value there would report a dead board as ready.
   */
  pendingBoardState: BoardState | null;

  /**
   * The non-live parts of the game (meta / config / progress / playerBoards) are the
   * authoritative copy here; its `tower`/`board` fields are a last snapshot and are
   * ignored when capturing (live tower/board come from the sources). PRD-03/04 will add
   * granular config/progress/playerBoard update actions.
   */
  session: GameSession;

  /**
   * A localStorage save `loadSession` refused because it failed to deserialize — most often
   * an older `schemaVersion` (see `GAME_SESSION_SCHEMA_VERSION`'s v3 note). Non-null shows
   * `StaleSessionDialog`, carrying the untouched raw bytes so the app can offer a download
   * before the only option left is to discard them — there is no migration path.
   */
  staleSession: { raw: string; error: GameSessionLoadError } | null;
  dismissStaleSession(): void;
  /** Clears the stale save from localStorage. Irreversible — the dialog is the last chance to download it. */
  discardStaleSession(): void;

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

  /**
   * How skulls that fall out of the tower get collected into the pending pool: `'auto'`
   * sweeps them off the board floor, `'click'` collects one on click, `'off'` disables both
   * (the assign dialog's pool stepper is the only way in). A machine preference, not game
   * state — seeded from and written to `localStorage`, not the session.
   */
  collectMode: 'auto' | 'click' | 'off';
  setCollectMode(mode: 'auto' | 'click' | 'off'): void;
  /**
   * Move `n` skulls from the physics sim into the pending pool (`BoardState.meta.skullsPending`).
   * Reads the board source directly rather than the store's `boardState` mirror so a rapid
   * collect can't race a just-applied `addSkull`.
   */
  collectSkulls(n: number): void;
  /**
   * Assign pending skulls to buildings: `{location: count}`. Runs the destroy rule per
   * building (via `addSkull`) and removes the total from the pending pool in one meta write.
   */
  placeSkulls(assignments: Record<string, number>): void;
  /**
   * Manually correct the pending pool by `delta` (clamped at 0) without touching the
   * cumulative `skullsCollected` counter. The escape hatch for skulls the physics sim lost
   * uncounted (an OOB despawn, or a drop refused past `skull.maxCount`) — not a placement.
   */
  adjustPendingSkulls(delta: number): void;

  // --- official app bridge (PRD-05) ---
  /** Where the relay connection stands. Drives `BridgePanel`. */
  relayStatus: RelayStatus;
  /** Connect to a relay host so the official app drives the tower. */
  connectRelay(url: string): Promise<void>;
  disconnectRelay(): void;

  // --- board actions (PRD-02) ---
  placeFoe(foeId: string, foe: string, location: string, status?: FoeStatus): void;
  removeFoe(foeId: string): void;
  setFoeStatus(foeId: string, status: FoeStatus): void;
  /**
   * Cascade a status to every currently-placed foe of `level` and remember it for the next
   * placement (real-rules: threat status applies to a whole level, not a single foe). Stored in
   * `BoardState.meta.levelStatus` so it's settable independent of what's currently placed, and
   * round-trips with the session for free.
   */
  setLevelStatus(level: FoeLevel, status: FoeStatus): void;
  /** Place a hero; the owning kingdom is looked up from the session config for token color. */
  placeHero(heroId: string, location: string): void;
  removeHero(heroId: string): void;
  setAdversary(id: string, location?: string): void;
  clearAdversary(): void;
  moveToken(id: string, location: string): void;
  addSkull(location: string, n?: number): void;
  removeSkull(location: string, n?: number): void;
  restoreBuilding(location: string): void;
  setSpaceMarker(location: string, marker: string, on: boolean): void;
}

/**
 * One tower source for the app's lifetime. `BridgeTowerSource` wraps the manual
 * one rather than replacing it (PRD-05): disconnected it behaves exactly like the
 * MVP's `ManualTowerSource`, connected the official app drives it — and the 3D
 * stage, which captures this object once at mount, never has to be rewired.
 */
const towerSource = new BridgeTowerSource(new ManualTowerSource());

let boardUnsub: Unsubscribe | null = null;

const COLLECT_MODE_STORAGE_KEY = 'udtd.skullCollectMode';
type CollectMode = 'auto' | 'click' | 'off';

function loadCollectMode(): CollectMode {
  const raw = localStorage.getItem(COLLECT_MODE_STORAGE_KEY);
  return raw === 'auto' || raw === 'click' || raw === 'off' ? raw : 'auto';
}

/** Replace a session's progress, stamping `updatedAt`. Keeps progress edits immutable. */
function withProgress(session: GameSession, progress: GameSession['progress']): GameSession {
  return {
    ...session,
    progress,
    meta: { ...session.meta, updatedAt: new Date().toISOString() },
  };
}

export const useGameStore = create<GameStore>((set, get) => {
  /**
   * Hydrate the live sources from a session and install it as the base. When the board
   * isn't mounted yet (boot restore, or between an unmount and remount), park its state
   * in `pendingBoardState` so `registerBoard` can apply it the moment a board exists.
   */
  const applySession = (session: GameSession) => {
    const board = get().boardSource;
    applyGameSession(session, towerSource, board);
    set(board ? { session } : { session, pendingBoardState: session.board });
  };

  return {
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
    pendingBoardState: null,

    collectMode: loadCollectMode(),
    setCollectMode(mode) {
      localStorage.setItem(COLLECT_MODE_STORAGE_KEY, mode);
      set({ collectMode: mode });
    },
    collectSkulls(n) {
      const source = get().boardSource;
      if (!source || n <= 0) return;
      const board = source.getState();
      const pending = (board.meta?.skullsPending as number | undefined) ?? 0;
      const collected = (board.meta?.skullsCollected as number | undefined) ?? 0;
      source.load({
        ...board,
        meta: { ...board.meta, skullsPending: pending + n, skullsCollected: collected + n },
      });
    },
    placeSkulls(assignments) {
      const source = get().boardSource;
      if (!source) return;
      const total = Object.values(assignments).reduce((sum, n) => sum + n, 0);
      if (total <= 0) return;
      for (const [location, n] of Object.entries(assignments)) {
        if (n > 0) source.addSkull(location, n);
      }
      const board = source.getState();
      const pending = (board.meta?.skullsPending as number | undefined) ?? 0;
      source.load({
        ...board,
        meta: { ...board.meta, skullsPending: Math.max(0, pending - total) },
      });
    },
    adjustPendingSkulls(delta) {
      const source = get().boardSource;
      if (!source) return;
      const board = source.getState();
      const pending = (board.meta?.skullsPending as number | undefined) ?? 0;
      source.load({
        ...board,
        meta: { ...board.meta, skullsPending: Math.max(0, pending + delta) },
      });
    },

    session: createNewGameSession(createDefaultConfig()),
    staleSession: null,

    dismissStaleSession() {
      set({ staleSession: null });
    },
    discardStaleSession() {
      clearLocalStorage();
      set({ staleSession: null });
    },

    registerBoard(source, selection, locationPick) {
      // Read before subscribing: `subscribe` calls its listener synchronously with the
      // source's (empty) starting state, which would otherwise stomp what we're restoring.
      const pending = get().pendingBoardState;
      boardUnsub?.();
      boardUnsub = source.subscribe((state) => set({ boardState: state }));
      set({
        boardSource: source,
        boardSelection: selection,
        boardLocationPick: locationPick,
        pendingBoardState: null,
      });
      if (pending) source.load(pending);
    },
    unregisterBoard() {
      boardUnsub?.();
      boardUnsub = null;
      get().boardSource?.dispose();
      set({
        boardSource: null,
        boardState: null,
        boardSelection: null,
        boardLocationPick: null,
        // Survive a remount (StrictMode's dev double-mount, HMR) — a fresh
        // ManualBoardSource starts empty and needs this to come back.
        pendingBoardState: get().boardState,
      });
    },

    dropSkull: () => towerSource.dropSkull(),
    breakSeal: (seal) => towerSource.breakSeal(seal),
    restoreSeal: (seal) => towerSource.restoreSeal(seal),
    rotateDrum: (drumIndex, position) => towerSource.rotateDrum(drumIndex, position),

    relayStatus: towerSource.status,
    connectRelay: (url) => towerSource.connect(url),
    disconnectRelay: () => towerSource.disconnect(),

    placeFoe: (foeId, foe, location, status) =>
      get().boardSource?.placeFoe(foeId, foe, location, status),
    removeFoe: (foeId) => get().boardSource?.removeFoe(foeId),
    setFoeStatus: (foeId, status) => get().boardSource?.setFoeStatus(foeId, status),
    setLevelStatus: (level, status) => {
      const board = get().boardState;
      const source = get().boardSource;
      if (!board || !source) return;
      const tokens = { ...board.tokens };
      for (const [id, token] of Object.entries(tokens)) {
        if (token.typeId === 'foe' && FOE_BY_ID[token.art ?? '']?.level === level) {
          tokens[id] = { ...token, data: { ...token.data, status } };
        }
      }
      const levelStatus = {
        ...(board.meta?.levelStatus as Partial<Record<FoeLevel, FoeStatus>> | undefined),
        [level]: status,
      };
      source.load({ ...board, tokens, meta: { ...board.meta, levelStatus } });
    },
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
    restoreBuilding: (location) => get().boardSource?.restoreBuilding(location),
    setSpaceMarker: (location, marker, on) =>
      get().boardSource?.setSpaceMarker(location, marker, on),

    captureSession() {
      const { session, boardSource } = get();
      if (!boardSource) throw new Error('Board not ready — cannot capture session yet.');
      return captureSession(session, towerSource, boardSource);
    },

    newGame(config, name) {
      applySession(createNewGameSession(config, name));
    },

    resetSession() {
      const { session } = get();
      const fresh = createNewGameSession(session.config, session.meta.name);
      // Keep the session's identity; only the play state is wiped.
      fresh.meta.id = session.meta.id;
      fresh.meta.createdAt = session.meta.createdAt;
      applySession(fresh);
    },

    advanceTurn() {
      const { session } = get();
      set({
        session: withProgress(session, nextTurn(session.progress, session.config.playerCount)),
      });
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
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw == null) return false;
      let loaded: GameSession;
      try {
        loaded = deserializeSession(raw);
      } catch (err) {
        // Refuse, don't migrate: an older save (most often GAME_SESSION_SCHEMA_VERSION) can't be
        // read by this build. Surface the raw bytes via staleSession so the dialog can offer a
        // download before the user's only remaining option is to discard it.
        if (err instanceof GameSessionLoadError) {
          set({ staleSession: { raw, error: err } });
          return false;
        }
        throw err;
      }
      applySession(loaded);
      return true;
    },

    exportSession() {
      downloadSession(get().captureSession());
    },

    copySession() {
      return copySessionToClipboard(get().captureSession());
    },

    importSessionText(text) {
      applySession(parseSessionText(text));
    },
  };
});

// Project tower changes into primitive snapshots after the store exists.
towerSource.subscribe((state) => {
  useGameStore.setState({
    skullDropCount: towerSource.getSkullDropCount(),
    brokenSeals: towerSource.getBrokenSeals(),
    drumPositions: [state.drum[0].position, state.drum[1].position, state.drum[2].position],
  });
});

towerSource.onStatus((relayStatus) => useGameStore.setState({ relayStatus }));

/**
 * Debounce-persist the game to localStorage on every change, so a refresh resumes where
 * the player left off (PRD-04 FR-04.7). Not started automatically on import — `main.tsx`
 * calls this once at boot — so importing the store in a test never spins up a background
 * timer that writes to localStorage.
 */
export function startAutosave(delayMs = 750): Unsubscribe {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const save = () => {
    const s = useGameStore.getState();
    // No board yet → captureSession throws. A stale save on disk must never be
    // clobbered — the dialog needs those exact bytes to offer a download.
    if (!s.boardSource || s.staleSession) return;
    try {
      saveToLocalStorage(s.captureSession());
    } catch (err) {
      // Quota exceeded / private browsing — manual Save still surfaces a failure to the user.
      console.warn('Autosave failed:', err);
    }
  };
  const flush = () => {
    clearTimeout(timer);
    save();
  };
  const unsub = useGameStore.subscribe(() => {
    clearTimeout(timer);
    timer = setTimeout(save, delayMs);
  });
  // A refresh inside the debounce window would otherwise lose the most recent action.
  window.addEventListener('pagehide', flush);
  return () => {
    unsub();
    window.removeEventListener('pagehide', flush);
    clearTimeout(timer);
  };
}
