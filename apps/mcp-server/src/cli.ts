// CLI-argument parsing helpers, split out of index.ts so they're importable and unit-testable
// (index.ts runs main() on import, so it can't be imported into a test).

/**
 * Parse a `--port` CLI value into a valid TCP port, or throw a friendly error.
 *
 * Without this, `--port` given as the final arg yields `parseInt(undefined) → NaN`, and
 * `app.listen(NaN)` throws `ERR_SOCKET_BAD_PORT`, crashing the process with an opaque stack
 * instead of a clear message.
 */
export function parsePort(raw: string | undefined): number {
  const port = Number(raw);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(
      `Invalid --port value ${JSON.stringify(raw ?? null)}: expected an integer between 1 and 65535.`,
    );
  }
  return port;
}
