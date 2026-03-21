/**
 * captureTower.ts — BLE sniffer for the real Return to Dark Tower.
 *
 * Connects to the physical tower as a BLE central, subscribes to the TX
 * notification characteristic, and logs every notification as a timestamped
 * hex + ASCII dump. Also sends a single 20-byte zero command after subscription
 * to provoke an initial response.
 *
 * Usage (real tower must be powered on, companion app must NOT be open):
 *   npm run capture -w packages/host
 *
 * Output is printed to stdout. Copy the hex dumps and share them so we can
 * implement the correct TX response in FakeTower.
 */

import noble, { type Peripheral, type Service, type Characteristic } from '@stoprocent/noble';
import {
  UART_SERVICE_UUID,
  UART_TX_CHARACTERISTIC_UUID,
  UART_RX_CHARACTERISTIC_UUID,
  TOWER_DEVICE_NAME,
} from 'ultimatedarktower';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hexDump(buf: Buffer): string {
  const hex = Array.from(buf)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(' ');
  const ascii = Array.from(buf)
    .map((b) => (b >= 0x20 && b <= 0x7e ? String.fromCharCode(b) : '.'))
    .join('');
  return `[${buf.length} bytes]  ${hex}  |${ascii}|`;
}

function ts(): string {
  return new Date().toISOString().slice(11, 23); // HH:MM:SS.mmm
}

// Strip hyphens so noble UUIDs match (noble uses unhyphenated lower-case)
function stripHyphens(uuid: string): string {
  return uuid.replace(/-/g, '').toLowerCase();
}

const UART_SVC = stripHyphens(UART_SERVICE_UUID);
const UART_TX  = stripHyphens(UART_TX_CHARACTERISTIC_UUID);
const UART_RX  = stripHyphens(UART_RX_CHARACTERISTIC_UUID);

// ─── Main ─────────────────────────────────────────────────────────────────────

const TIMEOUT_MS = 30_000;
const packets: { ts: string; data: string }[] = [];

let done = false;

function finish(): void {
  if (done) return;
  done = true;

  console.log('\n─────────────────────────────────────────────');
  console.log(`Capture complete — ${packets.length} TX notification(s) received`);
  if (packets.length > 0) {
    console.log('\nFull packet list:');
    for (const p of packets) {
      console.log(`  ${p.ts}  ${p.data}`);
    }
  }
  noble.stopScanning();
  process.exit(0);
}

setTimeout(() => {
  console.log('\n[timeout] 30 s elapsed — stopping.');
  finish();
}, TIMEOUT_MS);

noble.on('stateChange', (state: string) => {
  if (state === 'poweredOn') {
    console.log(`[${ts()}] BLE adapter powered on — scanning for "${TOWER_DEVICE_NAME}"…`);
    noble.startScanning([], false);
  } else {
    console.error(`[${ts()}] BLE adapter state: ${state} — cannot scan`);
  }
});

noble.on('discover', (peripheral: Peripheral) => {
  const name = peripheral.advertisement?.localName ?? '';
  if (!name.startsWith(TOWER_DEVICE_NAME)) return;

  console.log(`[${ts()}] Found peripheral: "${name}" (${peripheral.address})`);
  noble.stopScanning();

  peripheral.connect((err?: Error | null) => {
    if (err) {
      console.error(`[${ts()}] Connect failed:`, err);
      finish();
      return;
    }
    console.log(`[${ts()}] Connected — discovering services…`);

    peripheral.discoverServices([UART_SVC], (err2?: Error | null, services?: Service[]) => {
      if (err2 || !services?.length) {
        console.error(`[${ts()}] Service discovery failed:`, err2 ?? 'no services');
        peripheral.disconnect();
        finish();
        return;
      }

      const svc = services[0];
      console.log(`[${ts()}] UART service found — discovering characteristics…`);

      // Discover ALL characteristics so we can see every UUID + its properties
      svc.discoverCharacteristics([], (err3?: Error | null, chars?: Characteristic[]) => {
        if (err3 || !chars?.length) {
          console.error(`[${ts()}] Characteristic discovery failed:`, err3 ?? 'none found');
          peripheral.disconnect();
          finish();
          return;
        }

        console.log(`[${ts()}] Discovered ${chars.length} characteristic(s):`);
        for (const c of chars) {
          console.log(`  uuid=${c.uuid}  properties=[${c.properties.join(', ')}]`);
        }

        // UUID naming is from the companion app's perspective:
        //   UART_TX (6e400002) = app transmits TO tower  → write properties
        //   UART_RX (6e400003) = app receives FROM tower → notify properties
        // So the notify char is UART_RX and the write char is UART_TX.
        let notifyChar: Characteristic | undefined = chars.find((c) => c.uuid === UART_RX);
        let writeChar:  Characteristic | undefined = chars.find((c) => c.uuid === UART_TX);

        // Property-based fallback if UUIDs differ from expectation
        if (!notifyChar) {
          notifyChar = chars.find((c) => c.properties.includes('notify') || c.properties.includes('indicate'));
          if (notifyChar) console.log(`[${ts()}] WARN: notify UUID unexpected — found at ${notifyChar.uuid}`);
        }
        if (!writeChar) {
          writeChar = chars.find((c) => c.properties.includes('write') || c.properties.includes('writeWithoutResponse'));
          if (writeChar) console.log(`[${ts()}] WARN: write UUID unexpected — found at ${writeChar.uuid}`);
        }

        console.log(`[${ts()}] Using — notify: ${notifyChar?.uuid ?? 'NONE'}, write: ${writeChar?.uuid ?? 'NONE'}`);

        if (!notifyChar) {
          console.error(`[${ts()}] Notify characteristic not found`);
          peripheral.disconnect();
          finish();
          return;
        }

        // Subscribe to state notifications (tower → app)
        notifyChar.subscribe((err4?: Error | null) => {
          if (err4) {
            console.error(`[${ts()}] Subscribe failed:`, err4);
          } else {
            console.log(`[${ts()}] Subscribed to notifications — listening…`);
          }
        });

        notifyChar.on('data', (data: Buffer, isNotification: boolean) => {
          const line = hexDump(data);
          console.log(`[${ts()}] Notification (isNotification=${isNotification}): ${line}`);
          packets.push({ ts: ts(), data: line });
        });

        // After 1 second, send a 20-byte zero command to provoke a response
        setTimeout(() => {
          if (!writeChar) {
            console.log(`[${ts()}] No write characteristic — skipping probe write`);
            return;
          }
          const probe = Buffer.alloc(20, 0x00);
          console.log(`[${ts()}] Sending probe command: ${hexDump(probe)}`);
          writeChar.write(probe, true, (err5?: Error | null) => {
            if (err5) {
              console.error(`[${ts()}] Write failed:`, err5);
            } else {
              console.log(`[${ts()}] Probe command sent — waiting for notification response…`);
            }
          });
        }, 1000);

        // After 15 s disconnect
        setTimeout(() => {
          console.log(`[${ts()}] 15 s elapsed — disconnecting`);
          peripheral.disconnect();
          finish();
        }, 15_000);
      });
    });
  });
});
