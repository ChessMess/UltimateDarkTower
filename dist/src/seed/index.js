"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Seed subsystem — Return to Dark Tower seed encode/decode plus the C# `System.Random`
 * replica used to reproduce the game's RNG. Exposed from the library as the `seed`
 * namespace (e.g. `seed.decodeSeed(...)`, `seed.TIER1_FOES`, `seed.SystemRandom`).
 */
__exportStar(require("./udtSeedParser"), exports);
__exportStar(require("./udtSystemRandom"), exports);
//# sourceMappingURL=index.js.map