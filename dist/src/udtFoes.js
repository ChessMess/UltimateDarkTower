"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOE_BY_NAME = exports.FOE_BY_ID = exports.ALL_FOES = exports.ADVERSARY_ROSTER = exports.FOES = exports.FOE_STATUSES = void 0;
/** The statuses in progression order, lowest → highest threat. */
exports.FOE_STATUSES = ['panicked', 'unsteady', 'ready', 'savage', 'lethal'];
/** The 12 tiered foes (Tier 1→level 2, Tier 2→level 3, Tier 3→level 4). Names match the seed unions. */
exports.FOES = [
    // Tier 1 — level 2
    { id: 'brigands', name: 'Brigands', kind: 'foe', level: 2, tier: 1, source: 'base' },
    { id: 'oreks', name: 'Oreks', kind: 'foe', level: 2, tier: 1, source: 'base' },
    { id: 'shadow-wolves', name: 'Shadow Wolves', kind: 'foe', level: 2, tier: 1, source: 'base' },
    { id: 'spine-fiends', name: 'Spine Fiends', kind: 'foe', level: 2, tier: 1, source: 'base' },
    // Tier 2 — level 3
    { id: 'frost-trolls', name: 'Frost Trolls', kind: 'foe', level: 3, tier: 2, source: 'base' },
    { id: 'clan-of-neuri', name: 'Clan of Neuri', kind: 'foe', level: 3, tier: 2, source: 'base' },
    { id: 'lemures', name: 'Lemures', kind: 'foe', level: 3, tier: 2, source: 'base' },
    { id: 'widowmade-spiders', name: 'Widowmade Spiders', kind: 'foe', level: 3, tier: 2, source: 'base' },
    // Tier 3 — level 4
    { id: 'dragons', name: 'Dragons', kind: 'foe', level: 4, tier: 3, source: 'base' },
    { id: 'mormos', name: 'Mormos', kind: 'foe', level: 4, tier: 3, source: 'base' },
    { id: 'striga', name: 'Striga', kind: 'foe', level: 4, tier: 3, source: 'base' },
    { id: 'titans', name: 'Titans', kind: 'foe', level: 4, tier: 3, source: 'base' },
];
/** The 8 adversaries (the apex foe — level 5). `ADVERSARIES` (the name array) is the seed enum. */
exports.ADVERSARY_ROSTER = [
    { id: 'ashstrider', name: 'Ashstrider', kind: 'adversary', level: 5, source: 'base' },
    { id: 'bane-of-omens', name: 'Bane of Omens', kind: 'adversary', level: 5, source: 'base' },
    { id: 'empress-of-shades', name: 'Empress of Shades', kind: 'adversary', level: 5, source: 'base' },
    { id: 'gaze-eternal', name: 'Gaze Eternal', kind: 'adversary', level: 5, source: 'base' },
    { id: 'gravemaw', name: 'Gravemaw', kind: 'adversary', level: 5, source: 'base' },
    { id: 'isa-the-exile', name: 'Isa the Exile', kind: 'adversary', level: 5, source: 'base' },
    { id: 'lingering-rot', name: 'Lingering Rot', kind: 'adversary', level: 5, source: 'base' },
    { id: 'utuk-ku', name: "Utuk'Ku", kind: 'adversary', level: 5, source: 'base' },
];
/** Foes and adversaries together (20 entries), levels 2–5. */
exports.ALL_FOES = [...exports.FOES, ...exports.ADVERSARY_ROSTER];
/** Every foe/adversary keyed by its stable `id`. */
exports.FOE_BY_ID = Object.freeze(exports.ALL_FOES.reduce((acc, foe) => {
    acc[foe.id] = foe;
    return acc;
}, {}));
/** Every foe/adversary keyed by its display `name` (interop with the seed-parser unions). */
exports.FOE_BY_NAME = Object.freeze(exports.ALL_FOES.reduce((acc, foe) => {
    acc[foe.name] = foe;
    return acc;
}, {}));
//# sourceMappingURL=udtFoes.js.map