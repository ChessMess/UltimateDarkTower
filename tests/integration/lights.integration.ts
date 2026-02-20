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

import UltimateDarkTower, { BluetoothPlatform, LIGHT_EFFECTS } from '../../src';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const prefix = '[LIGHTS INTEGRATION TEST]';
  const tower = new UltimateDarkTower({ platform: BluetoothPlatform.NODE });
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
        if (light.effect !== LIGHT_EFFECTS.on || light.loop !== true) {
          throw new Error(
            `Expected layer[${i}].light[${j}] to be effect=${LIGHT_EFFECTS.on} loop=true, ` +
            `got effect=${light.effect} loop=${light.loop}`
          );
        }
      }
    }
    console.log(`${prefix} Step 3: PASS — all 24 LEDs on (effect=1, loop=true). Holding 2s for visual check...`);
    await delay(2000);

    // --- allLightsOn with breathe effect ---
    console.log(`${prefix} Step 4: Turning all lights on (breathe)...`);
    await tower.allLightsOn(LIGHT_EFFECTS.breathe);
    const stateBreathe = tower.getCurrentTowerState();
    for (let i = 0; i < stateBreathe.layer.length; i++) {
      for (let j = 0; j < stateBreathe.layer[i].light.length; j++) {
        const light = stateBreathe.layer[i].light[j];
        if (light.effect !== LIGHT_EFFECTS.breathe) {
          throw new Error(
            `Expected layer[${i}].light[${j}].effect=${LIGHT_EFFECTS.breathe}, got ${light.effect}`
          );
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
        if (light.effect !== LIGHT_EFFECTS.off || light.loop !== false) {
          throw new Error(
            `Expected layer[${i}].light[${j}] to be effect=${LIGHT_EFFECTS.off} loop=false, ` +
            `got effect=${light.effect} loop=${light.loop}`
          );
        }
      }
    }
    console.log(`${prefix} Step 5: PASS — all 24 LEDs off (effect=0, loop=false).`);

    console.log(`${prefix} PASS: All lights integration test succeeded.`);
  } catch (err) {
    console.error(`${prefix} FAIL:`, err);
    process.exit(1);
  } finally {
    await tower.cleanup();
    process.exit(0);
  }
})();
