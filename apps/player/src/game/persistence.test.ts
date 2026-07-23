// Covers checkForResumableSession's `version`-stamp guard (persistence.ts's SavedSession.version
// doc): an older or stamp-less record is refused via `staleSave`, not silently dropped, since it
// most often carries a pre-0.5.0 BoardState this build can no longer read.
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { ENGINE_VERSION } from '@udtc/engine';
import { saveSession, loadSession, type SavedSession } from './persistence';
import { checkForResumableSession, discardStaleSave, dismissStaleSave } from './index';
import { usePlayerStore } from '../store';

function baseRecord(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    version: 2,
    engineVersion: ENGINE_VERSION,
    scenario: { schemaVersion: '0.4.6' },
    serializedState: '{"turn":1}',
    status: 'running',
    awaiting: null,
    battlePrompt: null,
    boardState: { tokens: {} },
    lastCommand: [],
    seq: 3,
    log: [],
    scenarioName: 'Test scenario',
    savedAt: Date.now(),
    ...overrides,
  };
}

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory();
  usePlayerStore.getState().reset();
});

describe('checkForResumableSession — version-stamp guard', () => {
  it('resumes normally when the version stamp matches', async () => {
    await saveSession(baseRecord() as unknown as SavedSession);

    const meta = await checkForResumableSession();

    expect(meta?.scenarioName).toBe('Test scenario');
    expect(usePlayerStore.getState().resumable).not.toBeNull();
    expect(usePlayerStore.getState().staleSave).toBeNull();
  });

  it('refuses a v1 record (pre-0.5.0 BoardState) and surfaces it as staleSave', async () => {
    const record = baseRecord({ version: 1 });
    const raw = JSON.stringify(record, null, 2);
    await saveSession(record as unknown as SavedSession);

    const meta = await checkForResumableSession();

    expect(meta).toBeNull();
    expect(usePlayerStore.getState().resumable).toBeNull();
    const stale = usePlayerStore.getState().staleSave;
    expect(stale?.foundVersion).toBe(1);
    expect(stale?.raw).toBe(raw); // byte-identical — nothing is silently altered

    // The record must not have been cleared — Download is still available.
    expect(await loadSession()).not.toBeNull();
  });

  it('treats a stamp-less record the same as a version mismatch', async () => {
    const record = baseRecord();
    delete record.version;
    await saveSession(record as unknown as SavedSession);

    const meta = await checkForResumableSession();

    expect(meta).toBeNull();
    expect(usePlayerStore.getState().staleSave?.foundVersion).toBeUndefined();
    expect(usePlayerStore.getState().staleSave).not.toBeNull();
  });

  it('discardStaleSave clears the record and the dialog state', async () => {
    await saveSession(baseRecord({ version: 1 }) as unknown as SavedSession);
    await checkForResumableSession();
    expect(usePlayerStore.getState().staleSave).not.toBeNull();

    discardStaleSave();
    // The IndexedDB clear is async (fire-and-forget); give it a tick.
    await new Promise((r) => setTimeout(r, 0));

    expect(usePlayerStore.getState().staleSave).toBeNull();
    expect(await loadSession()).toBeNull();
  });

  it('dismissStaleSave closes the dialog without touching the stored record', async () => {
    await saveSession(baseRecord({ version: 1 }) as unknown as SavedSession);
    await checkForResumableSession();

    dismissStaleSave();

    expect(usePlayerStore.getState().staleSave).toBeNull();
    expect(await loadSession()).not.toBeNull();
  });
});
