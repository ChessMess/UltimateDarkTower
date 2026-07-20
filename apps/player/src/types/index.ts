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
  BattlePromptPayload,
  BattlePromptCard,
} from '@udtc/engine';

export type GamePhase =
  | 'idle' // no scenario loaded
  | 'validating' // L1-L4 in progress
  | 'ready' // scenario loaded; waiting for explicit user start
  | 'connecting' // relay WS opening
  | 'waiting' // relay connected, target not yet calibrated
  | 'playing' // game in progress
  | 'ended' // won / lost / ended
  | 'error'; // validation or connection error

export type { RelayConnState, RelayTargetState, RelayStatus } from '@udtc/adapters';

export interface Checkpoint {
  serializedState: string;
  lastCommand: number[];
  seq: number;
  timestamp: number;
}

export type { SavedSession, SavedSessionMeta } from '../game/persistence';

// Player runs the shared L1–L3 pipeline plus its own L4 (engine-init) tier — the L4 result shape.
export type { ValidationResultsL4 as ValidationResults } from '@udtc/adapters';
