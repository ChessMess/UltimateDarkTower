/**
 * UltimateDarkTower - Node.js Example
 *
 * A minimal interactive CLI app for verifying the Node.js Bluetooth adapter.
 * Connects to the tower, calibrates, and plays the 8-bit Bazaar sound.
 *
 * Prerequisites:
 *   npm install @stoprocent/noble
 *
 * Run:
 *   npm run example:node
 */

import * as readline from 'readline';
import UltimateDarkTower, {
  BluetoothPlatform,
  TOWER_AUDIO_LIBRARY,
  milliVoltsToPercentage,
  type DeviceInformation
} from '../../src';

const tower = new UltimateDarkTower({ platform: BluetoothPlatform.NODE });

// Disable library logging to keep the CLI clean
tower.setLoggerOutputs([]);

// Auto-disconnect after 10 minutes of inactivity to preserve tower battery
const INACTIVITY_TIMEOUT_MS = 10 * 60 * 1000;
let inactivityTimer: ReturnType<typeof setTimeout> | null = null;

function resetInactivityTimer(): void {
  clearInactivityTimer();
  if (tower.isConnected) {
    inactivityTimer = setTimeout(async () => {
      console.log('\n⏰ No activity for 10 minutes — disconnecting to save battery.');
      try {
        await tower.cleanup();
      } catch {
        // Ignore cleanup errors during auto-disconnect
      }
      // showMenu() is handled by onTowerDisconnect
    }, INACTIVITY_TIMEOUT_MS);
    // Don't let the timer keep the process alive if readline is closed
    inactivityTimer.unref();
  }
}

function clearInactivityTimer(): void {
  if (inactivityTimer !== null) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}

// Wire up event callbacks
tower.onTowerConnect = () => {
  console.log('\n✔ Tower connected!');
  resetInactivityTimer();
};

let handlingDisconnect = false;
tower.onTowerDisconnect = () => {
  // Guard against duplicate disconnect events (cleanup + adapter event)
  if (handlingDisconnect) return;
  handlingDisconnect = true;
  clearInactivityTimer();
  console.log('\n✖ Tower disconnected.');
  showMenu();
  // Reset after a short delay to allow future disconnects
  setTimeout(() => { handlingDisconnect = false; }, 500);
};

tower.onCalibrationComplete = () => {
  console.log('\n✔ Calibration complete!');
};

// CLI menu
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function showMenu(): void {
  console.log('\n--- UltimateDarkTower Node Example ---');
  console.log('1. Connect');
  console.log('2. Calibrate');
  console.log('3. Play Sound (8-bit Bazaar)');
  console.log('4. Device Information');
  console.log('5. Disconnect');
  console.log('6. Exit');
  rl.question('\nSelect option: ', handleInput);
}

async function handleInput(input: string): Promise<void> {
  resetInactivityTimer();
  const choice = input.trim();

  switch (choice) {
    case '1':
      try {
        console.log('Scanning for tower...');
        await tower.connect();
      } catch (err) {
        console.error('Connect failed:', (err as Error).message);
      }
      break;

    case '2':
      if (!tower.isConnected) {
        console.log('Not connected. Connect first.');
        break;
      }
      try {
        console.log('Calibrating (this takes a few seconds)...');
        await tower.calibrate();
        // calibrate() resolves when the command is sent, not when calibration finishes.
        // Wait for the onCalibrationComplete callback before continuing.
        await new Promise<void>((resolve) => {
          const originalCallback = tower.onCalibrationComplete;
          tower.onCalibrationComplete = () => {
            originalCallback();
            tower.onCalibrationComplete = originalCallback;
            resolve();
          };
        });
      } catch (err) {
        console.error('Calibrate failed:', (err as Error).message);
      }
      break;

    case '3':
      if (!tower.isCalibrated) {
        console.log('Not calibrated. Calibrate first.');
        break;
      }
      try {
        console.log(`Playing: ${TOWER_AUDIO_LIBRARY.ClassicBazaar.name}`);
        await tower.playSound(TOWER_AUDIO_LIBRARY.ClassicBazaar.value);
      } catch (err) {
        console.error('Play sound failed:', (err as Error).message);
      }
      break;

    case '4':
      if (!tower.isConnected) {
        console.log('Not connected. Connect first.');
        break;
      }
      {
        console.log('\n--- Device Information ---');
        const info: DeviceInformation = tower.getDeviceInformation();
        if (info.manufacturerName) console.log(`  Manufacturer:  ${info.manufacturerName}`);
        if (info.modelNumber) console.log(`  Model:         ${info.modelNumber}`);
        if (info.hardwareRevision) console.log(`  Hardware:      ${info.hardwareRevision}`);
        if (info.firmwareRevision) console.log(`  Firmware:      ${info.firmwareRevision}`);
        if (info.softwareRevision) console.log(`  Software:      ${info.softwareRevision}`);
        if (info.serialNumber) console.log(`  Serial:        ${info.serialNumber}`);
        if (!info.manufacturerName && !info.modelNumber && !info.hardwareRevision &&
          !info.firmwareRevision && !info.softwareRevision && !info.serialNumber) {
          console.log('  (No device information available)');
        }
        console.log('\n--- Status ---');
        console.log(`  Connected:    ${tower.isConnected}`);
        console.log(`  Calibrated:   ${tower.isCalibrated}`);
        console.log(`  Battery:      ${tower.currentBattery ? `${tower.currentBattery} mV (${milliVoltsToPercentage(tower.currentBattery)})` : 'N/A'}`);
      }
      break;

    case '5':
      try {
        await tower.cleanup();
        console.log('Disconnected.');
      } catch (err) {
        console.error('Disconnect failed:', (err as Error).message);
      }
      break;

    case '6':
      console.log('Exiting...');
      await gracefulExit();
      return;

    default:
      console.log('Invalid option.');
      break;
  }

  showMenu();
}

async function gracefulExit(): Promise<void> {
  clearInactivityTimer();
  try {
    if (tower.isConnected) {
      await tower.cleanup();
    }
  } catch {
    // Ignore cleanup errors on exit
  }
  rl.close();
  process.exit(0);
}

// Handle SIGINT (Ctrl+C) for graceful shutdown
process.on('SIGINT', () => {
  console.log('\nCaught interrupt signal.');
  gracefulExit();
});

// Check for @stoprocent/noble before starting
try {
  require.resolve('@stoprocent/noble');
} catch {
  console.error('Error: @stoprocent/noble is not installed.');
  console.error('This package is required for Node.js Bluetooth support.');
  console.error('Install it with: npm install @stoprocent/noble');
  process.exit(1);
}

// Start
console.log('UltimateDarkTower Node.js Example');
console.log('Make sure your tower is powered on and in range.');
showMenu();
