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
exports.createDefaultTowerState = void 0;
// Barrel of the cycle-free public surface that the UltimateDarkTowerDisplay
// package consumes via the bundled `ultimatedarktower` alias. It must NOT import
// (directly or transitively) UltimateDarkTower.ts — pulling that in re-creates the
// circular dependency that makes esbuild lazily wrap modules and breaks the Display
// package's module-level constant initialization (see build-examples.js).
__exportStar(require("./udtConstants"), exports);
var udtHelpers_1 = require("./udtHelpers");
Object.defineProperty(exports, "createDefaultTowerState", { enumerable: true, get: function () { return udtHelpers_1.createDefaultTowerState; } });
//# sourceMappingURL=udtDisplayExports.js.map