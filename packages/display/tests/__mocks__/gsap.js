const tweens = [];
const timelines = [];

function makeTween(target, vars) {
  const tween = {
    target,
    vars,
    killed: false,
    kill() {
      this.killed = true;
    },
  };
  tweens.push(tween);
  return tween;
}

function makeTimeline(opts) {
  const tl = {
    killed: false,
    calls: [],
    tweens: [],
    children: [],
    opts: opts || {},
    to(target, vars, position) {
      const child = { kind: 'to', target, vars, position };
      tl.calls.push(child);
      tl.tweens.push(child);
      tl.children.push(child);
      return tl;
    },
    call(fn, params, position) {
      const child = { kind: 'call', fn, params, position };
      tl.calls.push(child);
      tl.children.push(child);
      return tl;
    },
    add(child, position) {
      tl.children.push({ kind: 'add', child, position });
      return tl;
    },
    kill() {
      tl.killed = true;
    },
    __fireComplete() {
      if (tl.opts && typeof tl.opts.onComplete === 'function') tl.opts.onComplete();
    },
  };
  timelines.push(tl);
  return tl;
}

const gsap = {
  to: (target, vars) => makeTween(target, vars),
  timeline: makeTimeline,
};

const __mock = {
  default: gsap,
  ...gsap,
  __getTweens() {
    return tweens;
  },
  __getTimelines() {
    return timelines;
  },
  __reset() {
    tweens.length = 0;
    timelines.length = 0;
  },
};

// ESM surface. This package is `type: module`, so a CJS `module.exports`
// assignment is inert. Bindings are pulled off __mock and re-exported under
// aliases so they cannot collide with the class/const declarations above.
export default __mock.default;
const {
  to: __e_to,
  timeline: __e_timeline,
  __getTweens: __e___getTweens,
  __getTimelines: __e___getTimelines,
  __reset: __e___reset,
} = __mock;
export {
  __e_to as to,
  __e_timeline as timeline,
  __e___getTweens as __getTweens,
  __e___getTimelines as __getTimelines,
  __e___reset as __reset,
};
