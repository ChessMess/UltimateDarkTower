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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BluetoothAdapterFactory = exports.BluetoothPlatform = exports.BluetoothTimeoutError = exports.BluetoothUserCancelledError = exports.BluetoothDeviceNotFoundError = exports.BluetoothConnectionError = exports.BluetoothError = exports.milliVoltsToPercentageNumber = exports.milliVoltsToPercentage = exports.BufferOutput = exports.DOMOutput = exports.ConsoleOutput = exports.Logger = exports.logger = exports.UltimateDarkTower = void 0;
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
// For convenience, also export as default
const UltimateDarkTower_2 = __importDefault(require("./UltimateDarkTower"));
exports.default = UltimateDarkTower_2.default;
//# sourceMappingURL=index.js.map