// run.ts — the deterministic run loop: drive interpretNode from the cursor until an input boundary,
// a terminal outcome, or an end-of-turn event chain drains back to the stashed turn spine. A guard
// bounds runaway graphs. Depends on core (fault), nodes (interpretNode), and turn (rotateActiveHero).

import { fault } from './core';
import { interpretNode } from './nodes';
import { rotateActiveHero } from './turn';
import type { EngineState, Directive, Status } from './types';

export function run(state: EngineState, directives: Directive[]): Status {
  // safety bound so a malformed graph can't spin forever
  for (let guard = 0; guard < 100000; guard++) {
    if (state.outcome.status === 'won' || state.outcome.status === 'lost' || state.outcome.status === 'ended')
      return state.outcome.status;
    const node = state._nodes[state.clock.cursor as string];
    if (!node) {
      state.outcome.status = 'ended';
      return 'ended';
    }
    const r = interpretNode(node, state, directives);
    if (r.await) {
      state.clock.pending = { request: r.await.request };
      state.outcome.status = 'awaitingInput';
      return 'awaitingInput';
    }
    if (r.terminal) return state.outcome.status;
    // NOTE: `r.end` is never actually set by any producer (interpretNode/dungeon.ts always return
    // {goto}/{await}/{terminal}, or {} from event.router) — this check is effectively dead, kept
    // exactly as the original reducer wrote it rather than simplified away.
    if (r.end || r.goto === undefined) {
      // an end-of-turn event chain ran off its last node: pop the next due chain, then resume
      // the turn spine (rotate + goto) stashed before the events fired.
      const q = state.clock.eventQueue;
      if (q && q.length) {
        state.clock.cursor = q.shift();
        continue;
      }
      const ae = state.clock.afterEvents;
      if (ae) {
        state.clock.afterEvents = null;
        state.clock.eventQueue = null;
        if (ae.rotate) rotateActiveHero(state);
        state.clock.cursor = ae.target;
        continue;
      }
      state.outcome.status = 'ended';
      return 'ended';
    }
    state.clock.cursor = r.goto;
  }
  throw fault('run loop exceeded guard (graph cycle without progress?)');
}
