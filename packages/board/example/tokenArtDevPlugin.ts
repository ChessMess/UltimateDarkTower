// Dev-only Vite middleware backing the Token Art Forge tool (example/src/tokenArtEditor).
// It is the small "server" that lets the in-browser editor READ the on-disk per-kind JSON +
// list the art files under example/public, and WRITE a kind's `<kind>_tokens.json` back to disk
// so the example's defaults can be edited as more art arrives.
//
// `apply: 'serve'` → it exists only under `vite dev`; the static GitHub-Pages build has no such
// endpoint, and the editor falls back to copy/download there. Routes live under `/__tokenart/*`,
// which never collide with the app's own assets.
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';
import { promises as fs } from 'fs';
import { resolve, relative, sep } from 'path';

/** The token kinds with a `<kind>_tokens.json` file — the only paths this plugin will write. */
const KINDS = ['hero', 'foe', 'adversary', 'monument', 'marker', 'quest', 'skull'] as const;
const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg', '.gif', '.svg', '.avif']);
const MODEL_EXT = new Set(['.glb', '.gltf']);

export function tokenArtDevPlugin(opts: { exampleDir: string }): Plugin {
  const tokenArtDir = resolve(opts.exampleDir, 'src/tokenArt');
  const publicDir = resolve(opts.exampleDir, 'public');
  const fileFor = (kind: string): string => resolve(tokenArtDir, `${kind}_tokens.json`);

  return {
    name: 'udt-token-art-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__tokenart/state', (req, res, next) => {
        if (req.method !== 'GET') return next();
        void (async (): Promise<void> => {
          try {
            const config: Record<string, unknown> = {};
            for (const kind of KINDS) config[kind] = await readJson(fileFor(kind));
            const assets = await listAssets(publicDir);
            sendJson(res, 200, { config, assets });
          } catch (err) {
            sendJson(res, 500, { error: String(err) });
          }
        })();
      });

      server.middlewares.use('/__tokenart/save', (req, res, next) => {
        if (req.method !== 'POST') return next();
        void (async (): Promise<void> => {
          try {
            const { kind, tokens } = JSON.parse(await readBody(req)) as {
              kind?: string;
              tokens?: unknown;
            };
            if (!kind || !(KINDS as readonly string[]).includes(kind)) {
              sendJson(res, 400, { error: `unknown or missing kind: ${String(kind)}` });
              return;
            }
            const json = `${JSON.stringify(tokens ?? {}, null, 2)}\n`;
            await fs.writeFile(fileFor(kind), json, 'utf8');
            sendJson(res, 200, { ok: true, file: `src/tokenArt/${kind}_tokens.json` });
          } catch (err) {
            sendJson(res, 500, { error: String(err) });
          }
        })();
      });
    },
  };
}

/** Parse a JSON file, returning `{}` when it is missing or empty. */
async function readJson(file: string): Promise<unknown> {
  try {
    const text = await fs.readFile(file, 'utf8');
    return text.trim() ? JSON.parse(text) : {};
  } catch {
    return {};
  }
}

/** Recursively list public art as web URLs (relative to the served root, with a leading `./`). */
async function listAssets(dir: string): Promise<{ images: string[]; models: string[] }> {
  const images: string[] = [];
  const models: string[] = [];
  async function walk(current: string): Promise<void> {
    let entries: import('fs').Dirent[];
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = resolve(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        const ext = entry.name.slice(entry.name.lastIndexOf('.')).toLowerCase();
        const url = `./${relative(dir, full).split(sep).join('/')}`;
        if (IMAGE_EXT.has(ext)) images.push(url);
        else if (MODEL_EXT.has(ext)) models.push(url);
      }
    }
  }
  await walk(dir);
  images.sort();
  models.sort();
  return { images, models };
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => resolvePromise(body));
    req.on('error', reject);
  });
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
