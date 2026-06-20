"use strict";
/**
 * UltimateDarkTower - Main entry point
 * Export the main class and constants for public use
 */
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seed = exports.data = exports.IndexedDBSink = exports.bytesToHex = exports.InMemorySink = exports.UdtDiagnosticsRecorder = exports.parseDifferentialReadings = exports.createDefaultTowerState = exports.isCalibrated = exports.rtdt_pack_state = exports.rtdt_unpack_state = exports.BluetoothAdapterFactory = exports.BluetoothPlatform = exports.BluetoothTimeoutError = exports.BluetoothUserCancelledError = exports.BluetoothDeviceNotFoundError = exports.BluetoothConnectionError = exports.BluetoothError = exports.milliVoltsToPercentageNumber = exports.milliVoltsToPercentage = exports.BufferOutput = exports.DOMOutput = exports.ConsoleOutput = exports.Logger = exports.logger = exports.UltimateDarkTower = void 0;
var UltimateDarkTower_1 = require("./UltimateDarkTower");
Object.defineProperty(exports, "UltimateDarkTower", { enumerable: true, get: function () { return __importDefault(UltimateDarkTower_1).default; } });
__exportStar(require("./udtConstants"), exports);
var udtLogger_1 = require("./udtLogger");
Object.defineProperty(exports, "logger", { enumerable: true, get: function () { return udtLogger_1.logger; } });
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return udtLogger_1.Logger; } });
Object.defineProperty(exports, "ConsoleOutput", { enumerable: true, get: function () { return udtLogger_1.ConsoleOutput; } });
Object.defineProperty(exports, "DOMOutput", { enumerable: true, get: function () { return udtLogger_1.DOMOutput; } });
Object.defineProperty(exports, "BufferOutput", { enumerable: true, get: function () { return udtLogger_1.BufferOutput; } });
var udtHelpers_1 = require("./udtHelpers");
Object.defineProperty(exports, "milliVoltsToPercentage", { enumerable: true, get: function () { return udtHelpers_1.milliVoltsToPercentage; } });
Object.defineProperty(exports, "milliVoltsToPercentageNumber", { enumerable: true, get: function () { return udtHelpers_1.milliVoltsToPercentageNumber; } });
var udtBluetoothAdapter_1 = require("./udtBluetoothAdapter");
Object.defineProperty(exports, "BluetoothError", { enumerable: true, get: function () { return udtBluetoothAdapter_1.BluetoothError; } });
Object.defineProperty(exports, "BluetoothConnectionError", { enumerable: true, get: function () { return udtBluetoothAdapter_1.BluetoothConnectionError; } });
Object.defineProperty(exports, "BluetoothDeviceNotFoundError", { enumerable: true, get: function () { return udtBluetoothAdapter_1.BluetoothDeviceNotFoundError; } });
Object.defineProperty(exports, "BluetoothUserCancelledError", { enumerable: true, get: function () { return udtBluetoothAdapter_1.BluetoothUserCancelledError; } });
Object.defineProperty(exports, "BluetoothTimeoutError", { enumerable: true, get: function () { return udtBluetoothAdapter_1.BluetoothTimeoutError; } });
var udtBluetoothAdapterFactory_1 = require("./udtBluetoothAdapterFactory");
Object.defineProperty(exports, "BluetoothPlatform", { enumerable: true, get: function () { return udtBluetoothAdapterFactory_1.BluetoothPlatform; } });
Object.defineProperty(exports, "BluetoothAdapterFactory", { enumerable: true, get: function () { return udtBluetoothAdapterFactory_1.BluetoothAdapterFactory; } });
var udtTowerState_1 = require("./udtTowerState");
Object.defineProperty(exports, "rtdt_unpack_state", { enumerable: true, get: function () { return udtTowerState_1.rtdt_unpack_state; } });
Object.defineProperty(exports, "rtdt_pack_state", { enumerable: true, get: function () { return udtTowerState_1.rtdt_pack_state; } });
Object.defineProperty(exports, "isCalibrated", { enumerable: true, get: function () { return udtTowerState_1.isCalibrated; } });
var udtHelpers_2 = require("./udtHelpers");
Object.defineProperty(exports, "createDefaultTowerState", { enumerable: true, get: function () { return udtHelpers_2.createDefaultTowerState; } });
Object.defineProperty(exports, "parseDifferentialReadings", { enumerable: true, get: function () { return udtHelpers_2.parseDifferentialReadings; } });
// BLE disconnect diagnostics ("flight recorder") - off by default, see docs/BLE_DIAGNOSTICS.md
var udtDiagnostics_1 = require("./udtDiagnostics");
Object.defineProperty(exports, "UdtDiagnosticsRecorder", { enumerable: true, get: function () { return udtDiagnostics_1.UdtDiagnosticsRecorder; } });
Object.defineProperty(exports, "InMemorySink", { enumerable: true, get: function () { return udtDiagnostics_1.InMemorySink; } });
Object.defineProperty(exports, "bytesToHex", { enumerable: true, get: function () { return udtDiagnostics_1.bytesToHex; } });
var IndexedDBSink_1 = require("./sinks/IndexedDBSink");
Object.defineProperty(exports, "IndexedDBSink", { enumerable: true, get: function () { return IndexedDBSink_1.IndexedDBSink; } });
// Game / board reference data — grouped by domain sub-namespaces (heroes, monuments, foes,
// board, content, inventory). e.g. data.heroes.HEROES, data.board.BOARD_LOCATIONS,
// data.content.HEROES (gameplay), data.inventory.expansions. See docs/api/board-data.md.
exports.data = __importStar(require("./data"));
// Seed encode/decode + RNG subsystem. e.g. seed.decodeSeed(...), seed.TIER1_FOES,
// seed.SystemRandom. See docs/api/seed.md.
exports.seed = __importStar(require("./seed"));
// For convenience, also export as default
const UltimateDarkTower_2 = __importDefault(require("./UltimateDarkTower"));
exports.default = UltimateDarkTower_2.default;
//# sourceMappingURL=index.js.map