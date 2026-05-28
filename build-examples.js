const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

const displayRepoDir = path.join(__dirname, '..', 'UltimateDarkTowerDisplay');
const displayEntryPoint = path.join(displayRepoDir, 'src', 'index.ts');
const displayModelPath = path.join(displayRepoDir, 'src', '3d', 'assets', 'tower.glb');

function hasLocalDisplayCheckout() {
    return fs.existsSync(displayEntryPoint) && fs.existsSync(displayModelPath);
}

function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

function copyFile(src, dest) {
    fs.copyFileSync(src, dest);
}

function copyAssetsDir(assetsSrcDir, assetsDestDir) {
    if (fs.existsSync(assetsSrcDir)) {
        ensureDir(assetsDestDir);
        const assetFiles = fs.readdirSync(assetsSrcDir);
        assetFiles.forEach((file) => {
            const srcFile = path.join(assetsSrcDir, file);
            const destFile = path.join(assetsDestDir, file);
            copyFile(srcFile, destFile);
        });

        console.log('   - assets/ (copied from examples/assets)');
        return;
    }

    console.log('   - assets/ directory not found - examples may not display correctly');
}

function getBuildConfigs(displayAvailable) {
    const define = {
        __UDT_DISPLAY_AVAILABLE__: JSON.stringify(displayAvailable),
    };

    return [
        {
            entryPoints: ['examples/controller/TowerController.ts'],
            bundle: true,
            outfile: 'dist/examples/controller/TowerController.js',
            platform: 'browser',
            target: 'es2017',
            format: 'iife',
            sourcemap: true,
            minify: false,
            tsconfig: 'tsconfig.json',
            define,
            loader: {
                '.svg': 'text',
                '.glb': 'file',
                '.png': 'file',
            },
            external: ['@stoprocent/noble'],
            alias: {
                ultimatedarktower: path.resolve(__dirname, 'src/index.ts'),
            },
        },
        {
            // NOTE: alias 'ultimatedarktower' to udtConstants.ts (not index.ts) to avoid
            // circular dependencies in UltimateDarkTower.ts that cause esbuild to wrap the
            // entire module in lazy __esm callbacks, which prevents the display package's
            // module-level EFFECT_LABELS (and similar constants) from initialising correctly.
            // The display package only needs runtime constant values, all of which live in
            // udtConstants.ts.
            entryPoints: [
                displayAvailable
                    ? 'examples/controller/TowerEmulator.ts'
                    : 'examples/controller/TowerEmulatorMissing.ts',
            ],
            bundle: true,
            outfile: 'dist/examples/controller/TowerEmulator.js',
            platform: 'browser',
            // ESM + es2020 so esbuild rewrites the display package's per-file
            // `new URL('./assets/<file>.ogg', import.meta.url)` references into
            // emitted assets next to the bundle. The HTML loads it via
            // <script type="module">.
            target: 'es2020',
            format: 'esm',
            sourcemap: true,
            minify: false,
            tsconfig: 'tsconfig.json',
            define,
            loader: {
                '.svg': 'text',
                '.glb': 'file',
                '.png': 'file',
            },
            external: ['@stoprocent/noble'],
            alias: {
                ultimatedarktower: path.resolve(__dirname, 'src/udtConstants.ts'),
            },
        },
        {
            entryPoints: ['examples/game/TowerGame.ts'],
            bundle: true,
            outfile: 'dist/examples/game/TowerGame.js',
            platform: 'browser',
            target: 'es2017',
            format: 'iife',
            sourcemap: true,
            minify: false,
            tsconfig: 'tsconfig.json',
            define,
            loader: {
                '.svg': 'text',
            },
            external: ['@stoprocent/noble'],
        },
    ];
}

async function buildExamples() {
    // Ensure dist/examples directory exists
    const examplesDistDir = path.join(__dirname, 'dist', 'examples');
    ensureDir(examplesDistDir);

    // Build controller example
    const controllerDistDir = path.join(examplesDistDir, 'controller');
    ensureDir(controllerDistDir);

    // Build game example
    const gameDistDir = path.join(examplesDistDir, 'game');
    ensureDir(gameDistDir);

    const isWatch = process.argv.includes('--watch');

    try {
        const displayAvailable = hasLocalDisplayCheckout();
        if (!displayAvailable) {
            console.log('   - UltimateDarkTowerDisplay not found at ../UltimateDarkTowerDisplay');
            console.log(
                '   - Tower Emulator will show setup instructions instead of the 3D display'
            );
        }

        const buildConfigs = getBuildConfigs(displayAvailable);

        if (isWatch) {
            const contexts = await Promise.all(
                buildConfigs.map((buildConfig) => esbuild.context(buildConfig))
            );
            await Promise.all(contexts.map((ctx) => ctx.watch()));
            console.log('👀 Watching example bundles for changes...');
        } else {
            await Promise.all(buildConfigs.map((buildConfig) => esbuild.build(buildConfig)));
        }

        // Copy HTML files from source to dist
        const controllerHtmlSrc = path.join(
            __dirname,
            'examples',
            'controller',
            'TowerController.html'
        );
        const controllerHtmlDest = path.join(controllerDistDir, 'TowerController.html');
        copyFile(controllerHtmlSrc, controllerHtmlDest);

        const emulatorHtmlSrc = path.join(
            __dirname,
            'examples',
            'controller',
            'TowerEmulator.html'
        );
        const emulatorHtmlDest = path.join(controllerDistDir, 'TowerEmulator.html');
        copyFile(emulatorHtmlSrc, emulatorHtmlDest);

        const gameHtmlSrc = path.join(__dirname, 'examples', 'game', 'TowerGame.html');
        const gameHtmlDest = path.join(gameDistDir, 'TowerGame.html');
        copyFile(gameHtmlSrc, gameHtmlDest);

        // Copy assets directory if it exists
        const assetsSrcDir = path.join(__dirname, 'examples', 'assets');
        const assetsDestDir = path.join(examplesDistDir, 'assets');
        copyAssetsDir(assetsSrcDir, assetsDestDir);

        // Copy display package's audio samples next to TowerEmulator.js so the
        // display's per-file `new URL('./assets/<file>.ogg', import.meta.url)`
        // references resolve at runtime against the bundle's URL. esbuild
        // doesn't emit assets from `new URL(...)` expressions (unlike Vite),
        // so we mirror the directory layout the bundle expects.
        const emulatorAudioSrcDir = path.join(
            __dirname,
            '..',
            'UltimateDarkTowerDisplay',
            'src',
            'audio',
            'assets'
        );
        const emulatorAudioDestDir = path.join(controllerDistDir, 'assets');
        if (fs.existsSync(emulatorAudioSrcDir)) {
            ensureDir(emulatorAudioDestDir);
            const oggs = fs.readdirSync(emulatorAudioSrcDir).filter((f) => f.endsWith('.ogg'));
            oggs.forEach((file) => {
                copyFile(
                    path.join(emulatorAudioSrcDir, file),
                    path.join(emulatorAudioDestDir, file)
                );
            });
            console.log(`   - controller/assets/ (${oggs.length} .ogg samples for emulator audio)`);
        } else {
            console.log('   - emulator audio source not found - emulator will be silent');
        }

        console.log('✅ Examples built successfully!');
        console.log('📁 Output directory: dist/examples/');
        console.log('   - controller/TowerController.js');
        console.log('   - controller/TowerController.html');
        console.log('   - controller/TowerEmulator.js');
        console.log('   - controller/TowerEmulator.html');
        console.log('   - game/TowerGame.js');
        console.log('   - game/TowerGame.html');

        if (isWatch) {
            console.log('🔄 Rebuilds run automatically as source files change.');
        }
    } catch (error) {
        console.error('❌ Build failed:', error);
        process.exit(1);
    }
}

buildExamples();
