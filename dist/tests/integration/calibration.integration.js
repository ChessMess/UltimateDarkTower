"use strict";
/**
 * Integration test: Validates real tower calibration sequence using Node Bluetooth.
 *
 * Prerequisites:
 *   - Tower must be powered on and in range
 *   - npm install @stoprocent/noble
 *   - Run with: npm run test:integration
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
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const src_1 = __importStar(require("../../src"));
(async () => {
    const prefix = '[INTEGRATION TEST]';
    const tower = new src_1.default({ platform: src_1.BluetoothPlatform.NODE });
    try {
        console.log(`${prefix} Step 1: Connecting to tower...`);
        await tower.connect();
        console.log(`${prefix} Step 2: Connected. Starting calibration...`);
        await tower.calibrate();
        console.log(`${prefix} Step 3: Calibration command sent. Waiting for completion (up to 60s)...`);
        await new Promise((resolve, reject) => {
            tower.onCalibrationComplete = () => {
                console.log(`${prefix} Step 4: Calibration complete!`);
                resolve();
            };
            setTimeout(() => reject(new Error('Calibration did not complete in time')), 60000);
        });
        const glyphs = tower.getAllGlyphPositions();
        console.log(`${prefix} Step 5: Glyph positions after calibration:`);
        console.log(`${prefix}   `, glyphs);
        console.log(`${prefix} PASS: Calibration integration test succeeded.`);
    }
    catch (err) {
        console.error(`${prefix} FAIL:`, err);
        process.exit(1);
    }
    finally {
        await tower.cleanup();
        process.exit(0);
    }
})();
//# sourceMappingURL=calibration.integration.js.map