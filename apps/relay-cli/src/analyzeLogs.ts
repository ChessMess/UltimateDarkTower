/**
 * analyzeLogs — a read-only CLI for analyzing the relay's JSONL session logs
 * (PRD FR-8.2). Ported from UltimateDarkTowerSync's `analyzeLogs.ts`.
 *
 * Reads the `session-*.jsonl` files written by the relay's `HostLogger` and
 * prints a session summary, command timeline, per-seq correlation, LED-override
 * analysis, anomaly detection, and a per-client summary. This is distinct from
 * `replayEvents`, which inspects the separate semantic `events-*.jsonl` stream.
 *
 * Usage:
 *   node dist/analyzeLogs.js                       # all sessions in ./logs
 *   node dist/analyzeLogs.js --dir ./logs
 *   node dist/analyzeLogs.js --session 2026-06-18  # filter to a session date prefix
 *   node dist/analyzeLogs.js --anomalies           # only the anomaly report
 *   node dist/analyzeLogs.js --led-focus           # LED-override analysis + anomalies
 *   node dist/analyzeLogs.js --seq 42              # focus one sequence number
 *
 * Options:
 *   --dir <path>       Log directory (default: ./logs).
 *   --session <date>   Filter to filenames containing this session-date prefix.
 *   --led-focus        Highlight LED override analysis.
 *   --seq <n>          Focus on a specific sequence number.
 *   --anomalies        Show only anomalies.
 *
 * The pure analysis helpers live in `core` (`logAnalysis.ts`); this CLI imports
 * them via the `ultimatedarktowerrelay-core/dist/logAnalysis` subpath (NOT the
 * `core` barrel, which pulls in TowerEmulator → bleno), so reading logs never
 * initializes Bluetooth — the same pattern `replayEvents` uses for `eventLog`.
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  type LogEntry,
  type DecodedCommand,
  bytesFromHex,
  decodeCommand,
  formatLogEntry,
} from 'ultimatedarktowerrelay-shared';
import {
  type Anomaly,
  ledSeqName,
  audioName,
  selectLogFiles,
  parseLogLines,
  detectAnomalies,
} from 'ultimatedarktowerrelay-core/dist/logAnalysis';

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

interface CliArgs {
  dir: string;
  session: string | null;
  ledFocus: boolean;
  seq: number | null;
  anomalies: boolean;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const result: CliArgs = {
    dir: './logs',
    session: null,
    ledFocus: false,
    seq: null,
    anomalies: false,
  };

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--dir':
        result.dir = args[++i];
        break;
      case '--session':
        result.session = args[++i];
        break;
      case '--led-focus':
        result.ledFocus = true;
        break;
      case '--seq':
        result.seq = Number(args[++i]);
        break;
      case '--anomalies':
        result.anomalies = true;
        break;
      default:
        console.error(`Unknown option: ${args[i]}`);
        process.exit(1);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Log file loading (fs)
// ---------------------------------------------------------------------------

function loadEntries(dir: string, sessionFilter: string | null): LogEntry[] {
  let files: string[];
  try {
    files = readdirSync(dir);
  } catch {
    console.error(`Cannot read directory: ${dir}`);
    process.exit(1);
  }

  files = selectLogFiles(files, sessionFilter);

  if (files.length === 0) {
    console.error(
      `No .jsonl files found${sessionFilter ? ` matching "${sessionFilter}"` : ''} in ${dir}`,
    );
    process.exit(1);
  }

  console.log(`Loading ${files.length} log file(s) from ${dir}…\n`);

  const contents = files.map((file) => readFileSync(join(dir, file), 'utf-8'));
  return parseLogLines(contents);
}

// ---------------------------------------------------------------------------
// Report: Session Summary
// ---------------------------------------------------------------------------

function printSessionSummary(entries: LogEntry[]): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  SESSION SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const first = entries[0];
  const last = entries[entries.length - 1];
  const commands = entries.filter((e) => e.level === 'cmd');
  const events = entries.filter((e) => e.level !== 'cmd');
  const sources = new Set(entries.map((e) => e.src));
  const maxSeq = Math.max(0, ...commands.map((e) => e.seq ?? 0));

  const startTime = new Date(first.ts);
  const endTime = new Date(last.ts);
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationStr = `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;

  console.log(`  Time range:  ${first.ts}  →  ${last.ts}`);
  console.log(`  Duration:    ${durationStr}`);
  console.log(`  Entries:     ${entries.length} total (${commands.length} commands, ${events.length} events)`);
  console.log(`  Sequences:   1 → ${maxSeq}`);
  console.log(`  Sources:     ${Array.from(sources).join(', ')}`);
  console.log();
}

// ---------------------------------------------------------------------------
// Report: Command Timeline
// ---------------------------------------------------------------------------

function printTimeline(entries: LogEntry[], seqFilter: number | null): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  COMMAND TIMELINE');
  console.log('═══════════════════════════════════════════════════════════════');

  const commands = entries.filter((e) => e.level === 'cmd');
  const filtered = seqFilter !== null ? commands.filter((e) => e.seq === seqFilter) : commands;

  let prevTs: Date | null = null;
  for (const entry of filtered) {
    const ts = new Date(entry.ts);
    const delta = prevTs ? `+${ts.getTime() - prevTs.getTime()}ms` : '';
    prevTs = ts;

    const decoded = entry.decoded ?? (entry.hex ? decodeCommand(bytesFromHex(entry.hex)) : null);
    const extras: string[] = [];

    if (decoded) {
      if (decoded.ledOverride !== 0) {
        extras.push(`ledOverride=0x${decoded.ledOverride.toString(16).padStart(2, '0')} (${ledSeqName(decoded.ledOverride)})`);
      }
      if (decoded.audio !== 0) {
        extras.push(`audio=${audioName(decoded.audio)}`);
      }
    }

    console.log(`  ${formatLogEntry(entry)}  ${delta}`);
    if (extras.length > 0) {
      console.log(`    ↳ ${extras.join(' | ')}`);
    }
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Report: Correlation Matrix
// ---------------------------------------------------------------------------

function printCorrelation(entries: LogEntry[]): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  CORRELATION MATRIX (by seq)');
  console.log('═══════════════════════════════════════════════════════════════');

  const commands = entries.filter((e) => e.level === 'cmd' && e.seq !== null);
  const bySeq = new Map<number, LogEntry[]>();

  for (const entry of commands) {
    const seq = entry.seq!;
    if (!bySeq.has(seq)) bySeq.set(seq, []);
    bySeq.get(seq)!.push(entry);
  }

  for (const [seq, group] of Array.from(bySeq.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`  seq #${seq}:`);
    const sorted = group.sort((a, b) => a.ts.localeCompare(b.ts));

    const firstTs = new Date(sorted[0].ts).getTime();
    for (const entry of sorted) {
      const delta = new Date(entry.ts).getTime() - firstTs;
      console.log(`    ${entry.dir?.padEnd(16) ?? '?'.padEnd(16)} ${entry.src.padEnd(12)} +${delta}ms  ${entry.hex?.slice(0, 8) ?? ''}…`);
    }

    // Check hex consistency.
    const hexes = new Set(sorted.map((e) => e.hex).filter(Boolean));
    if (hexes.size > 1) {
      console.log(`    ⚠ HEX MISMATCH: ${Array.from(hexes).join(' vs ')}`);
    }
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Report: LED Override Analysis
// ---------------------------------------------------------------------------

function printLedOverrideAnalysis(entries: LogEntry[]): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  LED OVERRIDE ANALYSIS (byte 19 != 0)');
  console.log('═══════════════════════════════════════════════════════════════');

  const commands = entries.filter((e) => e.level === 'cmd');
  const ledCommands: Array<{ entry: LogEntry; decoded: DecodedCommand }> = [];

  for (const entry of commands) {
    const decoded = entry.decoded ?? (entry.hex ? decodeCommand(bytesFromHex(entry.hex)) : null);
    if (decoded && decoded.ledOverride !== 0) {
      ledCommands.push({ entry, decoded });
    }
  }

  if (ledCommands.length === 0) {
    console.log('  No LED override commands found.\n');
    return;
  }

  console.log(`  Found ${ledCommands.length} commands with LED override:\n`);

  // Group by override value.
  const byValue = new Map<number, number>();
  for (const { decoded } of ledCommands) {
    byValue.set(decoded.ledOverride, (byValue.get(decoded.ledOverride) ?? 0) + 1);
  }

  console.log('  Override value breakdown:');
  for (const [value, count] of Array.from(byValue.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`    0x${value.toString(16).padStart(2, '0')} (${ledSeqName(value)}): ${count} occurrences`);
  }
  console.log();

  // Show each with context (preceding command).
  for (let i = 0; i < ledCommands.length; i++) {
    const { entry, decoded } = ledCommands[i];
    console.log(`  ${formatLogEntry(entry)}`);
    console.log(`    ↳ ledOverride=0x${decoded.ledOverride.toString(16).padStart(2, '0')} (${ledSeqName(decoded.ledOverride)})`);
    console.log(`    ↳ audio=${audioName(decoded.audio)} | cmdType=0x${decoded.cmdType.toString(16).padStart(2, '0')}`);

    // Find the preceding command in the same direction from the same source.
    const cmdIndex = commands.indexOf(entry);
    if (cmdIndex > 0) {
      const prev = commands[cmdIndex - 1];
      const prevDecoded = prev.decoded ?? (prev.hex ? decodeCommand(bytesFromHex(prev.hex)) : null);
      console.log(`    ← preceding: ${formatLogEntry(prev)}${prevDecoded ? ` ledOvr=0x${prevDecoded.ledOverride.toString(16).padStart(2, '0')}` : ''}`);
    }
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Report: Anomaly Detection
// ---------------------------------------------------------------------------

function printAnomalies(anomalies: Anomaly[]): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ANOMALY DETECTION');
  console.log('═══════════════════════════════════════════════════════════════');

  if (anomalies.length === 0) {
    console.log('  No anomalies detected.\n');
    return;
  }

  console.log(`  Found ${anomalies.length} anomalies:\n`);
  for (const a of anomalies) {
    console.log(`  [${a.type}] ${a.message}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Report: Per-Client Summary
// ---------------------------------------------------------------------------

function printClientSummary(entries: LogEntry[]): void {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  PER-CLIENT SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════');

  const sources = new Set(entries.map((e) => e.src));

  for (const src of sources) {
    const srcEntries = entries.filter((e) => e.src === src);
    const commands = srcEntries.filter((e) => e.level === 'cmd');
    const received = commands.filter((e) => e.dir === 'client←host');
    const replayed = commands.filter((e) => e.dir === 'client→tower');
    const errors = srcEntries.filter((e) => e.level === 'error');

    console.log(`  ${src}:`);
    console.log(`    Commands received: ${received.length}`);
    console.log(`    Commands replayed: ${replayed.length}`);
    console.log(`    Errors: ${errors.length}`);

    // Average latency between received and replayed for same seq.
    const receivedBySeq = new Map<number, number>();
    for (const e of received) {
      if (e.seq !== null) receivedBySeq.set(e.seq, new Date(e.ts).getTime());
    }
    let totalLatency = 0;
    let latencyCount = 0;
    for (const e of replayed) {
      if (e.seq !== null && receivedBySeq.has(e.seq)) {
        totalLatency += new Date(e.ts).getTime() - receivedBySeq.get(e.seq)!;
        latencyCount++;
      }
    }
    if (latencyCount > 0) {
      console.log(`    Avg replay latency: ${(totalLatency / latencyCount).toFixed(1)}ms (${latencyCount} samples)`);
    }
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const args = parseArgs();
  const entries = loadEntries(args.dir, args.session);

  if (entries.length === 0) {
    console.log('No log entries found.');
    return;
  }

  if (args.anomalies) {
    printAnomalies(detectAnomalies(entries));
    return;
  }

  printSessionSummary(entries);

  if (args.seq !== null) {
    printTimeline(entries, args.seq);
    printCorrelation(entries);
    return;
  }

  if (args.ledFocus) {
    printLedOverrideAnalysis(entries);
    printAnomalies(detectAnomalies(entries));
    return;
  }

  printTimeline(entries, null);
  printCorrelation(entries);
  printLedOverrideAnalysis(entries);
  printAnomalies(detectAnomalies(entries));
  printClientSummary(entries);
}

main();
