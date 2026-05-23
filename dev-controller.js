#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync, exec } = require('child_process');

const PORT = 8080;
const ROOT = path.join(__dirname, 'dist', 'examples');
const OPEN_PATH = '/controller/TowerController.html';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.map': 'application/json',
    '.css': 'text/css; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.glb': 'model/gltf-binary',
    '.ico': 'image/x-icon',
};

// 1. Build
console.log('Rebuilding examples...');
const result = spawnSync('node', ['build-examples.js'], {
    stdio: 'inherit',
    cwd: __dirname,
});
if (result.status !== 0) {
    process.exit(result.status ?? 1);
}

// 2. Serve
const server = http.createServer((req, res) => {
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/' || urlPath === '') {
        res.writeHead(302, { Location: OPEN_PATH });
        res.end();
        return;
    }

    const filePath = path.join(ROOT, urlPath);

    // Prevent path traversal
    if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    const tryFile = (candidate) => {
        fs.readFile(candidate, (err, data) => {
            if (err) {
                // Fall back to <path>.html when the URL has no extension
                if (!path.extname(candidate)) {
                    fs.readFile(candidate + '.html', (err2, data2) => {
                        if (err2) {
                            res.writeHead(404);
                            res.end('Not found');
                            return;
                        }
                        res.writeHead(200, { 'Content-Type': MIME['.html'] });
                        res.end(data2);
                    });
                    return;
                }
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const ext = path.extname(candidate).toLowerCase();
            res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
            res.end(data);
        });
    };

    tryFile(filePath);
});

server.listen(PORT, '127.0.0.1', () => {
    const url = `http://localhost:${PORT}${OPEN_PATH}`;
    console.log(`\nTower Controller running at ${url}\n   Press Ctrl+C to stop.\n`);

    // 3. Open browser
    const opener =
        process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'start'
              : 'xdg-open';
    exec(`${opener} "${url}"`);
});
