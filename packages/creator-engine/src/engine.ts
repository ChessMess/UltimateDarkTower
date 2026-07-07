// engine.ts — the shared rules-engine reducer (MVP vertical slice).
// Implements the contract's API surface (§2.3): init / step / replay / serialize / digest,
// a near-pure (EngineState, Input) → StepResult reducer (§5.1), the closed directive (§5.2)
// and input (§5.3) vocabularies, the observed-input bridge (§5.4: skullCounter), determinism
// via the engine-local pcg32 PRNG (§6), phase sequencing (§4.5), and win/loss detection (§9).
//
// SCOPE: this is a faithful *vertical slice* — real engine machinery (deterministic step loop,
// effects that mutate state, a genuine decision boundary + an observed boundary, the skull
// invariant, all three loss conditions + the win condition, the closed directive set) over a
// COMPACT golden scenario. It implements the node kinds and effect verbs the golden fixture
// uses; unimplemented kinds/verbs raise a clear fault rather than silently passing. Full
// month-by-month rules fidelity and the remaining verbs are a later pass (§4.3 is the full set).

// engine.ts is the assembly point: it wires the modules under ./engine/ together, keeps the reducer
// entry points (step/replay) that thread run + resume, and re-exports the §2.3 public API. Test
// suites and src/index.ts require THIS file ('../dist/engine' / './engine'); the file resolves ahead
// of the ./engine/ directory, so the module tree is an implementation detail.
import { ENGINE_VERSION, SUPPORTED_SCHEMA_RANGE, serialize, deserialize, digest, clone } from './engine/core';
import { evalCondition } from './engine/conditions';
import { applyEffect } from './engine/effects';
import { deriveGlyphFacing, homeKingdomOf, recomputeGlyphFacing } from './engine/glyph';
import { applyTrade } from './engine/turn';
import { startBattle, resolveBattle, startCardBattle, battleCardInput, battleHeroChoiceInput } from './engine/battle';
import { resolveRoomEntry, finalizeRoom, completeDungeon } from './engine/dungeon';
import { interpretNode } from './engine/nodes';
import { resume } from './engine/resume';
import { run } from './engine/run';
import { init, makeTestState, applyOne } from './engine/setup';
import type { EngineState, Input, StepResult, InitOpts } from './engine/types';

export function step(prevState: EngineState, input: Input): StepResult {
  const state = clone(prevState);
  // _nodes/_lib/_setup survive clone (plain JSON) — fine, they're immutable references.
  const directives: StepResult['directives'] = [];
  if (state.clock.pending) {
    const pending = state.clock.pending;
    state.clock.pending = null;
    state.outcome.status = 'running';
    const r = resume(pending, state, input, directives);
    if (r && r.await) {
      // resume can open a NEW input boundary (e.g. dungeon room: improve → move)
      state.clock.pending = { request: r.await.request };
      state.outcome.status = 'awaitingInput';
      return { state, directives, status: 'awaitingInput', awaiting: r.await.request };
    }
    if (r && r.goto !== undefined) state.clock.cursor = r.goto;
    else if (r && r.terminal) {
      /* outcome already set */
    }
  } else if (input && input.kind === 'control') {
    return { state: prevState, directives: [], status: prevState.outcome.status };
  }
  const status =
    state.outcome.status === 'running' || state.outcome.status === 'awaitingInput' ? run(state, directives) : state.outcome.status;
  // cast (not a plain annotation) — TS's flow analysis otherwise carries the `null` narrowing from
  // the `state.clock.pending = null` assignment above through this independent later read, even
  // though run(state, directives) can itself set it back to non-null internally (run.ts).
  const pendingNow = state.clock.pending as EngineState['clock']['pending'];
  return {
    state,
    directives,
    status,
    awaiting: pendingNow ? pendingNow.request : undefined,
  };
}

export function replay(scenario: unknown, opts: InitOpts, inputs: Input[]): StepResult[] {
  const results: StepResult[] = [];
  let r = init(scenario, opts);
  results.push(r);
  for (const inp of inputs) {
    if (r.status === 'won' || r.status === 'lost' || r.status === 'ended') break;
    r = step(r.state, inp);
    results.push(r);
  }
  return results;
}

export {
  ENGINE_VERSION,
  SUPPORTED_SCHEMA_RANGE,
  init,
  serialize,
  deserialize,
  digest,
  evalCondition,
};

export const __internals = {
  applyEffect,
  makeTestState,
  applyOne,
  startBattle,
  resolveBattle,
  startCardBattle,
  battleCardInput,
  battleHeroChoiceInput,
  applyTrade,
  interpretNode,
  resolveRoomEntry,
  finalizeRoom,
  completeDungeon,
  deriveGlyphFacing,
  homeKingdomOf,
  recomputeGlyphFacing,
};
