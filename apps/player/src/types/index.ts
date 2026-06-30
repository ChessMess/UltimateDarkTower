// Player-side types: relay protocol, game phases, checkpoints.
// Engine types (EngineState, Status, InputRequest, Input, Directive) are re-exported from @udtc/engine.

export type {
  EngineState,
  Status,
  InputRequest,
  Input,
  Directive,
  StepResult,
  ActionChoice,
} from '@udtc/engine';

export type GamePhase =
  | 'idle'        // no scenario loaded
  | 'validating'  // L1-L4 in progress
  | 'connecting'  // relay WS opening
  | 'waiting'     // relay connected, target not yet calibrated
  | 'playing'     // game in progress
  | 'ended'       // won / lost / ended
  | 'error';      // validation or connection error

export type { RelayConnState, RelayTargetState, RelayStatus } from '@udtc/adapters';

export interface Checkpoint {
  serializedState: string;
  lastCommand: number[];
  seq: number;
  timestamp: number;
}

export interface ValidationResults {
  l1: { ok: boolean; errors: string[] };
  l2: { ok: boolean; errors: string[] };
  l3: { ok: boolean; errors: string[] };
  l4: { ok: boolean; errors: string[] };
  allOk: boolean;
}
