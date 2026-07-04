// Public types for @udtc/engine (build guide §6). The type model lives in the checked source of
// truth engine/types.ts; this declaration file re-exports it and declares the runtime surface that
// src/index.js exposes at §2.3.

export * from './engine/types';

import type { EngineState, Input, InitOpts, StepResult, Condition } from './engine/types';

export declare const ENGINE_VERSION: string;
export declare const SUPPORTED_SCHEMA_RANGE: string;

export declare function init(scenario: unknown, opts: InitOpts): StepResult;
export declare function step(state: EngineState, input: Input): StepResult;
export declare function replay(scenario: unknown, opts: InitOpts, inputs: Input[]): StepResult[];
export declare function serialize(state: EngineState): string;
export declare function deserialize(blob: string): EngineState;
export declare function digest(state: EngineState): string;
export declare function evalCondition(condition: Condition | undefined, state: EngineState): boolean;

/** The compact golden regression scenario used by the engine test suites (frozen semantics). */
export declare const golden: unknown;

/**
 * The base-game fidelity golden scenario shipped in Creator/Player: full turn structure
 * (banner + move + one heroic action + reinforce), building-based Reinforce/Cleanse,
 * end-of-turn events, monthly quests, and a located final confrontation.
 */
export declare const goldenFull: unknown;
