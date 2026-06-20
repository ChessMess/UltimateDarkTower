"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONUMENT_BY_ID = exports.MONUMENTS = void 0;
/** The 8 Covenant monuments (alphabetical by name). */
exports.MONUMENTS = [
    { id: 'arch-of-the-golden-sun', name: 'Arch of the Golden Sun', source: 'covenant' },
    { id: 'argent-oak', name: 'Argent Oak', source: 'covenant' },
    { id: 'cenotaph-of-the-first-prophet', name: 'Cenotaph of the First Prophet', source: 'covenant' },
    { id: 'colossus-of-bjorn', name: 'Colossus of Bjorn', source: 'covenant' },
    { id: 'endless-necropolis', name: 'Endless Necropolis', source: 'covenant' },
    { id: 'moonstone-temple', name: 'Moonstone Temple', source: 'covenant' },
    { id: 'nightmare-cage', name: 'Nightmare Cage', source: 'covenant' },
    { id: 'tower-shard', name: 'Tower Shard', source: 'covenant' },
];
/** Monuments keyed by their stable `id`. */
exports.MONUMENT_BY_ID = Object.freeze(exports.MONUMENTS.reduce((acc, monument) => {
    acc[monument.id] = monument;
    return acc;
}, {}));
//# sourceMappingURL=udtMonuments.js.map