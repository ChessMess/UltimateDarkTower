// run.js — the deterministic run loop: drive interpretNode from the cursor until an input boundary,
// a terminal outcome, or an end-of-turn event chain drains back to the stashed turn spine. A guard
// bounds runaway graphs. Depends on core (fault), nodes (interpretNode), and turn (rotateActiveHero).

const { fault } = require('./core');
const { interpretNode } = require('./nodes');
const { rotateActiveHero } = require('./turn');

function run(state, directives) {
  // safety bound so a malformed graph can't spin forever
  for (let guard = 0; guard < 100000; guard++) {
    if (
      state.outcome.status === 'won' ||
      state.outcome.status === 'lost' ||
      state.outcome.status === 'ended'
    )
      return state.outcome.status;
    const node = state._nodes[state.clock.cursor];
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

module.exports = { run };
