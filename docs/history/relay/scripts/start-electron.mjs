#!/usr/bin/env node
/**
 * Smart launcher for the Electron operator console — one command, no sequencing
 * knowledge required. Run it with `npm run start:electron`.
 *
 *   1. Incrementally build `shared` + `core` (`tsc --build`). Vite bundles the GUI
 *      from source, so this is purely a fast type-check guard (no-op when unchanged).
 *   2. Ensure `@stoprocent/{bleno,noble}` match Electron's native ABI via
 *      `@electron/rebuild` WITHOUT `--force`: it cache-restores when they're already
 *      built for this Electron version (fast) and only recompiles when the ABI/source
 *      actually changed — e.g. after running the Node CLI (`npm start`), which leaves
 *      the modules at the Node ABI. So this step is always-correct AND fast.
 *   3. Launch `electron-forge start` with `ELECTRON_RUN_AS_NODE` cleared. Done here in
 *      JS rather than the bash-only `env -u …` so it works on Windows too — and because
 *      VS Code's integrated terminal sets that var, which would otherwise make Electron
 *      boot as plain Node instead of opening the window.
 *
 * To go back to the Node CLI afterwards, run `npm run rebuild:node` (restores the
 * Node ABI). The next `npm run start:electron` re-restores the Electron ABI from cache.
 */
import { spawnSync } from 'node:child_process';

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

/** Run an npm script, inheriting stdio; abort the launcher on failure. */
function run(label, args, env) {
  if (label) console.log(`\n▸ ${label}`);
  const res = spawnSync(npm, args, { stdio: 'inherit', env: env ?? process.env });
  if (res.error) {
    console.error(res.error);
    process.exit(1);
  }
  // status is null when the child was killed by a signal (e.g. our SIGKILL on quit) —
  // treat that as a clean exit, only bail on a real non-zero status.
  if (typeof res.status === 'number' && res.status !== 0) process.exit(res.status);
  return res;
}

run('Building shared + core (incremental)…', ['run', 'build:shared']);
run(null, ['run', 'build:core']);
run('Ensuring native modules match the Electron ABI (cached)…', ['run', 'rebuild:electron']);

const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
run('Launching Electron…', ['run', 'start', '-w', 'packages/electron'], env);
