import type { ForgeConfig } from '@electron-forge/shared-types';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import path from 'node:path';
import fs from 'node:fs';

// ─── Workspace node_modules copy helper ─────────────────────────────────────
// npm workspaces hoists all deps to the workspace root, so packages/electron/
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

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    name: 'DarkTowerSync',
    executableName: 'dark-tower-sync',
    // icon: './resources/icon', // add when icon is ready
    extendInfo: {
      NSBluetoothAlwaysUsageDescription:
        'DarkTowerSync needs Bluetooth to emulate the tower for the companion app.',
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
  },
  makers: [
    { name: '@electron-forge/maker-zip', platforms: ['darwin', 'linux'] },
    { name: '@electron-forge/maker-dmg', platforms: ['darwin'] },
    { name: '@electron-forge/maker-deb', platforms: ['linux'] },
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new VitePlugin({
      build: [
        { entry: 'src/main/main.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/main/preload.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [
        { name: 'main_window', config: 'vite.renderer.config.ts' },
      ],
    }),
  ],
};

export default config;
