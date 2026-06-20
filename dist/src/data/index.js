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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventory = exports.content = exports.board = exports.foes = exports.monuments = exports.heroes = void 0;
/**
 * Game / board reference data, grouped by domain sub-namespaces. Exposed from the library
 * as the `data` namespace, so consumers reach each dataset via its domain:
 *
 *   import { data } from 'ultimatedarktower';
 *   data.heroes.HEROES        // board hero roster
 *   data.content.HEROES       // gameplay hero content (virtues, banner actions)
 *   data.board.BOARD_LOCATIONS
 *   data.inventory.expansions
 *
 * Sub-namespacing keeps the two hero/foe datasets (board roster vs gameplay content)
 * distinct without name collisions.
 */
exports.heroes = __importStar(require("./udtHeroes"));
exports.monuments = __importStar(require("./udtMonuments"));
exports.foes = __importStar(require("./udtFoes"));
exports.board = __importStar(require("./board"));
exports.content = __importStar(require("./udtGameContent"));
exports.inventory = __importStar(require("./udtBoxInventory"));
//# sourceMappingURL=index.js.map