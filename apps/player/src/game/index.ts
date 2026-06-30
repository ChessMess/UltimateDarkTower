// Runtime loop (Player PRD §2.2): load/validate → relay connect → step → dispatch → checkpoint.
// This module owns the RelayClient singleton and drives the engine step loop.
// All persistent state lives in usePlayerStore; this module mutates it via getState().

import Ajv from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import { scenarioSchema } from '@udtc/schema';
import { validateRefs, validateGraph, createBoardAdapter } from '@udtc/adapters';
import { init, step } from '@udtc/engine';
import type { Input, Directive, StepResult } from '@udtc/engine';
import { RelayClient } from '../relay';
import { usePlayerStore } from '../store';
import type { ValidationResults } from '../types';

const PLAYER_SEED = 'player-runtime-seed';
const PLAYER_COUNT = 1;

// Module-level singletons — survive component remounts.
let _relay: RelayClient | null = null;
let _board: ReturnType<typeof createBoardAdapter> | null = null;
let _cmdSeq = 0;

function board(): ReturnType<typeof createBoardAdapter> {
  if (!_board) _board = createBoardAdapter();
  return _board;
}

function relay(): RelayClient {
  if (!_relay) {
    _relay = new RelayClient({
      onStatus: (status) => {
        usePlayerStore.getState().setRelayStatus(status);
        const store = usePlayerStore.getState();
        // Transition to playing once the target is calibrated
        if (store.phase === 'waiting' && status.calibrated && status.relaying) {
          store.setPhase('playing');
          store.addLog(`Relay ready — target: ${status.targetKind}`);
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

  store.addLog(`Engine ready — status: ${initResult.status}`);
  if (initResult.awaiting) store.addLog(`Awaiting: ${initResult.awaiting.id}`);

  store.setPhase('connecting');
  store.addLog(`Connecting to relay (${store.relayUrl})…`);
  relay().connect(store.relayUrl);
}

// ---- Relay target selection ----

export function selectTarget(target: 'tower' | 'emulator'): void {
  usePlayerStore.getState().setPhase('waiting');
  usePlayerStore.getState().addLog(`Requesting target: ${target}`);
  relay().requestTarget(target);
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
      // For MVP: send an empty byte array; Display adapter not yet wired (build guide §12).
      // The relay ACKs the command; no physical tower commands are issued in stub mode.
      _cmdSeq += 1;
      relay().sendCommand([], _cmdSeq);
      store.addLog(`tower.program: ${JSON.stringify(d.ops ?? []).slice(0, 100)}`);
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
