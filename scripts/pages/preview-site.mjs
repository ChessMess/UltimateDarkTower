#!/usr/bin/env node
// preview:site — build the Creator and Player the way deploy-pages.yml does and serve them from ONE
// origin, so the Creator→Player handoff can actually be tested.
//
// WHY THIS EXISTS: `pnpm dev` runs the Creator on :5173 and the Player on :5174. Those are separate
// origins, so they do not share IndexedDB, so "Open in Player" cannot work across them — the
// scenario id resolves to nothing. Deployed they are sibling paths on one origin
// (/UltimateDarkTower/creator/ and /player/) and it works fine. A dev proxy would paper over that
// difference and make dev diverge from prod; this instead reproduces prod exactly.
//
// It also exercises the base path (/UltimateDarkTower/) and the relative ../player/ link, neither
// of which the dev servers cover.
//
// Mirrors the `vbuild` recipe in .github/workflows/deploy-pages.yml — keep them in step.

import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve } from 'node:path';

const BASE_PATH = '/UltimateDarkTower';
const PORT = Number(process.env.PORT ?? 4180);
const SITE = resolve(process.cwd(), '_site');

const APPS = [
  ['@udtc/creator', 'creator'],
  ['@udtc/player', 'player'],
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};

const skipBuild = process.argv.includes('--no-build');

if (!skipBuild) {
  for (const [pkg, sub] of APPS) {
    process.stdout.write(`building ${sub}…\n`);
    execFileSync(
      'pnpm',
      [
        '--filter',
        pkg,
        'exec',
        'vite',
        'build',
        `--base=${BASE_PATH}/${sub}/`,
        '--outDir',
        join(SITE, sub),
        '--emptyOutDir',
      ],
      { stdio: 'inherit' },
    );
  }
}

if (!existsSync(SITE)) {
  console.error(`No ${SITE} — run without --no-build first.`);
  process.exit(1);
}

const server = createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let pathname = decodeURIComponent(url.pathname);

  if (pathname === '/' || pathname === BASE_PATH || pathname === `${BASE_PATH}/`) {
    res.writeHead(302, { Location: `${BASE_PATH}/creator/` });
    res.end();
    return;
  }

  // Browsers request /favicon.ico at the origin root unprompted. Nothing serves it here (on Pages
  // the landing page does), and a 404 puts a red herring in the console of anyone debugging.
  if (pathname === '/favicon.ico') {
    res.writeHead(204).end();
    return;
  }

  if (!pathname.startsWith(`${BASE_PATH}/`)) {
    res.writeHead(404).end('Not found — try ' + `${BASE_PATH}/creator/`);
    return;
  }

  const rel = normalize(pathname.slice(BASE_PATH.length)).replace(/^(\.\.[/\\])+/, '');
  let file = join(SITE, rel);

  // SPA fallback: a directory or an extensionless path serves that app's index.html.
  if (!extname(file) || (existsSync(file) && statSync(file).isDirectory())) {
    file = join(file, 'index.html');
  }
  if (!existsSync(file)) {
    const app = rel.split('/').filter(Boolean)[0];
    file = join(SITE, app ?? '', 'index.html');
  }
  if (!existsSync(file)) {
    res.writeHead(404).end('Not found');
    return;
  }

  res.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
  createReadStream(file).pipe(res);
});

server.listen(PORT, () => {
  console.log(`\n  Creator  http://localhost:${PORT}${BASE_PATH}/creator/`);
  console.log(`  Player   http://localhost:${PORT}${BASE_PATH}/player/`);
  console.log(`\n  One origin — "Open in Player" works here, unlike across the dev servers.\n`);
});
