/**
 * logger.test.ts — unit tests for HostLogger.
 *
 * Each test gets its own isolated temp directory. logger.close() is awaited
 * in afterEach to flush streams before reading files back.
 */

import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, utimesSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { HostLogger, pruneOldLogs } from '../../../packages/host/src/logger';

/** Parse a JSONL file into an array of objects. */
function readJsonl(filePath: string): Record<string, unknown>[] {
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

/** Find a file in dir matching a name predicate. */
function findFile(dir: string, predicate: (name: string) => boolean): string | undefined {
  return readdirSync(dir).find(predicate);
}

describe('HostLogger — constructor', () => {
  let dir: string;
  let logger: HostLogger;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir);
  });

  afterEach(async () => {
    await logger.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates both host and all log files on construction', async () => {
    await logger.close();
    const files = readdirSync(dir);
    expect(files.some((f) => f.includes('-host.jsonl'))).toBe(true);
    expect(files.some((f) => f.includes('-all.jsonl'))).toBe(true);
  });

  it('names files with the session timestamp pattern', async () => {
    await logger.close();
    const files = readdirSync(dir);
    const pattern = /^session-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}/;
    for (const f of files) {
      expect(f).toMatch(pattern);
    }
  });

  it('getLogDir() returns the directory path', () => {
    expect(logger.getLogDir()).toBe(dir);
  });
});

describe('HostLogger — logCommand()', () => {
  let dir: string;
  let logger: HostLogger;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir);
  });

  afterEach(async () => {
    await logger.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes an entry to both host and all files', async () => {
    const bytes = new Array(20).fill(0).map((_, i) => i);
    logger.logCommand('companion→host', bytes, 1, 'test-src', 'note');
    await logger.close();

    const hostFile = findFile(dir, (f) => f.includes('-host.jsonl'))!;
    const allFile = findFile(dir, (f) => f.includes('-all.jsonl'))!;

    const hostEntries = readJsonl(join(dir, hostFile));
    const allEntries = readJsonl(join(dir, allFile));

    expect(hostEntries).toHaveLength(1);
    expect(allEntries).toHaveLength(1);
    expect(hostEntries[0].src).toBe('test-src');
    expect(hostEntries[0].dir).toBe('companion→host');
    expect(typeof hostEntries[0].hex).toBe('string');
    expect((hostEntries[0].hex as string).length).toBe(40);
  });

  it('is a no-op when enabled is false', async () => {
    const disabledLogger = new HostLogger(dir, false);
    const bytes = new Array(20).fill(0);
    disabledLogger.logCommand('host→clients', bytes, null, 'src');
    await disabledLogger.close();

    const hostFile = findFile(dir, (f) => f.includes('-host.jsonl'))!;
    const allFile = findFile(dir, (f) => f.includes('-all.jsonl'))!;
    expect(readJsonl(join(dir, hostFile))).toHaveLength(0);
    expect(readJsonl(join(dir, allFile))).toHaveLength(0);
  });
});

describe('HostLogger — logEvent()', () => {
  let dir: string;
  let logger: HostLogger;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir);
  });

  afterEach(async () => {
    await logger.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes an event entry to both host and all files', async () => {
    logger.logEvent('event', 'host', 'connection established');
    await logger.close();

    const hostFile = findFile(dir, (f) => f.includes('-host.jsonl'))!;
    const entries = readJsonl(join(dir, hostFile));
    expect(entries).toHaveLength(1);
    expect(entries[0].level).toBe('event');
    expect(entries[0].note).toBe('connection established');
    expect(entries[0].src).toBe('host');
  });

  it('is a no-op when enabled is false', async () => {
    const disabledLogger = new HostLogger(dir, false);
    disabledLogger.logEvent('warn', 'host', 'ignored');
    await disabledLogger.close();

    const hostFile = findFile(dir, (f) => f.includes('-host.jsonl'))!;
    expect(readJsonl(join(dir, hostFile))).toHaveLength(0);
  });
});

describe('HostLogger — setEnabled()', () => {
  let dir: string;
  let logger: HostLogger;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir);
  });

  afterEach(async () => {
    await logger.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns the new enabled state', () => {
    expect(logger.setEnabled(false)).toBe(false);
    expect(logger.setEnabled(true)).toBe(true);
  });

  it('disabling stops writes; re-enabling resumes writes', async () => {
    const bytes = new Array(20).fill(0);

    logger.logEvent('event', 'host', 'before disable');
    logger.setEnabled(false);
    logger.logEvent('event', 'host', 'while disabled — should not appear');
    logger.setEnabled(true);
    logger.logEvent('event', 'host', 'after re-enable');

    await logger.close();

    const hostFile = findFile(dir, (f) => f.includes('-host.jsonl'))!;
    const entries = readJsonl(join(dir, hostFile));
    expect(entries).toHaveLength(2);
    expect(entries.map((e) => e.note)).toEqual([
      'before disable',
      'after re-enable',
    ]);

    void bytes; // suppress unused warning
  });
});

describe('HostLogger — writeClientEntries()', () => {
  let dir: string;
  let logger: HostLogger;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir);
  });

  afterEach(async () => {
    await logger.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('writes entries only to the all file, not the host file', async () => {
    const entries = [
      { ts: new Date().toISOString(), seq: null, dir: null, hex: null, src: '', level: 'event' as const, note: 'client entry' },
    ];
    logger.writeClientEntries('client-abc', entries);
    await logger.close();

    const hostFile = findFile(dir, (f) => f.includes('-host.jsonl'))!;
    const allFile = findFile(dir, (f) => f.includes('-all.jsonl'))!;

    expect(readJsonl(join(dir, hostFile))).toHaveLength(0);
    expect(readJsonl(join(dir, allFile))).toHaveLength(1);
  });

  it('tags entries with clientId when src is empty', async () => {
    const entries = [
      { ts: new Date().toISOString(), seq: null, dir: null, hex: null, src: '', level: 'event' as const, note: 'tagged' },
    ];
    logger.writeClientEntries('client-xyz', entries);
    await logger.close();

    const allFile = findFile(dir, (f) => f.includes('-all.jsonl'))!;
    const written = readJsonl(join(dir, allFile));
    expect(written[0].src).toBe('client-xyz');
  });

  it('preserves existing src when already set', async () => {
    const entries = [
      { ts: new Date().toISOString(), seq: null, dir: null, hex: null, src: 'player-1', level: 'event' as const, note: 'tagged' },
    ];
    logger.writeClientEntries('client-xyz', entries);
    await logger.close();

    const allFile = findFile(dir, (f) => f.includes('-all.jsonl'))!;
    const written = readJsonl(join(dir, allFile));
    expect(written[0].src).toBe('player-1');
  });
});

// ---------------------------------------------------------------------------
// Rotation
// ---------------------------------------------------------------------------

/** Collect all files matching a substring, sorted by segment number. */
function findFiles(dir: string, substring: string): string[] {
  return readdirSync(dir)
    .filter((f) => f.includes(substring))
    .sort((a, b) => {
      // Extract segment number: no suffix = 1, "-2.jsonl" = 2, etc.
      const segA = (a.match(/-(\d+)\.jsonl$/) ?? [])[1];
      const segB = (b.match(/-(\d+)\.jsonl$/) ?? [])[1];
      return (segA ? Number(segA) : 1) - (segB ? Number(segB) : 1);
    });
}

/** Read and concat JSONL entries from multiple files in order. */
function readAllJsonl(dir: string, files: string[]): Record<string, unknown>[] {
  return files.flatMap((f) => readJsonl(join(dir, f)));
}

describe('HostLogger — rotation', () => {
  let dir: string;
  let logger: HostLogger;

  afterEach(async () => {
    await logger.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('rotates host stream when maxFileSizeBytes exceeded', async () => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir, { maxFileSizeBytes: 500 });

    // Each logEvent entry is ~150-200 bytes of JSON; 4 should exceed 500.
    for (let i = 0; i < 4; i++) {
      logger.logEvent('event', 'host', `rotation test entry ${i}`);
    }
    await logger.close();

    const hostFiles = findFiles(dir, '-host');
    expect(hostFiles.length).toBeGreaterThanOrEqual(2);
    expect(hostFiles[0]).toMatch(/-host\.jsonl$/);   // segment 1: no number suffix
    expect(hostFiles[1]).toMatch(/-host-2\.jsonl$/); // segment 2

    // All entries are valid JSONL.
    const entries = readAllJsonl(dir, hostFiles);
    expect(entries.length).toBe(4);
    entries.forEach((e) => expect(e.level).toBe('event'));
  });

  it('rotates all stream independently from host stream', async () => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir, { maxFileSizeBytes: 300 });

    // Push data only through writeClientEntries → all stream only.
    for (let i = 0; i < 6; i++) {
      logger.writeClientEntries('c1', [
        { ts: new Date().toISOString(), seq: null, dir: null, hex: null, src: '', level: 'event' as const, note: `client entry ${i}` },
      ]);
    }
    await logger.close();

    const allFiles = findFiles(dir, '-all');
    const hostFiles = findFiles(dir, '-host');
    expect(allFiles.length).toBeGreaterThanOrEqual(2);
    expect(hostFiles).toHaveLength(1); // host stream never written to — no rotation
  });

  it('does not rotate when maxFileSizeBytes is 0 (default)', async () => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir); // no options → maxFileSizeBytes = 0

    for (let i = 0; i < 10; i++) {
      logger.logEvent('event', 'host', `entry ${i}`);
    }
    await logger.close();

    expect(findFiles(dir, '-host')).toHaveLength(1);
    expect(findFiles(dir, '-all')).toHaveLength(1);
  });

  it('preserves all entries across rotated files without loss', async () => {
    dir = mkdtempSync(join(tmpdir(), 'dts-logger-'));
    logger = new HostLogger(dir, { maxFileSizeBytes: 300 });

    const totalEntries = 8;
    for (let i = 0; i < totalEntries; i++) {
      logger.logEvent('event', 'host', `e${i}`);
    }
    await logger.close();

    const hostFiles = findFiles(dir, '-host');
    const entries = readAllJsonl(dir, hostFiles);
    expect(entries).toHaveLength(totalEntries);
    // Verify ordering preserved.
    entries.forEach((e, i) => expect(e.note).toBe(`e${i}`));
  });
});

// ---------------------------------------------------------------------------
// pruneOldLogs
// ---------------------------------------------------------------------------

describe('pruneOldLogs', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'dts-prune-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('deletes .jsonl files older than maxAgeDays', async () => {
    const oldFile = join(dir, 'session-old-host.jsonl');
    const recentFile = join(dir, 'session-recent-host.jsonl');
    writeFileSync(oldFile, '{"test":true}\n');
    writeFileSync(recentFile, '{"test":true}\n');

    // Backdate old file to 31 days ago.
    const past = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    utimesSync(oldFile, past, past);

    const count = await pruneOldLogs(dir, 30);
    expect(count).toBe(1);

    const remaining = readdirSync(dir);
    expect(remaining).toContain('session-recent-host.jsonl');
    expect(remaining).not.toContain('session-old-host.jsonl');
  });

  it('ignores non-.jsonl files', async () => {
    const txtFile = join(dir, 'notes.txt');
    writeFileSync(txtFile, 'keep me');
    const past = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    utimesSync(txtFile, past, past);

    const count = await pruneOldLogs(dir, 30);
    expect(count).toBe(0);
    expect(readdirSync(dir)).toContain('notes.txt');
  });

  it('returns 0 for non-existent directory', async () => {
    const count = await pruneOldLogs('/tmp/does-not-exist-xyz-' + Date.now(), 30);
    expect(count).toBe(0);
  });
});
