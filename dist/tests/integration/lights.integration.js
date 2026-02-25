"use strict";
/**
 * Integration test: Validates allLightsOn / allLightsOff using real tower hardware.
 *
 * Prerequisites:
 *   - Tower must be powered on and in range
 *   - npm install @stoprocent/noble
 *   - Run with: npm run test:integration:lights
 *
 * Visual verification:
 *   - All lights on (solid) for 2 seconds
 *   - All lights breathe effect for 3 seconds
 *   - All lights off
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
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
(async () => {
    const prefix = '[LIGHTS INTEGRATION TEST]';
    const tower = new src_1.default({ platform: src_1.BluetoothPlatform.NODE });
    try {
        console.log(`${prefix} Step 1: Connecting to tower...`);
        await tower.connect();
        console.log(`${prefix} Step 2: Connected.`);
        // --- allLightsOn (default: solid on) ---
        console.log(`${prefix} Step 3: Turning all lights on (solid)...`);
        await tower.allLightsOn();
        const stateOn = tower.getCurrentTowerState();
        for (let i = 0; i < stateOn.layer.length; i++) {
            for (let j = 0; j < stateOn.layer[i].light.length; j++) {
                const light = stateOn.layer[i].light[j];
                if (light.effect !== src_1.LIGHT_EFFECTS.on || light.loop !== true) {
                    throw new Error(`Expected layer[${i}].light[${j}] to be effect=${src_1.LIGHT_EFFECTS.on} loop=true, ` +
                        `got effect=${light.effect} loop=${light.loop}`);
                }
            }
        }
        console.log(`${prefix} Step 3: PASS — all 24 LEDs on (effect=1, loop=true). Holding 2s for visual check...`);
        await delay(2000);
        // --- allLightsOn with breathe effect ---
        console.log(`${prefix} Step 4: Turning all lights on (breathe)...`);
        await tower.allLightsOn(src_1.LIGHT_EFFECTS.breathe);
        const stateBreathe = tower.getCurrentTowerState();
        for (let i = 0; i < stateBreathe.layer.length; i++) {
            for (let j = 0; j < stateBreathe.layer[i].light.length; j++) {
                const light = stateBreathe.layer[i].light[j];
                if (light.effect !== src_1.LIGHT_EFFECTS.breathe) {
                    throw new Error(`Expected layer[${i}].light[${j}].effect=${src_1.LIGHT_EFFECTS.breathe}, got ${light.effect}`);
                }
            }
        }
        console.log(`${prefix} Step 4: PASS — all 24 LEDs breathe (effect=2). Holding 3s for visual check...`);
        await delay(3000);
        // --- allLightsOff ---
        console.log(`${prefix} Step 5: Turning all lights off...`);
        await tower.allLightsOff();
        const stateOff = tower.getCurrentTowerState();
        for (let i = 0; i < stateOff.layer.length; i++) {
            for (let j = 0; j < stateOff.layer[i].light.length; j++) {
                const light = stateOff.layer[i].light[j];
                if (light.effect !== src_1.LIGHT_EFFECTS.off || light.loop !== false) {
                    throw new Error(`Expected layer[${i}].light[${j}] to be effect=${src_1.LIGHT_EFFECTS.off} loop=false, ` +
                        `got effect=${light.effect} loop=${light.loop}`);
                }
            }
        }
        console.log(`${prefix} Step 5: PASS — all 24 LEDs off (effect=0, loop=false).`);
        console.log(`${prefix} PASS: All lights integration test succeeded.`);
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
//# sourceMappingURL=lights.integration.js.map