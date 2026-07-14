#!/usr/bin/env node
// Build the GitHub Pages landing page (docs/pages/index.html).
//
// Merges the hand-maintained editorial data (docs/pages/landing.data.mjs) with
// data derived fresh at build time — each package's version (package.json),
// npm-published state, docs/README presence (on disk) — into the design shell
// (docs/pages/index.template.html).
//
//   node scripts/pages/build-landing.mjs [outFile]
//
// Default outFile is docs/pages/index.html. The deploy workflow passes
// "$SITE/index.html" so the published page is always current. Run locally via
// `pnpm pages:landing`.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const pagesDir = resolve(root, 'docs/pages');
const outFile = process.argv[2]
  ? resolve(process.cwd(), process.argv[2])
  : resolve(pagesDir, 'index.html');

const { repo, site, components } = await import(
  pathToFileURL(resolve(pagesDir, 'landing.data.mjs'))
);
const REPO_URL = `https://github.com/${repo}`;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// >=1.0 Released · 0.5–<1.0 Beta · <0.5 Alpha
function deriveStatus(version) {
  const [maj = 0, min = 0] = String(version).split('.').map(Number);
  if (maj >= 1) return 'released';
  if (min >= 5) return 'beta';
  return 'alpha';
}

// "2026-07-13" -> "13 Jul 2026" (parsed by parts to avoid TZ drift)
function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || '');
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

function headStamp() {
  try {
    const sha = execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
    }).trim();
    return sha ? ` · <code>${esc(sha)}</code>` : '';
  } catch {
    return '';
  }
}

const STATUS_LABEL = { released: 'Released', beta: 'Beta', alpha: 'Alpha' };

function renderCard(c, index) {
  const pkgPath = resolve(root, c.dir, 'package.json');
  const pkg = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')) : {};
  // No package.json (e.g. a bundled demo like the controller) → no version pill.
  const version = pkg.version || null;
  const status = c.status || deriveStatus(version || '0.0.0');

  const demoUrl = c.demo ? `./${c.demo}/` : null;
  const npmUrl = pkg.private ? null : pkg.name ? `https://www.npmjs.com/package/${pkg.name}` : null;
  const sourceUrl = `${REPO_URL}/tree/main/${c.dir}`;
  const docsUrl = existsSync(resolve(root, c.dir, 'docs'))
    ? `${REPO_URL}/tree/main/${c.dir}/docs`
    : existsSync(resolve(root, c.dir, 'README.md'))
      ? `${REPO_URL}/blob/main/${c.dir}/README.md`
      : null;

  const mediaHref = demoUrl || sourceUrl;
  const ribbon = `<span class="ribbon"><span class="dot"></span>${STATUS_LABEL[status]}</span>`;
  const media = c.image
    ? `<a class="card-media" href="${esc(mediaHref)}"${demoUrl ? '' : ' target="_blank" rel="noopener"'}>
          <img src="./media/thumbs/${esc(c.image)}" alt="${esc(c.title)} screenshot" loading="lazy" decoding="async" width="800" height="500" />
          <span class="tint"></span>${ribbon}
        </a>`
    : `<a class="card-media tile" href="${esc(mediaHref)}" target="_blank" rel="noopener" aria-label="${esc(c.title)} source">
          <span class="glyph g-${c.glyph}"></span>${ribbon}
        </a>`;

  const links = [
    demoUrl && `<a class="primary" href="${esc(demoUrl)}">Demo</a>`,
    npmUrl && `<a href="${esc(npmUrl)}" target="_blank" rel="noopener">npm</a>`,
    docsUrl && `<a href="${esc(docsUrl)}" target="_blank" rel="noopener">Docs</a>`,
    `<a href="${esc(sourceUrl)}" target="_blank" rel="noopener">Source</a>`,
  ]
    .filter(Boolean)
    .join('\n            ');

  const delay = Math.min(index, 8) * 60;

  return `<article class="card status-${status} reveal" style="--d: ${delay}ms">
        ${media}
        <div class="card-body">
          <div class="card-head">
            <span class="card-badge"><span class="glyph g-${c.glyph}"></span></span>
            <span class="card-title">
              <h3>${esc(c.title)}</h3>
              ${pkg.name ? `<code>${esc(pkg.name)}</code>` : ''}
            </span>
            ${version ? `<span class="ver">v${esc(version)}</span>` : ''}
          </div>
          <p class="blurb">${esc(c.blurb)}</p>
          <div class="links">
            ${links}
          </div>
        </div>
      </article>`;
}

function renderSection(id, title, accentWord, items, glyph) {
  const noun = id === 'apps' ? 'apps' : 'packages';
  const cards = items.map((c, i) => renderCard(c, i)).join('\n      ');
  return `<section class="group" id="${id}">
        <div class="group-head">
          <span class="glyph g-${glyph}" aria-hidden="true"></span>
          <h2>${esc(title)} <span class="accent">${esc(accentWord)}</span></h2>
          <span class="rule"></span>
          <span class="count">${items.length} ${noun}</span>
        </div>
        <div class="grid">
      ${cards}
        </div>
      </section>`;
}

// ── Assemble ────────────────────────────────────────────────────────────────
const libraries = components.filter((c) => c.category === 'library');
const apps = components.filter((c) => c.category === 'app');
const npmCount = components.filter((c) => {
  const p = resolve(root, c.dir, 'package.json');
  return existsSync(p) && JSON.parse(readFileSync(p, 'utf8')).private !== true;
}).length;

const sections = [
  renderSection('apps', 'The', 'Apps', apps, 'quest'),
  renderSection('libraries', 'The', 'Libraries', libraries, 'battle'),
].join('\n\n      ');

const stats = [
  `<span><b>${libraries.length}</b> libraries</span>`,
  `<span class="sep">·</span>`,
  `<span><b>${apps.length}</b> apps</span>`,
  `<span class="sep">·</span>`,
  `<span><b>${npmCount}</b> published to npm</span>`,
].join('\n        ');

const built = `Regenerated ${prettyDate(new Date().toISOString())}${headStamp()}`;

const banner =
  '<!-- Generated by scripts/pages/build-landing.mjs from index.template.html + landing.data.mjs.\n     Do not edit by hand — run `pnpm pages:landing`. -->\n';

const html =
  banner +
  readFileSync(resolve(pagesDir, 'index.template.html'), 'utf8')
    .split('<!-- TAGLINE -->')
    .join(esc(site.tagline))
    .split('<!-- STATS -->')
    .join(stats)
    .split('<!-- COMPONENTS -->')
    .join(sections)
    .split('<!-- BUILT_AT -->')
    .join(built);

writeFileSync(outFile, html);
console.log(
  `Landing page → ${outFile}\n  ${libraries.length} libraries · ${apps.length} apps · ${npmCount} on npm`,
);
