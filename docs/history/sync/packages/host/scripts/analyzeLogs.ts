#!/usr/bin/env ts-node
/**
 * analyzeLogs — CLI tool for analyzing DarkTowerSync JSONL log files.
 *
 * Usage:
 *   npm run analyze -w packages/host -- [options]
 *
 * Options:
 *   --dir <path>       Log directory (default: ./logs)
 *   --session <date>   Filter to session date prefix
 *   --led-focus        Highlight LED override analysis
 *   --seq <n>          Focus on a specific sequence number
 *   --anomalies        Show only anomalies
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  type LogEntry,
  type DecodedCommand,
  bytesFromHex,
  decodeCommand,
  formatLogEntry,
} from '@dark-tower-sync/shared';

// Import UDT constants for human-readable names.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const {
  TOWER_LIGHT_SEQUENCES,
  TOWER_AUDIO_LIBRARY,
} = require('ultimatedarktower');

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
// Reverse lookup maps from UDT constants
// ---------------------------------------------------------------------------

const LED_SEQ_NAMES: Record<number, string> = {};
if (TOWER_LIGHT_SEQUENCES) {
  for (const [name, value] of Object.entries(TOWER_LIGHT_SEQUENCES)) {
    LED_SEQ_NAMES[value as number] = name;
  }
}

const AUDIO_NAMES: Record<number, string> = {};
if (TOWER_AUDIO_LIBRARY) {
  for (const [, info] of Object.entries(TOWER_AUDIO_LIBRARY)) {
    const a = info as { name: string; value: number; category: string };
    AUDIO_NAMES[a.value] = `${a.name} (${a.category})`;
  }
}

function ledSeqName(value: number): string {
  return LED_SEQ_NAMES[value] ?? `unknown(0x${value.toString(16).padStart(2, '0')})`;
}

function audioName(value: number): string {
  const sample = value & 0x7f;
  const loop = (value & 0x80) !== 0;
  const name = AUDIO_NAMES[sample] ?? `0x${sample.toString(16).padStart(2, '0')}`;
  return loop ? `${name} [loop]` : name;
}

// ---------------------------------------------------------------------------
// Log file loading
// ---------------------------------------------------------------------------

function loadEntries(dir: string, sessionFilter: string | null): LogEntry[] {
  let files: string[];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.jsonl')).sort();
  } catch {
    console.error(`Cannot read directory: ${dir}`);
    process.exit(1);
  }

  if (sessionFilter) {
    files = files.filter((f) => f.includes(sessionFilter));
  }

  if (files.length === 0) {
    console.error(`No .jsonl files found${sessionFilter ? ` matching "${sessionFilter}"` : ''} in ${dir}`);
    process.exit(1);
  }

  console.log(`Loading ${files.length} log file(s) from ${dir}…\n`);

  const entries: LogEntry[] = [];
  for (const file of files) {
    const content = readFileSync(join(dir, file), 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line) as LogEntry);
      } catch {
        // Skip malformed lines.
      }
    }
  }

  // Sort by timestamp.
  entries.sort((a, b) => a.ts.localeCompare(b.ts));
  return entries;
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
  const filtered = seqFilter !== null
    ? commands.filter((e) => e.seq === seqFilter)
    : commands;

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

interface Anomaly {
  type: string;
  message: string;
  entry?: LogEntry;
}

function detectAnomalies(entries: LogEntry[]): Anomaly[] {
  const anomalies: Anomaly[] = [];
  const commands = entries.filter((e) => e.level === 'cmd');

  // 1. Missing seq at clients.
  const hostSeqs = new Set(
    commands.filter((e) => e.dir === 'host→clients').map((e) => e.seq).filter((s): s is number => s !== null)
  );
  const clientSeqs = new Set(
    commands.filter((e) => e.dir === 'client←host').map((e) => e.seq).filter((s): s is number => s !== null)
  );
  for (const seq of hostSeqs) {
    if (!clientSeqs.has(seq)) {
      anomalies.push({
        type: 'MISSING_SEQ',
        message: `Seq #${seq} broadcast by host but never received by any client`,
      });
    }
  }

  // 2. Duplicate seq (same direction, same source).
  const seqDirSrc = new Map<string, LogEntry>();
  for (const entry of commands) {
    if (entry.seq === null) continue;
    const key = `${entry.seq}:${entry.dir}:${entry.src}`;
    if (seqDirSrc.has(key)) {
      anomalies.push({
        type: 'DUPLICATE_SEQ',
        message: `Duplicate seq #${entry.seq} for ${entry.dir} from ${entry.src}`,
        entry,
      });
    } else {
      seqDirSrc.set(key, entry);
    }
  }

  // 3. Time gaps > 5s between consecutive commands.
  for (let i = 1; i < commands.length; i++) {
    const prev = new Date(commands[i - 1].ts).getTime();
    const curr = new Date(commands[i].ts).getTime();
    const gap = curr - prev;
    if (gap > 5000) {
      anomalies.push({
        type: 'TIME_GAP',
        message: `${(gap / 1000).toFixed(1)}s gap between commands at ${commands[i].ts}`,
        entry: commands[i],
      });
    }
  }

  // 4. Hex mismatch between host and client for same seq.
  const hexBySeq = new Map<number, Set<string>>();
  for (const entry of commands) {
    if (entry.seq === null || !entry.hex) continue;
    if (!hexBySeq.has(entry.seq)) hexBySeq.set(entry.seq, new Set());
    hexBySeq.get(entry.seq)!.add(entry.hex);
  }
  for (const [seq, hexes] of hexBySeq) {
    if (hexes.size > 1) {
      anomalies.push({
        type: 'HEX_MISMATCH',
        message: `Seq #${seq} has mismatched hex across logs: ${Array.from(hexes).join(' vs ')}`,
      });
    }
  }

  // 5. Error-level events.
  const errors = entries.filter((e) => e.level === 'error');
  for (const entry of errors) {
    anomalies.push({
      type: 'ERROR',
      message: `[${entry.src}] ${entry.note ?? 'Unknown error'}`,
      entry,
    });
  }

  return anomalies;
}

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
    const anomalies = detectAnomalies(entries);
    printAnomalies(anomalies);
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
    const anomalies = detectAnomalies(entries);
    printAnomalies(anomalies);
    return;
  }

  printTimeline(entries, null);
  printCorrelation(entries);
  printLedOverrideAnalysis(entries);
  const anomalies = detectAnomalies(entries);
  printAnomalies(anomalies);
  printClientSummary(entries);
}

main();
