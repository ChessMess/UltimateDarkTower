// core.js — foundational, dependency-free helpers for the reducer: canonical serialization +
// FNV-1a digest (§6, §9), state clone, engine faults, the closed directive push (§5.2), and the
// canonical kingdom order (§3.1). Every other engine module builds on these; core imports nothing.

// The four board kingdoms in canonical clockwise order (schema $defs/kingdom). Seating, home-kingdom
// ownership, and the dormant-kingdom complement (§3.1) are all derived from this order so that two
// runs of the same scenario at the same player count build an identical hero/kingdom layout.
const KINGDOMS = ['north', 'south', 'east', 'west'];

// ---------- canonical serialization + digest (§6, §9) ----------
function canonical(o) {
  if (o === null || typeof o !== 'object') return JSON.stringify(o);
  if (Array.isArray(o)) return '[' + o.map((v) => (v === undefined ? 'null' : canonical(v))).join(',') + ']';
  return (
    '{' +
    Object.keys(o)
      .sort()
      // match JSON.stringify object semantics: keys whose value is undefined are omitted, so a
      // round-trip through serialize→deserialize (and digest vs. clone) stays valid + stable.
      .filter((k) => o[k] !== undefined)
      .map((k) => JSON.stringify(k) + ':' + canonical(o[k]))
      .join(',') +
    '}'
  );
}
function fnv1a32(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}
function serialize(state) {
  return canonical(state);
}
function deserialize(blob) {
  return JSON.parse(blob);
}
function digest(state) {
  // hash everything except volatile cursor bookkeeping that isn't game state
  const { clock, ...rest } = state;
  const c = {
    month: clock.month,
    turnInMonth: clock.turnInMonth,
    activeHero: clock.activeHero,
    cursor: clock.cursor,
  };
  return fnv1a32(canonical({ ...rest, clock: c }));
}

function clone(x) {
  return JSON.parse(JSON.stringify(x));
}
function fault(msg) {
  const e = new Error('ENGINE FAULT: ' + msg);
  e.isFault = true;
  return e;
}

// ---------- directives (§5.2, closed) ----------
function dir(directives, type, payload) {
  directives.push({ type, ...payload });
}

module.exports = {
  KINGDOMS,
  canonical,
  fnv1a32,
  serialize,
  deserialize,
  digest,
  clone,
  fault,
  dir,
};
