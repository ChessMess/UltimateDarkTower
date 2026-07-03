// conditions.js — the §4.4 condition vocabulary as pure predicates over EngineState. Closed set of
// subjects/comparators; an unknown member faults (invariant #4). Depends only on core (fault).

const { fault } = require('./core');

// ---------- conditions (§4.4, pure predicates) ----------
function evalCondition(cond, state) {
  if (!cond) return true;
  if (cond.allOf) return cond.allOf.every((c) => evalCondition(c, state));
  if (cond.anyOf) return cond.anyOf.some((c) => evalCondition(c, state));
  if (cond.not) return !evalCondition(cond.not, state);
  const { subject, comparator, value, key } = cond;
  let lhs;
  switch (subject) {
    case 'resource':
      lhs = (state.heroes[state.clock.activeHero] || {})[key];
      break;
    case 'flag':
      lhs = state.flags[key];
      break;
    case 'counter':
      lhs = state.counters[key] || 0;
      break;
    case 'sealsRemoved':
      lhs = state.sealsRemoved;
      break;
    case 'foeOnSpace':
      lhs = (state.foes || []).filter((f) => f.location === key).length;
      break;
    case 'heroAtLocation':
      lhs = Object.values(state.heroes).filter((h) => h.location === key).length;
      break;
    case 'supply':
      lhs = state.skulls.supply;
      break;
    case 'month':
      lhs = state.clock.month;
      break;
    case 'endOfMonth':
      lhs = state.clock.turnInMonth >= state.clock.turnsThisMonth;
      break;
    default:
      throw fault('condition subject not supported in MVP slice: ' + subject);
  }
  switch (comparator) {
    case 'eq':
      return lhs === value;
    case 'ne':
      return lhs !== value;
    case 'lt':
      return lhs < value;
    case 'lte':
      return lhs <= value;
    case 'gt':
      return lhs > value;
    case 'gte':
      return lhs >= value;
    case 'has':
      return Array.isArray(lhs) && lhs.includes(value);
    case 'in':
      return Array.isArray(value) && value.includes(lhs);
    default:
      throw fault('comparator not supported: ' + comparator);
  }
}

module.exports = { evalCondition };
