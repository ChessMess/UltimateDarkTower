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
} from '../types';

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

  // Checkpoint (last-good engine state + last tower:command sent)
  checkpoint: Checkpoint | null;

  // Relay
  relayConnState: RelayConnState;
  relayStatus: RelayStatus | null;
  relayUrl: string;

  // Event log (newest first, capped at 200)
  log: string[];

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
  saveCheckpoint: (serializedState: string, lastCommand: number[]) => void;
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
  checkpoint: null,
  relayConnState: 'disconnected',
  relayStatus: null,
  relayUrl: 'stub',
  log: [],

  setPhase: (phase) => set({ phase }),

  setValidationError: (err) => set({ validationError: err, phase: 'error' }),

  setScenario: (scenario, validationResults) =>
    set({ scenario, validationResults, validationError: null }),

  setEngineResult: (engineState, status, awaiting, directives) =>
    set({ engineState, status, awaiting: awaiting ?? null, directives }),

  saveCheckpoint: (serializedState, lastCommand) =>
    set((s) => ({
      checkpoint: {
        serializedState,
        lastCommand,
        seq: (s.checkpoint?.seq ?? -1) + 1,
        timestamp: Date.now(),
      },
    })),

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
      checkpoint: null,
      relayConnState: 'disconnected',
      relayStatus: null,
      log: [],
    }),
}));
