import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

// ─── Runtime node_modules copy helper ───────────────────────────────────────
// Electron Forge only packages the app's own node_modules, and under pnpm those are
// symlinks: registry deps are hoisted to the workspace root, while workspace packages
// (`ultimatedarktower`) are linked only under apps/relay-electron/node_modules. This
// hook copies the runtime-external deps (and their transitive deps) into the build
// directory before Forge asars it, resolving each one the way Node does.

/** Node-style lookup: walk up from `fromDir` through each `node_modules`; returns the real path. */
function findPackageDir(depName: string, fromDir: string): string | undefined {
  for (let dir = fromDir; ; dir = path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', depName);
    if (fs.existsSync(candidate)) return fs.realpathSync(candidate);
    if (path.dirname(dir) === dir) return undefined;
  }
}

function copyWithTransitiveDeps(
  depName: string,
  fromDir: string,
  targetModules: string,
  seen: Set<string>,
  optional = false,
): void {
  if (seen.has(depName)) return;
  seen.add(depName);

  const srcDir = findPackageDir(depName, fromDir);
  if (!srcDir) {
    // Platform-specific optional deps may legitimately be absent; anything else would
    // ship an app that crashes at launch, so fail the build instead.
    if (optional) return;
    throw new Error(`packageAfterCopy: cannot resolve runtime dependency "${depName}"`);
  }

  // Deps are copied flat, so skip nested node_modules: pnpm keeps only `.bin` CLI shims
  // there for store packages, and a workspace package's are its devDependencies. The
  // shims' symlinks also point outside the app, which @electron/asar rejects.
  fs.cpSync(srcDir, path.join(targetModules, depName), {
    recursive: true,
    dereference: true,
    filter: (p) => path.basename(p) !== 'node_modules',
  });

  // Recurse from the package's real path, so pnpm's sibling layout resolves its deps.
  const pkg = JSON.parse(fs.readFileSync(path.join(srcDir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  for (const dep of Object.keys(pkg.dependencies ?? {})) {
    copyWithTransitiveDeps(dep, srcDir, targetModules, seen);
  }
  for (const dep of Object.keys(pkg.optionalDependencies ?? {})) {
    copyWithTransitiveDeps(dep, srcDir, targetModules, seen, true);
  }
}

const APP_NAME = 'DarkTowerRelay';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: APP_NAME,
    executableName: 'dark-tower-relay',
    icon: './resources/icon',
    extendInfo: {
      NSBluetoothAlwaysUsageDescription:
        'DarkTowerRelay needs Bluetooth to emulate the tower for the companion app (peripheral) and to connect to a physical tower (central).',
    },
  },
  hooks: {
    packageAfterCopy: async (_forgeConfig, buildPath) => {
      const targetModules = path.join(buildPath, 'node_modules');
      fs.mkdirSync(targetModules, { recursive: true });

      // These match the `external` list in vite.main.config.ts — packages
      // that Vite does NOT bundle, so they must be present at runtime.
      const runtimeExternals = [
        '@stoprocent/bleno',
        '@stoprocent/noble',
        'ultimatedarktower',
        'ws',
        'electron-squirrel-startup',
      ];

      const seen = new Set<string>();
      for (const dep of runtimeExternals) {
        copyWithTransitiveDeps(dep, __dirname, targetModules, seen);
      }
    },
    // Plain drag-to-Applications .dmg via macOS's own hdiutil. Replaces
    // @electron-forge/maker-dmg, whose appdmg -> image-size@0.7.5 chain carries an
    // unpatchable advisory. No styled background or volume icon; the app icon shows.
    postMake: async (_forgeConfig, makeResults) => {
      for (const result of makeResults) {
        if (result.platform !== 'darwin') continue;
        const version: string = result.packageJSON.version;
        const outDir = path.join(__dirname, 'out');
        const app = path.join(outDir, `${APP_NAME}-darwin-${result.arch}`, `${APP_NAME}.app`);
        const dmg = path.join(outDir, 'make', `${APP_NAME}-${version}-${result.arch}.dmg`);
        const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'dtr-dmg-'));
        try {
          execFileSync('ditto', [app, path.join(staging, `${APP_NAME}.app`)]);
          fs.symlinkSync('/Applications', path.join(staging, 'Applications'));
          execFileSync(
            'hdiutil',
            ['create', '-volname', APP_NAME, '-srcfolder', staging, '-ov', '-format', 'UDZO', dmg],
            { stdio: 'inherit' },
          );
        } finally {
          fs.rmSync(staging, { recursive: true, force: true });
        }
        result.artifacts.push(dmg);
      }
      return makeResults;
    },
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'linux'], config: {} },
    { name: '@electron-forge/maker-deb', platforms: ['linux'], config: {} },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        { entry: 'src/main/main.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/main/preload.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
  ],
};

export default config;
