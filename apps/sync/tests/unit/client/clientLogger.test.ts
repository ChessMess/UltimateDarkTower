/**
 * clientLogger.test.ts — unit tests for ClientLogger.
 *
 * Tests ring buffer eviction, unsent-entry tracking, auto-send interval,
 * and flush-on-disconnect. Uses Jest fake timers for interval-based tests.
 * downloadAsFile() is not tested here (requires browser DOM).
 */

import { ClientLogger } from '../../../packages/client/src/clientLogger';

const MAX_ENTRIES = 500;
const AUTO_SEND_INTERVAL_MS = 30_000;

/** Push N logEvent entries with distinct notes into the logger. */
function pushN(logger: ClientLogger, n: number, prefix = 'entry'): void {
  for (let i = 0; i < n; i++) {
    logger.logEvent('event', `${prefix}-${i}`);
  }
}

/** Create a logger with a mock sendFn and return both. */
function makeLogger(src = 'test-client') {
  const logger = new ClientLogger(src);
  const sendFn = jest.fn<void, [string]>();
  logger.setSendFn(sendFn);
  return { logger, sendFn };
}

/** Parse entries from the JSON string passed to sendFn. */
function parseSent(sendFn: jest.Mock): { entries: { note?: string }[] } {
  const call = sendFn.mock.calls[sendFn.mock.calls.length - 1]?.[0] as string | undefined;
  if (!call) return { entries: [] };
  const msg = JSON.parse(call) as { payload: { entries: { note?: string }[] } };
  return { entries: msg.payload.entries };
}

describe('ClientLogger — ring buffer', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('accepts up to MAX_ENTRIES without eviction', () => {
    const { logger, sendFn } = makeLogger();
    pushN(logger, MAX_ENTRIES);
    logger.sendLogs();
    const { entries } = parseSent(sendFn);
    expect(entries).toHaveLength(MAX_ENTRIES);
  });

  it('caps at MAX_ENTRIES after overflow — oldest entry is evicted', () => {
    const { logger, sendFn } = makeLogger();
    pushN(logger, MAX_ENTRIES + 1); // 501 pushes; entry-0 evicted
    logger.sendLogs();
    const { entries } = parseSent(sendFn);

    // Buffer can only hold MAX_ENTRIES
    expect(entries).toHaveLength(MAX_ENTRIES);

    // The first entry pushed ('entry-0') should no longer be present
    const notes = entries.map((e) => e.note);
    expect(notes).not.toContain('entry-0');
    expect(notes).toContain('entry-1');
    expect(notes).toContain(`entry-${MAX_ENTRIES}`);
  });

  it('ring buffer wrap-around: 600 pushes yields 500 entries on send', () => {
    const { logger, sendFn } = makeLogger();
    pushN(logger, 600);
    logger.sendLogs();
    const { entries } = parseSent(sendFn);
    expect(entries).toHaveLength(MAX_ENTRIES);
  });
});

describe('ClientLogger — sendLogs() / unsent tracking', () => {
  it('sends all entries on first call', () => {
    const { logger, sendFn } = makeLogger();
    pushN(logger, 5);
    logger.sendLogs();
    const { entries } = parseSent(sendFn);
    expect(entries).toHaveLength(5);
  });

  it('sends only new (unsent) entries on subsequent calls', () => {
    const { logger, sendFn } = makeLogger();
    pushN(logger, 3, 'first');
    logger.sendLogs(); // sends 3

    pushN(logger, 2, 'second');
    logger.sendLogs(); // sends 2 new ones

    expect(sendFn).toHaveBeenCalledTimes(2);
    const lastBatch = parseSent(sendFn);
    expect(lastBatch.entries).toHaveLength(2);
    const notes = lastBatch.entries.map((e) => e.note);
    expect(notes).toContain('second-0');
    expect(notes).toContain('second-1');
  });

  it('is a no-op when no unsent entries exist', () => {
    const { logger, sendFn } = makeLogger();
    pushN(logger, 2);
    logger.sendLogs();
    logger.sendLogs(); // nothing new

    expect(sendFn).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when sendFn is not set', () => {
    const logger = new ClientLogger('no-send');
    expect(() => {
      logger.logEvent('event', 'test');
      logger.sendLogs();
    }).not.toThrow();
  });

  it('includes a valid message type in the JSON payload', () => {
    const { logger, sendFn } = makeLogger();
    logger.logEvent('event', 'hello');
    logger.sendLogs();

    const raw = sendFn.mock.calls[0][0];
    const parsed = JSON.parse(raw) as { type: string };
    expect(parsed.type).toBe('client:log');
  });
});

describe('ClientLogger — auto-send interval', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('fires sendLogs() after AUTO_SEND_INTERVAL_MS', () => {
    const { logger, sendFn } = makeLogger();
    logger.setAutoSend(true);
    pushN(logger, 3);

    jest.advanceTimersByTime(AUTO_SEND_INTERVAL_MS + 1);
    expect(sendFn).toHaveBeenCalledTimes(1);
  });

  it('fires sendLogs() again after a second interval', () => {
    const { logger, sendFn } = makeLogger();
    logger.setAutoSend(true);
    pushN(logger, 3);

    jest.advanceTimersByTime(AUTO_SEND_INTERVAL_MS + 1);
    pushN(logger, 3, 'second');
    jest.advanceTimersByTime(AUTO_SEND_INTERVAL_MS);

    expect(sendFn).toHaveBeenCalledTimes(2);
  });

  it('stops firing after setAutoSend(false)', () => {
    const { logger, sendFn } = makeLogger();
    logger.setAutoSend(true);
    pushN(logger, 3);

    jest.advanceTimersByTime(AUTO_SEND_INTERVAL_MS + 1);
    expect(sendFn).toHaveBeenCalledTimes(1);

    logger.setAutoSend(false);
    pushN(logger, 3, 'after-stop');
    jest.advanceTimersByTime(AUTO_SEND_INTERVAL_MS * 3);

    // Still only 1 call
    expect(sendFn).toHaveBeenCalledTimes(1);
  });

  it('calling setAutoSend(true) twice does not double-register', () => {
    const { logger, sendFn } = makeLogger();
    logger.setAutoSend(true);
    logger.setAutoSend(true); // second call should be ignored
    pushN(logger, 3);

    jest.advanceTimersByTime(AUTO_SEND_INTERVAL_MS + 1);
    expect(sendFn).toHaveBeenCalledTimes(1);
  });
});

describe('ClientLogger — flush()', () => {
  it('sends unsent entries synchronously before disconnect', () => {
    const { logger, sendFn } = makeLogger();
    pushN(logger, 4);

    logger.flush();

    expect(sendFn).toHaveBeenCalledTimes(1);
    const { entries } = parseSent(sendFn);
    expect(entries).toHaveLength(4);
  });

  it('does nothing when there are no unsent entries', () => {
    const { logger, sendFn } = makeLogger();
    pushN(logger, 2);
    logger.sendLogs();   // mark as sent
    logger.flush();      // nothing new

    expect(sendFn).toHaveBeenCalledTimes(1);
  });
});
