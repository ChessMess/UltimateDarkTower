#!/usr/bin/env node
/**
 * publish-packages — publish each public workspace package to npm, but only the
 * ones whose version in package.json isn't already on the registry.
 *
 * - Discovers packages under packages/* and skips any marked "private" (so cli
 *   and electron are never published; new public packages are picked up
 *   automatically).
 * - Publishes in dependency order (a dependency goes before its dependents), so
 *   a new shared version lands before a core/client that references it.
 * - Skips a package whose exact version is already published (npm forbids
 *   overwriting a version anyway).
 * - Each package's own `prepack` (clean && build) runs at publish time, so this
 *   script does no building itself.
 *
 * Usage (from the repo root):
 *   npm run publish:packages        # publish what's needed
 *   npm run publish:packages:dry    # show what would publish; publish nothing
 *
 * Log in first with `npm login`. If your account uses 2FA, npm will prompt for
 * the OTP; you can also pass it through, e.g.
 *   npm run publish:packages -- --otp=123456
 */

import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const PKG_ROOT = join(ROOT, 'packages');

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const passthrough = args.filter((a) => a !== '--dry-run'); // e.g. --otp=123456

const readPkg = (dir) => JSON.parse(readFileSync(join(PKG_ROOT, dir, 'package.json'), 'utf8'));

/** All non-private workspace packages. */
const packages = readdirSync(PKG_ROOT)
  .filter((dir) => {
    try {
      return !readPkg(dir).private;
    } catch {
      return false; // not a package dir
    }
  })
  .map((dir) => {
    const pkg = readPkg(dir);
    return { dir, name: pkg.name, version: pkg.version, pkg };
  });

/** Order so an internal dependency is published before the packages that need it. */
function dependencyOrder(list) {
  const byName = new Map(list.map((p) => [p.name, p]));
  const ordered = [];
  const seen = new Set();
  const visit = (p) => {
    if (seen.has(p.name)) return;
    seen.add(p.name);
    const deps = {
      ...p.pkg.dependencies,
      ...p.pkg.devDependencies,
      ...p.pkg.peerDependencies,
      ...p.pkg.optionalDependencies,
    };
    for (const depName of Object.keys(deps)) {
      const dep = byName.get(depName);
      if (dep) visit(dep);
    }
    ordered.push(p);
  };
  list.forEach(visit);
  return ordered;
}

/** Versions already on the registry (empty if the package was never published). */
function publishedVersions(name) {
  try {
    const out = execFileSync('npm', ['view', name, 'versions', '--json'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return []; // never published (E404) or offline — treat as "needs publish"
  }
}

// Fail early with a friendly message if not logged in.
let npmUser;
try {
  npmUser = execFileSync('npm', ['whoami'], { encoding: 'utf8' }).trim();
} catch {
  console.error('Not logged in to npm. Run `npm login` first, then re-run this.');
  process.exit(1);
}
console.log(`npm user: ${npmUser}${dryRun ? '   (dry run — nothing will be published)' : ''}\n`);

// Decide what needs publishing.
const ordered = dependencyOrder(packages);
const toPublish = [];
for (const p of ordered) {
  const published = publishedVersions(p.name);
  if (published.includes(p.version)) {
    console.log(`  skip     ${p.name}@${p.version}  (already on npm)`);
  } else {
    console.log(`  publish  ${p.name}@${p.version}${published.length ? '' : '  (first publish)'}`);
    toPublish.push(p);
  }
}

if (toPublish.length === 0) {
  console.log('\nEverything is up to date — nothing to publish.');
  process.exit(0);
}

// Publish, in order.
for (const p of toPublish) {
  const npmArgs = ['publish', '-w', `packages/${p.dir}`, ...passthrough];
  if (dryRun) npmArgs.push('--dry-run');
  console.log(`\n$ npm ${npmArgs.join(' ')}`);
  execFileSync('npm', npmArgs, { stdio: 'inherit', cwd: ROOT });
}

console.log(dryRun ? '\nDry run complete — no packages were published.' : '\nPublished.');
