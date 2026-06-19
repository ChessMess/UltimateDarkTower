/**
 * replayEvents — a tiny CLI to inspect, replay, and export a relay session's
 * semantic event log (PRD FR-6.3).
 *
 * Reads an `events-*.jsonl` file written by the relay's EventLog and either
 * prints a summary + the events, re-emits them in order (optionally honoring the
 * original timing), or serializes them to JSON/JSONL.
 *
 * Usage:
 *   node dist/replayEvents.js                          # newest events-*.jsonl in ./logs
 *   node dist/replayEvents.js --file ./logs/events-….jsonl
 *   node dist/replayEvents.js --dir ./logs
 *   node dist/replayEvents.js --replay [--realtime] [--speed 2]
 *   node dist/replayEvents.js --export json            # or: --export jsonl
 *
 * Options:
 *   --file <path>     Specific event-log file to read.
 *   --dir <path>      Directory to pick the newest events-*.jsonl from (default ./logs).
 *   --replay          Re-emit events in seq order (prints each as it fires).
 *   --realtime        With --replay, reproduce the original inter-event timing.
 *   --speed <n>       With --realtime, pacing multiplier (default 1; 2 = twice as fast).
 *   --export <fmt>    Serialize to 'json' (pretty array) or 'jsonl' (one per line) and exit.
 *
 * Imports the EventLog helpers from the core package's bleno-free `eventLog`
 * module directly (NOT the `core` barrel, which pulls in TowerEmulator → bleno) — a
 * log reader must never initialize Bluetooth.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  loadEventLog,
  replayEventLog,
  exportEventLog,
} from 'ultimatedarktowerrelay-core/dist/eventLog';
import type { RelayEvent } from 'ultimatedarktowerrelay-shared';

interface CliArgs {
  file: string | null;
  dir: string;
  replay: boolean;
  realtime: boolean;
  speed: number;
  exportFormat: 'json' | 'jsonl' | null;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    file: null,
    dir: './logs',
    replay: false,
    realtime: false,
    speed: 1,
    exportFormat: null,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--file':
        result.file = args[++i];
        break;
      case '--dir':
        result.dir = args[++i];
        break;
      case '--replay':
        result.replay = true;
        break;
      case '--realtime':
        result.realtime = true;
        break;
      case '--speed':
        result.speed = Number(args[++i]);
        break;
      case '--export': {
        const fmt = args[++i];
        if (fmt !== 'json' && fmt !== 'jsonl') {
          console.error(`--export expects 'json' or 'jsonl', got: ${fmt}`);
          process.exit(1);
        }
        result.exportFormat = fmt;
        break;
      }
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }
  return result;
}

/** Pick the newest `events-*.jsonl` file in a directory (names are timestamp-prefixed). */
function newestEventFile(dir: string): string {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => /^events-.*\.jsonl$/.test(f)).sort();
  } catch {
    console.error(`Cannot read directory: ${dir}`);
    process.exit(1);
  }
  if (files.length === 0) {
    console.error(`No events-*.jsonl files found in ${dir}`);
    process.exit(1);
  }
  return join(dir, files[files.length - 1]);
}

/** One-line summary of an event: `#<seq> [<time>] <type> <key fields>`. */
function formatEvent(event: RelayEvent): string {
  const seq = event.seq !== undefined ? `#${event.seq}` : '#—';
  const time = event.timestamp.slice(11, 23); // HH:MM:SS.mmm
  const extra = summarizePayload(event);
  return `  ${seq.padStart(5)} [${time}] ${event.type}${extra ? `  ${extra}` : ''}`;
}

function summarizePayload(event: RelayEvent): string {
  switch (event.type) {
    case 'skull-dropped':
      return `count=${event.payload.skullCount}`;
    case 'calibration-complete':
      return `replyType=0x${event.payload.replyType.toString(16).padStart(2, '0')}`;
    case 'command-received':
      return `bytes=${event.payload.command.length}`;
    case 'consumer-joined':
      return `${event.payload.label ?? event.payload.clientId.slice(0, 8)}${event.payload.observer ? ' (observer)' : ''}`;
    case 'consumer-left':
      return `${event.payload.label ?? event.payload.clientId.slice(0, 8)}`;
    default:
      return '';
  }
}

function printSummary(events: RelayEvent[], file: string): void {
  const seqs = events.map((e) => e.seq ?? 0);
  const counts = new Map<string, number>();
  for (const e of events) counts.set(e.type, (counts.get(e.type) ?? 0) + 1);

  console.log(`Event log: ${file}`);
  console.log(`  Events:   ${events.length}`);
  if (events.length > 0) {
    console.log(`  Seq:      ${Math.min(...seqs)} → ${Math.max(...seqs)}`);
    console.log(`  Time:     ${events[0].timestamp} → ${events[events.length - 1].timestamp}`);
    console.log(
      `  By type:  ${Array.from(counts.entries()).map(([t, n]) => `${t}=${n}`).join(', ')}`,
    );
  }
  console.log();
}

async function main(): Promise<void> {
  const args = parseArgs();
  const file = args.file ?? newestEventFile(args.dir);
  const events = loadEventLog(file);

  if (args.exportFormat) {
    console.log(exportEventLog(events, args.exportFormat));
    return;
  }

  printSummary(events, file);

  if (args.replay) {
    console.log(`Replaying ${events.length} events${args.realtime ? ` (realtime ×${args.speed})` : ''}…\n`);
    await replayEventLog(events, (e) => console.log(formatEvent(e)), {
      realtime: args.realtime,
      speed: args.speed,
    });
    return;
  }

  for (const e of events) console.log(formatEvent(e));
}

main().catch((err: unknown) => {
  console.error('replayEvents failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
