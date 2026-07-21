/**
 * Integration test: Validates real tower calibration sequence using Node Bluetooth.
 *
 * Prerequisites:
 *   - Tower must be powered on and in range
 *   - npm install @stoprocent/noble
 *   - Run with: npm run test:integration
 */

import UltimateDarkTower, { BluetoothPlatform } from '../../src';

(async () => {
  const prefix = '[INTEGRATION TEST]';
  const tower = new UltimateDarkTower({ platform: BluetoothPlatform.NODE });
  try {
    console.log(`${prefix} Step 1: Connecting to tower...`);
    await tower.connect();
    console.log(`${prefix} Step 2: Connected. Starting calibration...`);

    // Register the completion handler BEFORE issuing calibrate(): a tower that is
    // already calibrated (e.g. it self-calibrated on power-on) reports completion
    // the instant the command lands, so attaching the handler afterwards races the
    // event — the wait then times out even though calibration actually succeeded.
    let timer: ReturnType<typeof setTimeout>;
    const calibrationComplete = new Promise<void>((resolve, reject) => {
      tower.onCalibrationComplete = () => {
        clearTimeout(timer);
        console.log(`${prefix} Step 4: Calibration complete!`);
        resolve();
      };
      timer = setTimeout(() => reject(new Error('Calibration did not complete in time')), 60000);
    });

    await tower.calibrate();
    console.log(
      `${prefix} Step 3: Calibration command sent. Waiting for completion (up to 60s)...`,
    );
    await calibrationComplete;
    const glyphs = tower.getAllGlyphPositions();
    console.log(`${prefix} Step 5: Glyph positions after calibration:`);
    console.log(`${prefix}   `, glyphs);
    console.log(`${prefix} PASS: Calibration integration test succeeded.`);
  } catch (err) {
    console.error(`${prefix} FAIL:`, err);
    process.exit(1);
  } finally {
    await tower.cleanup();
    process.exit(0);
  }
})();
