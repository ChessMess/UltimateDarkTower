import { defineConfig, type Plugin } from 'vite';
import { resolve, dirname } from 'path';
import { copyFileSync, mkdirSync, readFileSync } from 'fs';

function redirectExamplePath(): Plugin {
  const redirect = (
    req: { url?: string },
    res: { statusCode: number; setHeader(name: string, value: string): void; end(): void },
    next: () => void,
  ) => {
    if (req.url === '/') {
      res.statusCode = 302;
      res.setHeader('Location', '/example/');
      res.end();
      return;
    }

    if (req.url === '/example') {
      res.statusCode = 302;
      res.setHeader('Location', '/example/');
      res.end();
      return;
    }

    next();
  };

  return {
    name: 'redirect-example-path',
    configureServer(server) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

// Copies the tower GLB into dist/3d/assets/ so consumers can import it via
// `ultimatedarktowerdisplay/dist/3d/assets/tower.glb`. The source no longer
// imports the asset directly (it's consumer-supplied via TowerDisplayOptions.modelUrl),
// so Vite wouldn't otherwise emit it.
function copyTowerAsset(): Plugin {
  return {
    name: 'copy-tower-asset',
    apply: 'build',
    closeBundle() {
      const src = resolve(__dirname, 'src/3d/assets/tower.glb');
      const destDir = resolve(__dirname, 'dist/3d/assets');
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, resolve(destDir, 'tower.glb'));
    },
  };
}

// Vite lib mode unconditionally inlines `new URL(literal, import.meta.url)`
// assets as base64 data URIs (ignoring assetsInlineLimit). For the 113 .ogg
// files in audioLibrary.ts that would mean a 41 MB JS bundle (and even a single
// file like calibrationAudio.ts's bundled recording bloats the bundle by its
// base64 size); the 21 MB `board.png` alone would add ~28 MB of base64 to *each*
// of the ESM and CJS bundles. This plugin runs *before* Vite's asset processor,
// intercepts each per-file new URL expression, emits the asset as a separate
// Rollup asset, and substitutes a ROLLUP_FILE_URL_ placeholder so the bundle
// references the emitted file by relative path instead of inlining its bytes.
//
// The source pattern in these modules remains the canonical
// `new URL('./assets/<file>.<ext>', import.meta.url)` shape so esbuild,
// webpack 5+, Rollup, and Parcel still detect and emit the assets on the
// consumer side (each runs its own detector independently of Vite).
// Add any new hand-maintained `new URL('./assets/*.{ogg,png}', import.meta.url)`
// module here, or the lib build base64-inlines its bytes instead of emitting a
// file. See docs/AUDIO.md → "Adding a bundled sound to the library".
const URL_ASSET_HOSTS = [
  '/audio/audioLibrary.ts',
  '/audio/calibrationAudio.ts',
  '/audio/drumRotationSound.ts',
  // The real Return to Dark Tower board art (21 MB). Emitted as a separate file
  // (dist/3d/assets/board.png) rather than base64-inlined. See
  // src/3d/GameBoardImageTexture.ts.
  '/3d/GameBoardImageTexture.ts',
];
function emitAssetsAsFiles(): Plugin {
  // Match the full `new URL('./assets/<file>.<ext>', import.meta.url).href`
  // expression so the .href is part of what gets substituted — Rollup's
  // ROLLUP_FILE_URL_ placeholder already expands to a `.href` string, so
  // capturing .href in the match avoids a redundant double-wrap.
  //
  // Whitespace tolerance matters: Prettier line-wraps the longer entries in
  // audioLibrary.ts, either dropping `.href` onto the next line or exploding
  // the call across lines with a trailing comma after `import.meta.url`. Both
  // shapes must still match, or those files silently fall through to Vite's
  // lib-mode processor and get base64-inlined into the bundle instead of
  // emitted as separate assets. So allow an optional trailing comma before `)`
  // and arbitrary whitespace between `)` and `.href`.
  const URL_RE =
    /new URL\(\s*['"]\.\/assets\/([A-Za-z0-9_.-]+\.(?:ogg|png))['"]\s*,\s*import\.meta\.url\s*,?\s*\)\s*\.href/g;
  return {
    name: 'emit-assets-as-files',
    apply: 'build',
    enforce: 'pre',
    transform(code, id) {
      if (!URL_ASSET_HOSTS.some((host) => id.endsWith(host))) return null;
      const assetsDir = resolve(dirname(id), 'assets');
      const segments: string[] = [];
      let last = 0;
      let match: RegExpExecArray | null;
      URL_RE.lastIndex = 0;
      while ((match = URL_RE.exec(code))) {
        const filename = match[1];
        const refId = this.emitFile({
          type: 'asset',
          name: filename,
          source: readFileSync(resolve(assetsDir, filename)),
        });
        segments.push(code.slice(last, match.index));
        segments.push(`import.meta.ROLLUP_FILE_URL_${refId}`);
        last = match.index + match[0].length;
      }
      if (segments.length === 0) return null;
      segments.push(code.slice(last));
      return { code: segments.join(''), map: null };
    },
    // Vite 6+/rolldown render `import.meta.url` as `{}.url` (i.e. `undefined`)
    // in the CJS lib output, so the emitted `new URL('audio/assets/x.ogg', {}.url)`
    // throws `Invalid URL` the moment the CJS bundle is `require()`d — it
    // breaks every CJS consumer (Node, jest/jsdom, tooling), not just tests
    // (Vite 5 shimmed this safely; rolldown's `resolveFileUrl` hook is ignored).
    // Post-process the CJS chunks only: give `import.meta.url` a require-safe,
    // module-relative file URL. The ESM build is untouched — `import.meta.url`
    // is valid in an ES module.
    renderChunk(code, _chunk, options) {
      if (options.format !== 'cjs' || !code.includes('{}.url')) return null;
      const patched = code.replaceAll('{}.url', 'require("url").pathToFileURL(__filename).href');
      // Sourcemap left as-is; this is a Node/tooling artifact, not browser-debugged.
      return { code: patched, map: null };
    },
  };
}

export default defineConfig({
  plugins: [redirectExamplePath(), copyTowerAsset(), emitAssetsAsFiles()],
  resolve: {
    alias: {
      // The ESM build of ultimatedarktower uses createRequire which is not
      // available in browsers. Alias to the CJS build instead.
      ultimatedarktower: resolve(__dirname, 'node_modules/ultimatedarktower/dist/src/index.js'),
    },
  },
  optimizeDeps: {
    // Force Vite to pre-bundle the CJS build of ultimatedarktower so esbuild
    // converts it to proper ESM with all named exports available statically.
    include: ['ultimatedarktower'],
  },
  assetsInclude: ['**/*.glb', '**/*.ogg'],
  build: {
    lib: {
      // Two entries: the core (`ultimatedarktowerdisplay`) and the optional
      // physics subpath (`ultimatedarktowerdisplay/physics`). Each emits its
      // own ESM + CJS bundle so consumers who don't import the physics
      // subpath never load Rapier.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        physics: resolve(__dirname, 'src/physics/index.ts'),
      },
      formats: ['es', 'cjs'],
      // CJS must be a bare `.cjs` extension, not `.cjs.js` — under this
      // package's `"type": "module"`, a `.js` file is treated as ESM
      // regardless of its actual CommonJS content, which broke require()
      // entirely (ReferenceError: exports is not defined in ES module scope).
      // `.cjs` always resolves as CommonJS regardless of the `type` field.
      fileName: (format, entryName) =>
        format === 'es' ? `${entryName}.esm.js` : `${entryName}.cjs`,
    },
    // Force large binary assets (GLB model) to emit as separate files rather
    // than inlining as base64 in the JS bundle.
    assetsInlineLimit: 0,
    rollupOptions: {
      // Peer/external deps — not bundled.
      external: ['ultimatedarktower', 'three', /^three\/.*/, 'gsap', '@dimforge/rapier3d-compat'],
      output: {
        // Keep .ogg filenames stable under dist/audio/assets/ so consumers
        // using `buildOfficialSoundPack` to self-host from the package's
        // dist tree get predictable paths. board.png gets a stable path too
        // (dist/3d/assets/board.png, alongside the copied tower.glb) so it can
        // be self-hosted or served directly from the package. Other assets
        // (GLB) keep Vite's default hashed names for cache-busting.
        assetFileNames: (asset) => {
          if (asset.name?.endsWith('.ogg')) return 'audio/assets/[name][extname]';
          if (asset.name === 'board.png') return '3d/assets/[name][extname]';
          return 'assets/[name]-[hash][extname]';
        },
      },
    },
    sourcemap: true,
  },
});
