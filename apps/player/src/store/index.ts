import { create } from 'zustand';
import type {
  EngineState,
  Status,
  InputRequest,
  Directive,
  GamePhase,
  RelayConnState,
  RelayStatus,
  Checkpoint,
  ValidationResults,
  SavedSessionMeta,
  BattlePromptPayload,
} from '../types';

/** State restored from a saved session (page-refresh recovery). */
export interface SessionHydration {
  scenario: unknown;
  engineState: EngineState;
  status: Status;
  awaiting: InputRequest | null;
  checkpoint: Checkpoint;
  log: string[];
  battlePrompt: BattlePromptPayload | null;
}

export interface PlayerStore {
  // Load / phase
  phase: GamePhase;
  scenario: unknown;
  validationResults: ValidationResults | null;
  validationError: string | null;

  // Engine
  engineState: EngineState | null;
  status: Status;
  awaiting: InputRequest | null;
  directives: Directive[];

  // Interactive card-battle presentation (set from the engine's ui.prompt kind==='battleCard')
  battlePrompt: BattlePromptPayload | null;

  // Checkpoint (last-good engine state + last tower:command sent)
  checkpoint: Checkpoint | null;

  // Relay
  relayConnState: RelayConnState;
  relayStatus: RelayStatus | null;
  relayUrl: string;

  // Event log (newest first, capped at 200)
  log: string[];

  // Resumable saved session detected on boot (drives the LoadPanel resume prompt)
  resumable: SavedSessionMeta | null;

  // ---- actions ----
  setPhase: (phase: GamePhase) => void;
  setValidationError: (err: string) => void;
  setScenario: (scenario: unknown, results: ValidationResults) => void;
  setEngineResult: (
    state: EngineState,
    status: Status,
    awaiting: InputRequest | undefined,
    directives: Directive[],
  ) => void;
  setBattlePrompt: (prompt: BattlePromptPayload | null) => void;
  saveCheckpoint: (serializedState: string, lastCommand: number[]) => void;
  setResumable: (meta: SavedSessionMeta | null) => void;
  hydrateFromSession: (h: SessionHydration) => void;
  setRelayConnState: (s: RelayConnState) => void;
  setRelayStatus: (s: RelayStatus) => void;
  setRelayUrl: (url: string) => void;
  addLog: (msg: string) => void;
  reset: () => void;
}

export const usePlayerStore = create<PlayerStore>((set) => ({
  phase: 'idle',
  scenario: null,
  validationResults: null,
  validationError: null,
  engineState: null,
  status: 'running',
  awaiting: null,
  directives: [],
  battlePrompt: null,
  checkpoint: null,
  relayConnState: 'disconnected',
  relayStatus: null,
  relayUrl: 'stub',
  log: [],
  resumable: null,

  setPhase: (phase) => set({ phase }),

  setValidationError: (err) => set({ validationError: err, phase: 'error' }),

  setScenario: (scenario, validationResults) =>
    set({ scenario, validationResults, validationError: null }),

  setEngineResult: (engineState, status, awaiting, directives) =>
    set((s) => ({
      engineState,
      status,
      awaiting: awaiting ?? null,
      directives,
      // the battle prompt only lives while the engine awaits a card-battle input; clear it otherwise
      battlePrompt:
        awaiting?.id === 'battleCard' || awaiting?.id === 'battleHeroTarget' ? s.battlePrompt : null,
    })),

  setBattlePrompt: (battlePrompt) => set({ battlePrompt }),

  saveCheckpoint: (serializedState, lastCommand) =>
    set((s) => ({
      checkpoint: {
        serializedState,
        lastCommand,
        seq: (s.checkpoint?.seq ?? -1) + 1,
        timestamp: Date.now(),
      },
    })),

  setResumable: (resumable) => set({ resumable }),

  hydrateFromSession: ({ scenario, engineState, status, awaiting, checkpoint, log, battlePrompt }) =>
    set({
      scenario,
      engineState,
      status,
      awaiting,
      checkpoint,
      log,
      battlePrompt,
      validationError: null,
      resumable: null,
    }),

  setRelayConnState: (relayConnState) => set({ relayConnState }),

  setRelayStatus: (relayStatus) => set({ relayStatus }),

  setRelayUrl: (relayUrl) => set({ relayUrl }),

  addLog: (msg) =>
    set((s) => ({ log: [`${new Date().toISOString().slice(11, 19)} ${msg}`, ...s.log].slice(0, 200) })),

  reset: () =>
    set({
      phase: 'idle',
      scenario: null,
      validationResults: null,
      validationError: null,
      engineState: null,
      status: 'running',
      awaiting: null,
      directives: [],
      battlePrompt: null,
      checkpoint: null,
      relayConnState: 'disconnected',
      relayStatus: null,
      log: [],
      resumable: null,
    }),
}));
