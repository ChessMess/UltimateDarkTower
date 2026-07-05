// Runtime loop (Player PRD §2.2): load/validate → relay connect → step → dispatch → checkpoint.
// This module owns the RelayClient singleton and drives the engine step loop.
// All persistent state lives in usePlayerStore; this module mutates it via getState().

import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { scenarioSchema } from '@udtc/schema';
import { validateRefs, validateGraph, createBoardAdapter, createDisplayAdapter, createResolver } from '@udtc/adapters';
import type { BoardState } from '@udtc/adapters';
import { init, step, deserialize, ENGINE_VERSION } from '@udtc/engine';
import type { Input, Directive, StepResult, EngineState } from '@udtc/engine';
import { RelayClient } from '../relay';
import { usePlayerStore } from '../store';
import type { ValidationResults, SavedSession, SavedSessionMeta } from '../types';
import { saveSession, loadSession, clearSession } from './persistence';

const PLAYER_SEED = 'player-runtime-seed';
const PLAYER_COUNT = 1;

// Module-level singletons — survive component remounts.
let _relay: RelayClient | null = null;
let _board: ReturnType<typeof createBoardAdapter> | null = null;
let _display: ReturnType<typeof createDisplayAdapter> | null = null;
// The all-in-one board stage (2D/3D/PiP switcher, pop-out, kingdom-zoom) shown for the
// emulator target. Its `tower3D` is a Display TowerRenderView the engine drives directly.
let _stage: import('ultimatedarktowerboard/stage').BoardStageView | null = null;
// Bumped on every mount/unmount. mountDisplay is async (dynamic import), so a mode flip
// (lite→emulator) mid-load could resolve two views into the same container — this token lets
// a superseded async mount bail instead of appending an orphaned view.
let _mountGen = 0;
let _cmdSeq = 0;
let _startRequested = false;
let _relayReadyLogged = false;

// Boot-detected saved session awaiting a user Resume decision (see checkForResumableSession).
let _stashedSession: SavedSession | null = null;
// Debounce timer for session persistence — the setTimeout-scheduled tower snapshots would
// otherwise trigger a burst of IndexedDB writes; coalesce them into one.
let _saveTimer: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 200;

// Which preview the emulator/tower shell renders. 'emulator' brings up the full 3D tower
// with the in-scene game board overlaid on its ground disc; 'lite' is the lightweight
// readout + side-view (a real physical tower/board is on the table).
export type DisplayMode = 'lite' | 'emulator';

// Board/tower art served from apps/player/public/assets (Vite serves public/ at web root).
const TOWER_MODEL_URL = `${import.meta.env.BASE_URL}assets/tower.glb`;
const BOARD_IMAGE_URL = `${import.meta.env.BASE_URL}assets/board.png`;
const BOARD_ASSET_BASE = `${import.meta.env.BASE_URL}assets/tokens/`;

function board(): ReturnType<typeof createBoardAdapter> {
  if (!_board) _board = createBoardAdapter();
  return _board;
}

function display(): ReturnType<typeof createDisplayAdapter> {
  if (!_display) _display = createDisplayAdapter({ resolver: createResolver() });
  return _display;
}

function relay(): RelayClient {
  if (!_relay) {
    _relay = new RelayClient({
      onStatus: (status) => {
        usePlayerStore.getState().setRelayStatus(status);
        const store = usePlayerStore.getState();
        // Keep the load phase explicit: calibration readiness is tracked even before Start,
        // then an explicit Start transitions the game into active play.
        if (status.calibrated && status.relaying) {
          if (_startRequested && store.phase !== 'playing' && store.phase !== 'ended') {
            store.setPhase('playing');
            store.addLog(`Game started — target: ${status.targetKind}`);
          } else if (!_startRequested && store.phase === 'ready' && !_relayReadyLogged) {
            store.addLog(`Relay ready — target: ${status.targetKind}`);
            _relayReadyLogged = true;
          }
        }
      },
      onObserved: (_observed, value) => {
        // skullCounter observation arrives from the relay tower bridge
        usePlayerStore.getState().addLog(`tower:observed skullCounter=${value}`);
        handleInput({ requestId: 'skullCounter', value, kind: 'observed' });
      },
      onSync: (lastCommand) => {
        // Relay requests player to re-send last command (Protocol §7 resync handshake)
        const store = usePlayerStore.getState();
        store.addLog('relay:sync — resending last command');
        const cp = store.checkpoint;
        _relay!.sendCommand(cp?.lastCommand ?? lastCommand ?? [], cp?.seq);
      },
      onAck: () => {
        usePlayerStore.getState().addLog('relay:ack');
      },
      onSeals: (seals) => {
        // tower:seals inbound mirror — re-apply to local display
        display().applySeals(seals);
      },
      onConnStateChange: (state) => {
        usePlayerStore.getState().setRelayConnState(state);
        if (state === 'connected') usePlayerStore.getState().addLog('Relay connected');
        if (state === 'disconnected') usePlayerStore.getState().addLog('Relay disconnected — reconnecting…');
        if (state === 'resyncing') usePlayerStore.getState().addLog('Relay resyncing…');
      },
    });
  }
  return _relay;
}

// ---- Tower view lifecycle (called from UI shell) ----

export function mountDisplay(el: HTMLElement, mode: DisplayMode = 'lite'): void {
  // Supersede any in-flight or existing mount, then tear it down synchronously so the async
  // build below starts from a clean container.
  _mountGen += 1;
  const gen = _mountGen;
  teardownDisplay();

  if (mode !== 'emulator') {
    // Real tower: lightweight readout + side-view (the physical board is on the table).
    import('ultimatedarktowerdisplay').then(({ TowerRenderView }) => {
      const view = new TowerRenderView({
        container: el,
        renderers: ['readout', 'side-view'],
        title: 'Tower Preview',
      });
      if (gen !== _mountGen) {
        view.dispose(); // a newer mount/unmount superseded this one — don't leave it in the DOM
        return;
      }
      display().mount(view);
      applyRestoredSeals();
    });
    return;
  }

  // Emulator: the all-in-one board stage (2D map + 3D tower with the board on its ground disc,
  // plus the 2D/3D/2D+3D/PiP switcher, pop-out and kingdom-zoom). The engine drives the tower.
  mountStage(el, gen);
}

async function mountStage(el: HTMLElement, gen: number): Promise<void> {
  const { BoardStageView } = await import('ultimatedarktowerboard/stage');
  if (gen !== _mountGen) return;

  const stage = new BoardStageView({
    container: el,
    modelUrl: TOWER_MODEL_URL,
    boardImageUrl: BOARD_IMAGE_URL,
    assetBaseUrl: BOARD_ASSET_BASE,
    // Build the tower explicitly below so its readiness is deterministic (avoid the ctor's
    // fire-and-forget auto-build racing our own).
    tower3D: false,
    // A live runtime, not an editor — the engine owns board state via board.mutate directives.
    editingUI: false,
    // Don't restore a stored 2d/3d layout preference in the runtime.
    persist: false,
    // Seed with real state only if the board adapter has resolved; an empty {} would throw in
    // the renderers. Otherwise start from the stage's own empty default and push state on ready.
    initialState: board().isReady() ? board().getState() : undefined,
  });

  await stage.setTowerEnabled(true);
  if (gen !== _mountGen) {
    stage.dispose();
    return;
  }
  stage.setDisplayMode('2d3d'); // open on the combined 2D map + 3D tower; pills let the user switch

  // Drive the engine's tower.program (lights / drums / seals) into the stage's TowerRenderView.
  const towerView = stage.tower3D;
  if (towerView) {
    display().mount(towerView);
    applyRestoredSeals();
  } else usePlayerStore.getState().addLog('3D tower unavailable — board shown without live tower');

  _stage = stage;
  board().onReady(() => {
    if (gen === _mountGen) syncBoardStage();
  });
}

// Push the live board state into the stage's controller (updates both the 2D map and the 3D
// board). Guarded on isReady() so the renderers never receive the empty {} placeholder.
function syncBoardStage(): void {
  if (_stage && board().isReady()) _stage.controller.applyState(board().getState());
}

// Re-apply broken seals from the authoritative engine state after a (re)mount. The display
// adapter is recreated on every mount (teardownDisplay disposes it), so seals — like board
// state — must be pushed back in from engine state, not left to the adapter's own memory.
// This also keeps seals visible across lite⟷emulator target switches during normal play.
function applyRestoredSeals(): void {
  const seals =
    (usePlayerStore.getState().engineState as { brokenSeals?: string[] } | null)?.brokenSeals ?? [];
  if (seals.length > 0) display().applySeals(seals);
}

// Tear down the current preview. The stage owns its tower (the TowerRenderView the display
// adapter drives), so detach the adapter WITHOUT disposing before disposing the stage; in lite
// mode the adapter owns its own view and must dispose it.
function teardownDisplay(): void {
  if (_stage) {
    _display?.unmount();
    _stage.dispose();
    _stage = null;
  } else {
    _display?.dispose();
  }
  _display = null;
}

export function unmountDisplay(): void {
  // Bump the generation so any in-flight mountDisplay bails instead of appending its view.
  _mountGen += 1;
  teardownDisplay();
}

// ---- L1–L4 validation ----

export function validateScenario(doc: unknown): ValidationResults {
  // L1 — JSON Schema
  const ajv = new Ajv({ strict: true, allErrors: true });
  addFormats(ajv);
  const fn = ajv.compile(scenarioSchema);
  const l1Ok = fn(doc) as boolean;
  const l1Errors = l1Ok
    ? []
    : (fn.errors ?? []).map((e) => `${e.instancePath || '/'} ${e.message ?? 'invalid'}`);

  if (!l1Ok) {
    return { l1: { ok: false, errors: l1Errors }, l2: { ok: false, errors: ['L1 must pass'] }, l3: { ok: false, errors: ['L1 must pass'] }, l4: { ok: false, errors: [] }, allOk: false };
  }

  // L2 — reference resolution
  const l2 = validateRefs(doc);
  if (!l2.ok) {
    return { l1: { ok: true, errors: [] }, l2: { ok: false, errors: l2.errors }, l3: { ok: false, errors: ['L2 must pass'] }, l4: { ok: false, errors: [] }, allOk: false };
  }

  // L3 — graph semantics
  const l3 = validateGraph(doc);
  if (!l3.ok) {
    return { l1: { ok: true, errors: [] }, l2: { ok: true, errors: [] }, l3: { ok: false, errors: l3.errors }, l4: { ok: false, errors: [] }, allOk: false };
  }

  // L4 — engine.init (structural simulation check)
  try {
    init(doc, { seed: PLAYER_SEED, playerCount: PLAYER_COUNT });
    return { l1: { ok: true, errors: [] }, l2: { ok: true, errors: [] }, l3: { ok: true, errors: [] }, l4: { ok: true, errors: [] }, allOk: true };
  } catch (e) {
    return { l1: { ok: true, errors: [] }, l2: { ok: true, errors: [] }, l3: { ok: true, errors: [] }, l4: { ok: false, errors: [String(e)] }, allOk: false };
  }
}

// ---- Load & start ----

export function loadGame(doc: unknown): void {
  const store = usePlayerStore.getState();
  // Loading a new scenario supersedes any saved session; drop the stashed resume payload
  // and clear storage (a fresh checkpoint is persisted below once the engine initialises).
  _stashedSession = null;
  _startRequested = false;
  _relayReadyLogged = false;
  store.setResumable(null);
  void clearSession();
  store.setPhase('validating');
  store.addLog('Validating scenario (L1–L4)…');

  const results = validateScenario(doc);
  store.setScenario(doc, results);

  if (!results.allOk) {
    const errs = [...results.l1.errors, ...results.l2.errors, ...results.l3.errors, ...results.l4.errors];
    store.setValidationError(errs.join('\n'));
    store.addLog(`Validation failed: ${errs[0]}`);
    return;
  }

  store.addLog('Validation passed — initialising engine…');
  const initResult = init(doc, { seed: PLAYER_SEED, playerCount: PLAYER_COUNT });
  store.setEngineResult(initResult.state, initResult.status, initResult.awaiting, initResult.directives);
  store.saveCheckpoint(JSON.stringify(initResult.state), []);
  dispatchAll(initResult.directives);
  persistSession();

  store.addLog(`Engine ready — status: ${initResult.status}`);
  if (initResult.awaiting) store.addLog(`Awaiting: ${initResult.awaiting.id}`);

  store.setPhase('ready');
  store.addLog('Scenario loaded and ready. Press Start to begin play.');
  store.addLog(`Connecting to relay (${store.relayUrl})…`);
  relay().connect(store.relayUrl);
}

export function startGame(): void {
  const store = usePlayerStore.getState();
  if (!store.scenario || !store.engineState) return;

  _startRequested = true;
  const relayStatus = store.relayStatus;

  if (relayStatus?.calibrated && relayStatus.relaying) {
    store.setPhase('playing');
    store.addLog('Game started.');
    return;
  }

  if (store.relayConnState !== 'connected') {
    store.setPhase('connecting');
    store.addLog('Start requested — waiting for relay connection…');
    return;
  }

  store.setPhase('waiting');
  store.addLog('Start requested — waiting for target calibration…');
}

// ---- Relay target selection ----

export function selectTarget(target: 'tower' | 'emulator'): void {
  const store = usePlayerStore.getState();
  if (_startRequested && store.phase !== 'playing') store.setPhase('waiting');
  store.addLog(`Requesting target: ${target}`);
  relay().requestTarget(target);
}

// ---- Session persistence (page-refresh recovery) ----

function scenarioTitle(scenario: unknown): string {
  const t = (scenario as { meta?: { title?: unknown } })?.meta?.title;
  return typeof t === 'string' && t.length > 0 ? t : 'Untitled scenario';
}

// Snapshot the recoverable slice of the store (+ derived board state) to IndexedDB.
// Debounced so bursts of tower-snapshot checkpoints collapse into a single write.
function persistSession(): void {
  if (_saveTimer !== null) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    const store = usePlayerStore.getState();
    if (!store.engineState || !store.scenario) return;
    const cp = store.checkpoint;
    const session: SavedSession = {
      version: 1,
      engineVersion: ENGINE_VERSION,
      scenario: store.scenario,
      serializedState: cp?.serializedState ?? JSON.stringify(store.engineState),
      status: store.status,
      awaiting: store.awaiting,
      boardState: board().isReady() ? board().getState() : null,
      lastCommand: cp?.lastCommand ?? [],
      seq: cp?.seq ?? 0,
      log: store.log,
      scenarioName: scenarioTitle(store.scenario),
      savedAt: Date.now(),
    };
    void saveSession(session);
  }, SAVE_DEBOUNCE_MS);
}

// Read any saved session on boot; if it's a valid, resumable in-progress game, stash the
// payload and expose its meta so the LoadPanel can offer Resume/Discard. Incompatible or
// corrupt snapshots are discarded silently. Returns the meta (or null).
export async function checkForResumableSession(): Promise<SavedSessionMeta | null> {
  const saved = await loadSession();
  if (!saved) return null;

  const compatible =
    saved.version === 1 &&
    saved.engineVersion === ENGINE_VERSION &&
    typeof saved.serializedState === 'string' &&
    saved.serializedState.length > 0;
  if (!compatible) {
    await clearSession();
    return null;
  }

  _stashedSession = saved;
  const meta: SavedSessionMeta = {
    scenarioName: saved.scenarioName,
    seq: saved.seq,
    savedAt: saved.savedAt,
  };
  usePlayerStore.getState().setResumable(meta);
  return meta;
}

// Restore the saved session: engine state + board view + seals into the store/adapters,
// then re-run the normal relay connect/target handshake to bring transport back to 'playing'.
// Reads the payload fresh from IndexedDB (falling back to the boot-time stash) so it can't
// silently no-op if the module-level stash desynced from the store (e.g. Vite HMR).
export async function resumeSession(): Promise<void> {
  const store = usePlayerStore.getState();
  const saved = _stashedSession ?? (await loadSession());
  if (!saved) {
    store.addLog('No saved session to resume.');
    store.setResumable(null);
    return;
  }

  let engineState: EngineState;
  try {
    engineState = deserialize(saved.serializedState);
  } catch (e) {
    store.addLog(`Saved session could not be restored: ${String(e)}`);
    void clearSession();
    store.setResumable(null);
    _stashedSession = null;
    return;
  }

  store.hydrateFromSession({
    scenario: saved.scenario,
    engineState,
    status: saved.status,
    awaiting: saved.awaiting,
    checkpoint: {
      serializedState: saved.serializedState,
      lastCommand: saved.lastCommand,
      seq: saved.seq,
      timestamp: saved.savedAt,
    },
    log: saved.log,
  });
  _stashedSession = null;
  store.addLog(`Resumed session — checkpoint #${saved.seq}`);

  // Restore derived board-view state (applied when the adapter is ready; the mounted stage
  // picks it up via syncBoardStage). Broken seals are re-applied from engine state after the
  // tower view mounts (applyRestoredSeals), since the display adapter is rebuilt on mount.
  if (saved.boardState) board().loadState(saved.boardState as BoardState);

  // Terminal games restore straight to the ended screen — no transport needed.
  if (saved.status === 'won' || saved.status === 'lost' || saved.status === 'ended') {
    _startRequested = false;
    _relayReadyLogged = false;
    store.setPhase('ended');
    return;
  }

  // Live game: reconnect. The existing handshake + RelayPanel target-picker path resumes
  // to 'playing' exactly as on a fresh load.
  _startRequested = true;
  _relayReadyLogged = false;
  store.setPhase('connecting');
  store.addLog(`Connecting to relay (${store.relayUrl})…`);
  relay().connect(store.relayUrl);
}

// Discard the saved session and return to a clean load screen.
export function discardSession(): void {
  void clearSession();
  _stashedSession = null;
  _startRequested = false;
  _relayReadyLogged = false;
  usePlayerStore.getState().reset();
}

// ---- Input submission ----

export function handleInput(input: Input): void {
  const store = usePlayerStore.getState();
  if (!store.engineState) return;

  let result: StepResult;
  try {
    // Engine does not mutate its input state — pass it directly.
    result = step(store.engineState, input);
  } catch (e) {
    store.addLog(`ENGINE FAULT: ${String(e)}`);
    return;
  }

  store.setEngineResult(result.state, result.status, result.awaiting, result.directives);
  dispatchAll(result.directives);

  // Checkpoint after every step (JSON.stringify skips undefined values safely)
  const serialized = JSON.stringify(result.state);
  const lastCmd = store.checkpoint?.lastCommand ?? [];
  store.saveCheckpoint(serialized, lastCmd);
  persistSession();

  if (result.awaiting) store.addLog(`Awaiting: ${result.awaiting.id}`);

  if (result.status === 'won' || result.status === 'lost' || result.status === 'ended') {
    store.setPhase('ended');
    const reason = (result.state as { outcome?: { reason?: string } }).outcome?.reason ?? '';
    store.addLog(`Game ended: ${result.status}${reason ? ` — ${reason}` : ''}`);
  }
}

// ---- Directive dispatch ----

function dispatchAll(directives: Directive[]): void {
  for (const d of directives) dispatchDirective(d);
}

function dispatchDirective(d: Directive): void {
  const store = usePlayerStore.getState();
  switch (d.type) {
    case 'tower.program': {
      const { snapshots } = display().program(d.ops ?? []);

      // Schedule snapshots by pre-resolved delay — NOT by ack (guardrail §11).
      let elapsed = 0;
      for (const snap of snapshots) {
        elapsed += snap.delayMs;
        const doSend = () => {
          _cmdSeq += 1;
          relay().sendCommand(snap.data, _cmdSeq);
          store.saveCheckpoint(
            JSON.stringify(usePlayerStore.getState().engineState),
            snap.data,
          );
          persistSession();
        };
        if (snap.delayMs === 0) doSend();
        else setTimeout(doSend, elapsed);
      }

      if (d.brokenSeals) {
        display().applySeals(d.brokenSeals);
        relay().sendSeals(d.brokenSeals);
      }

      store.addLog(`tower.program: ${snapshots.length} snapshot(s), ops=${d.ops?.length ?? 0}`);
      break;
    }
    case 'ui.update':
      store.addLog(`ui.update: ${JSON.stringify(d.delta).slice(0, 80)}`);
      break;
    case 'ui.prompt':
      store.addLog(`ui.prompt kind=${d.kind}`);
      break;
    case 'board.mutate':
      board().mutate(d);
      syncBoardStage();
      store.addLog(`board.mutate: ${d.command}`);
      break;
    case 'log.entry':
      store.addLog(`[event] ${d.event}`);
      break;
    case 'media.play':
      store.addLog(`media.play: ${d.media}`);
      break;
  }
}

// ---- Gate test helper ----

export function simulateRelayDisconnect(): void {
  usePlayerStore.getState().addLog('Simulating relay disconnect…');
  relay().simulateDisconnect();
}

export function disconnectRelay(): void {
  relay().disconnect();
  _relay = null;
}
