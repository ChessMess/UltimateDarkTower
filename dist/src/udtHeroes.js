"use strict";
/**
 * udtHeroes.ts — the Return to Dark Tower hero roster (static reference data).
 *
 * Consumed by `ultimatedarktowerboard` (re-exported, not vendored). Heroes are NOT
 * seed-encoded — this is identity/source metadata only. 14 heroes: 4 base, 2 Alliances,
 * 4 Covenant, 4 Expeditions (Expeditions is unreleased; its heroes are publicly confirmed
 * but provisional until the box ships).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HERO_BY_ID = exports.HEROES = void 0;
/** All 14 heroes, grouped by source (base → alliances → covenant → expeditions). */
exports.HEROES = [
    // Base (4)
    { id: 'brutal-warlord', name: 'Brutal Warlord', source: 'base' },
    { id: 'orphaned-scion', name: 'Orphaned Scion', source: 'base' },
    { id: 'relic-hunter', name: 'Relic Hunter', source: 'base' },
    { id: 'spymaster', name: 'Spymaster', source: 'base' },
    // Alliances (2)
    { id: 'archwright', name: 'Archwright', source: 'alliances' },
    { id: 'haunted-recluse', name: 'Haunted Recluse', source: 'alliances' },
    // Covenant (4)
    { id: 'devious-swindler', name: 'Devious Swindler', source: 'covenant' },
    { id: 'relentless-warden', name: 'Relentless Warden', source: 'covenant' },
    { id: 'reverent-astromancer', name: 'Reverent Astromancer', source: 'covenant' },
    { id: 'undaunted-aegis', name: 'Undaunted Aegis', source: 'covenant' },
    // Expeditions (4, unreleased — provisional)
    { id: 'jocular-druid', name: 'Jocular Druid', source: 'expeditions' },
    { id: 'grizzled-mariner', name: 'Grizzled Mariner', source: 'expeditions' },
    { id: 'clever-tinkerer', name: 'Clever Tinkerer', source: 'expeditions' },
    { id: 'enlightened-ascetic', name: 'Enlightened Ascetic', source: 'expeditions' },
];
/** Heroes keyed by their stable `id`. */
exports.HERO_BY_ID = Object.freeze(exports.HEROES.reduce((acc, hero) => {
    acc[hero.id] = hero;
    return acc;
}, {}));
//# sourceMappingURL=udtHeroes.js.map