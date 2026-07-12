#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawnSync, exec, spawn } = require('child_process');

const PORT = 8080;
const ROOT = path.join(__dirname, 'dist', 'examples');
const OPEN_PATH = '/controller/TowerController.html';
const WATCH_DIRS = [path.join(__dirname, 'examples'), path.join(__dirname, 'src')];

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

// SSE clients waiting for reload events
const sseClients = new Set();

const notifyClients = () => {
  for (const res of sseClients) {
    res.write('data: reload\n\n');
  }
};

// Live-reload script injected into HTML responses
const RELOAD_SCRIPT = `
<script>
(function() {
  var es = new EventSource('/__livereload');
  es.onmessage = function() { location.reload(); };
  es.onerror = function() { es.close(); };
})();
</script>
</body>`;

// 1. Initial build
const build = () => {
  console.log('Building...');
  const result = spawnSync('node', ['build-examples.js'], {
    stdio: 'inherit',
    cwd: __dirname,
  });
  return result.status === 0;
};

if (!build()) process.exit(1);

// 2. Watch source files and rebuild on change
let rebuildTimer = null;
const scheduleRebuild = (filename) => {
  if (rebuildTimer) return;
  rebuildTimer = setTimeout(() => {
    rebuildTimer = null;
    console.log(`\nChange detected (${filename}), rebuilding...`);
    if (build()) {
      console.log('Build complete — reloading browser.\n');
      notifyClients();
    }
  }, 150); // debounce
};

for (const dir of WATCH_DIRS) {
  if (fs.existsSync(dir)) {
    fs.watch(dir, { recursive: true }, (_event, filename) => {
      // Ignore dist output and hidden files
      if (!filename || filename.includes('dist') || filename.startsWith('.')) return;
      scheduleRebuild(filename);
    });
  }
}

// 3. Serve
const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // SSE endpoint for live reload
  if (urlPath === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(':\n\n'); // initial comment to open connection
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
    return;
  }

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
            res.end(injectReload(data2));
          });
          return;
        }
        res.writeHead(404);
        res.end('Not found');
        return;
      }
      const ext = path.extname(candidate).toLowerCase();
      if (ext === '.html') {
        res.writeHead(200, { 'Content-Type': MIME['.html'] });
        res.end(injectReload(data));
      } else {
        res.writeHead(200, { 'Content-Type': MIME[ext] ?? 'application/octet-stream' });
        res.end(data);
      }
    });
  };

  tryFile(filePath);
});

const injectReload = (buf) => {
  const html = buf.toString('utf8');
  const tag = '</body>';
  const idx = html.toLowerCase().lastIndexOf(tag);
  if (idx === -1) return buf; // no </body>, skip injection
  return Buffer.from(html.slice(0, idx) + RELOAD_SCRIPT + html.slice(idx + tag.length), 'utf8');
};

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://localhost:${PORT}${OPEN_PATH}`;
  console.log(`\nTower Controller running at ${url}`);
  console.log(`Watching: ${WATCH_DIRS.join(', ')}\n   Press Ctrl+C to stop.\n`);

  // 4. Open browser
  const opener =
    process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${opener} "${url}"`);
});
