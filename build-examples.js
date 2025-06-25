const esbuild = require("esbuild");
const path = require("path");
const fs = require("fs");

async function buildExamples() {
    // Ensure dist/examples directory exists
    const examplesDistDir = path.join(__dirname, "dist", "examples");
    if (!fs.existsSync(examplesDistDir)) {
        fs.mkdirSync(examplesDistDir, { recursive: true });
    }

    // Build controller example
    const controllerDistDir = path.join(examplesDistDir, "controller");
    if (!fs.existsSync(controllerDistDir)) {
        fs.mkdirSync(controllerDistDir, { recursive: true });
    }

    // Build game example
    const gameDistDir = path.join(examplesDistDir, "game");
    if (!fs.existsSync(gameDistDir)) {
        fs.mkdirSync(gameDistDir, { recursive: true });
    }

    try {
        // Build TowerController
        await esbuild.build({
            entryPoints: ["examples/controller/TowerController.ts"],
            bundle: true,
            outfile: "dist/examples/controller/TowerController.js",
            platform: "browser",
            target: "es2017",
            format: "iife",
            sourcemap: true,
            minify: false,
            tsconfig: "tsconfig.json",
        });

        // Build TowerGame
        await esbuild.build({
            entryPoints: ["examples/game/TowerGame.ts"],
            bundle: true,
            outfile: "dist/examples/game/TowerGame.js",
            platform: "browser",
            target: "es2017",
            format: "iife",
            sourcemap: true,
            minify: false,
            tsconfig: "tsconfig.json",
        });

        // Copy HTML files from source to dist
        const controllerHtmlSrc = path.join(__dirname, "examples", "controller", "TowerController.html");
        const controllerHtmlDest = path.join(controllerDistDir, "TowerController.html");
        fs.copyFileSync(controllerHtmlSrc, controllerHtmlDest);

        const gameHtmlSrc = path.join(__dirname, "examples", "game", "TowerGame.html");
        const gameHtmlDest = path.join(gameDistDir, "TowerGame.html");
        fs.copyFileSync(gameHtmlSrc, gameHtmlDest);

        console.log("✅ Examples built successfully!");
        console.log("📁 Output directory: dist/examples/");
        console.log("   - controller/TowerController.js");
        console.log("   - controller/TowerController.html");
        console.log("   - game/TowerGame.js");
        console.log("   - game/TowerGame.html");
    } catch (error) {
        console.error("❌ Build failed:", error);
        process.exit(1);
    }
}

buildExamples();
