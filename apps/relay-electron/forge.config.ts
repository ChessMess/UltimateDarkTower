import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

// ─── Workspace node_modules copy helper ─────────────────────────────────────
// pnpm workspaces hoist all deps to the workspace root, so apps/relay-electron/
// node_modules/ is empty after `npm install`. Electron Forge only packages
// the electron package's own node_modules, so nothing gets included.
// This hook copies the runtime-external deps (and their transitive deps) from
// the workspace root into the build directory before Forge asars it.

function copyDir(src: string, dest: string): void {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
}

function copyWithTransitiveDeps(
  depName: string,
  rootModules: string,
  targetModules: string,
  seen: Set<string>,
): void {
  if (seen.has(depName)) return;
  seen.add(depName);

  const parts = depName.startsWith('@') ? depName.split('/') : [depName];
  const srcDir = path.join(rootModules, ...parts);
  const destDir = path.join(targetModules, ...parts);

  if (!fs.existsSync(srcDir)) return;

  // Ensure scoped package parent dir exists (@scope/)
  if (parts.length > 1) {
    fs.mkdirSync(path.join(targetModules, parts[0]), { recursive: true });
  }
  copyDir(srcDir, destDir);

  // Recurse into this package's own dependencies
  const pkgJsonPath = path.join(srcDir, 'package.json');
  if (!fs.existsSync(pkgJsonPath)) return;
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
    };
    const deps = { ...pkg.dependencies, ...pkg.optionalDependencies };
    for (const transitive of Object.keys(deps)) {
      copyWithTransitiveDeps(transitive, rootModules, targetModules, seen);
    }
  } catch {
    // ignore malformed package.json
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
      // Workspace root node_modules (where npm workspaces hoists everything)
      const rootModules = path.resolve(__dirname, '..', '..', 'node_modules');
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
        copyWithTransitiveDeps(dep, rootModules, targetModules, seen);
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
