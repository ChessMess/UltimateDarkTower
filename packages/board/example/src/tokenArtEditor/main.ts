// Token Art Forge — an in-browser editor for the example's per-token art (the
// `example/src/tokenArt/<kind>_tokens.json` files). Pick a kind + token, set its image (used in
// BOTH the 2D map and the 3D billboard) and an optional 3D model, and save. Under `vite dev` it
// saves straight to the JSON files via the dev plugin (example/tokenArtDevPlugin.ts); on the
// static build it falls back to copy / download. Rosters come from the board's re-exported UDT
// data; EVERY token is listed and its default preview is the board library's own resolution
// (foes/adversaries → flat 2D icon, roster heroes → portrait, else the group convention), so the
// Forge always mirrors what the board renders. Editing a token writes a demo override on top.
import './editor.css';
import { HEROES, FOES, ADVERSARY_ROSTER, MONUMENTS, kebab, resolveTokenImageFor } from '../../../src/index';
import type { TokenArt, TokenModelRef, TokenArtRef, BoardView } from '../../../src/index';
import { tokenArt as bundledConfig } from '../tokenArt';
import { highlight } from './helpers';
import { imageSlot } from './imageSlot';
import { modelSlot } from './modelSlot';

type Kind = 'hero' | 'foe' | 'adversary' | 'monument' | 'marker' | 'skull';
interface RosterEntry {
  id: string;
  name: string;
}
type KindMap = Record<string, TokenArt>;
type Config = Record<Kind, KindMap>;
interface Assets {
  images: string[];
  models: string[];
}

const KINDS: { kind: Kind; label: string; roster: RosterEntry[] }[] = [
  { kind: 'hero', label: 'Hero', roster: HEROES.map((h) => ({ id: h.id, name: h.name })) },
  { kind: 'foe', label: 'Foe', roster: FOES.map((f) => ({ id: f.id, name: f.name })) },
  { kind: 'adversary', label: 'Adversary', roster: ADVERSARY_ROSTER.map((a) => ({ id: a.id, name: a.name })) },
  { kind: 'monument', label: 'Monument', roster: MONUMENTS.map((m) => ({ id: m.id, name: m.name })) },
  {
    kind: 'marker',
    label: 'Space marker',
    roster: [
      { id: 'wasteland', name: 'Wasteland' },
      { id: 'power-skull', name: 'Power Skull' },
    ],
  },
  { kind: 'skull', label: 'Skull', roster: [{ id: 'skull', name: 'Skull' }] },
];
const rosterFor = (kind: Kind): RosterEntry[] => KINDS.find((k) => k.kind === kind)!.roster;

// The demo mounts the board with `assetBaseUrl: './tokens/'` (see example/src/main.ts), so a token
// with NO override still renders on the board via the library's built-in default. We preview that
// here so the Forge mirrors the board instead of looking empty.
const ASSET_BASE = './tokens/';

/**
 * The default image the board actually falls back to for a token with no override — delegated to
 * ultimatedarktowerboard's own resolver so the Forge preview always matches the board and can never
 * drift from it. `view` matters: for foes/adversaries the 2D view resolves to the small flat board
 * icon while the 3D view resolves to the larger 3D-style portrait (see `defaultTokenImagePath`), so
 * the 2D slot and 3D slot must each ask for their own view rather than share one fallback. `null`
 * (e.g. an art-less roster hero, or a non-roster id) → no default image.
 */
function conventionImageUrl(kind: Kind, id: string, view: BoardView): string | undefined {
  if (!id) return undefined;
  return resolveTokenImageFor({ kind, id } as TokenArtRef, view, { assetBaseUrl: ASSET_BASE }) ?? undefined;
}

const state = {
  mode: 'static' as 'live' | 'static',
  config: emptyConfig(),
  assets: { images: [], models: [] } as Assets,
  kind: 'foe' as Kind,
  id: '',
};

// The Forge reloads after every "Save to disk" (the written JSON is in Vite's module graph), so the
// current kind+token is stashed in sessionStorage and restored on boot — otherwise each save kicks
// you back to Foe → first token. Per-tab, survives reloads, clears when the tab closes.
const SELECTION_KEY = 'tokenArtForge.selection';

function saveSelection(): void {
  try {
    sessionStorage.setItem(SELECTION_KEY, JSON.stringify({ kind: state.kind, id: state.id }));
  } catch { /* storage disabled — selection just won't persist */ }
}

function loadSelection(): { kind: Kind; id: string } | null {
  try {
    const raw = sessionStorage.getItem(SELECTION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as { kind?: string; id?: string };
    if (p.kind && KINDS.some((k) => k.kind === p.kind)) return { kind: p.kind as Kind, id: p.id ?? '' };
  } catch { /* ignore malformed value */ }
  return null;
}

// Live element references, wired in buildUI().
let tokenSelect: HTMLSelectElement;
let slotGrid: HTMLElement;
let tokenCard: HTMLElement;
let codeToken: HTMLElement;
let codeFile: HTMLElement;
let saveTarget: HTMLElement;
let saveStatus: HTMLElement;
let imgList: HTMLDataListElement;
let modelList: HTMLDataListElement;

void boot();

async function boot(): Promise<void> {
  try {
    const res = await fetch('/__tokenart/state');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as { config: Partial<Config>; assets: Assets };
    state.mode = 'live';
    state.config = buildConfig(data.config);
    state.assets = data.assets ?? { images: [], models: [] };
  } catch {
    state.mode = 'static';
    state.config = buildConfig(bundledConfig as Partial<Config>);
    state.assets = deriveAssets(state.config);
  }
  const saved = loadSelection();
  if (saved) { state.kind = saved.kind; state.id = saved.id; }
  buildUI();
  selectKind(state.kind, saved?.id);
}

function emptyConfig(): Config {
  return { hero: {}, foe: {}, adversary: {}, monument: {}, marker: {}, skull: {} };
}

/**
 * Build the six-kind config with EVERY roster token present, in roster order. An authored override
 * wins; a token without one gets an EMPTY entry ({}) — its default art shows via the slot's dimmed
 * "default" preview (the board library resolves it), and it is not persisted as an override. This
 * keeps saved `<kind>_tokens.json` files to genuine overrides only. Authored ids outside the known
 * roster are preserved defensively.
 */
function buildConfig(raw: Partial<Config> | undefined): Config {
  const out = emptyConfig();
  for (const { kind, roster } of KINDS) {
    const map = (raw?.[kind] ?? {}) as KindMap;
    for (const { id } of roster) {
      out[kind][id] = cleanArt(map[id] ?? map[kebab(id)]) ?? {};
    }
    for (const [id, art] of Object.entries(map)) {
      if (out[kind][id] || roster.some((r) => r.id === id || kebab(r.id) === id)) continue;
      const cleaned = cleanArt(art);
      if (cleaned) out[kind][id] = cleaned;
    }
  }
  return out;
}

/** The kind's genuine overrides only — empty ({}) roster placeholders stripped. Used for the file
 *  JSON panel and for saving, so seeded defaults never get written back as overrides. */
function overridesFor(kind: Kind): KindMap {
  const out: KindMap = {};
  for (const [id, art] of Object.entries(state.config[kind])) {
    const cleaned = cleanArt(art);
    if (cleaned) out[id] = cleaned;
  }
  return out;
}

/** For the static build (no dev server): seed the asset pickers from URLs already in use. */
function deriveAssets(config: Config): Assets {
  const images = new Set<string>();
  const models = new Set<string>();
  for (const map of Object.values(config)) {
    for (const art of Object.values(map)) {
      if (art.image2d) images.add(art.image2d);
      if (art.image3d) images.add(art.image3d);
      const url = modelUrl(art.model3d);
      if (url) models.add(url);
    }
  }
  return { images: [...images].sort(), models: [...models].sort() };
}

function modelUrl(model: TokenModelRef | undefined): string | undefined {
  if (!model) return undefined;
  return typeof model === 'string' ? model : model.url;
}

/**
 * Drop empty fields; return null when nothing remains. A model's `scale`/`rotation`/`dracoDecoderPath`
 * are preserved as pass-through (the card no longer edits them, but the data must round-trip).
 */
function cleanArt(art: TokenArt | undefined): TokenArt | null {
  if (!art) return null;
  const out: TokenArt = {};
  if (art.image2d) out.image2d = art.image2d;
  if (art.image3d) out.image3d = art.image3d;
  const m = typeof art.model3d === 'string' ? { url: art.model3d } : art.model3d;
  if (m?.url) {
    const model: { url: string; scale?: number; rotation?: { x?: number; y?: number; z?: number }; dracoDecoderPath?: string | null } = { url: m.url };
    if (typeof m.scale === 'number' && !Number.isNaN(m.scale)) model.scale = m.scale;
    const r = m.rotation;
    if (r && (r.x || r.y || r.z)) model.rotation = { ...(r.x ? { x: r.x } : {}), ...(r.y ? { y: r.y } : {}), ...(r.z ? { z: r.z } : {}) };
    if ('dracoDecoderPath' in m && m.dracoDecoderPath !== undefined) model.dracoDecoderPath = m.dracoDecoderPath;
    out.model3d = model;
  }
  return out.image2d || out.image3d || out.model3d ? out : null;
}

// ── UI skeleton ───────────────────────────────────────────────────────
function buildUI(): void {
  const forge = document.getElementById('forge')!;
  forge.removeAttribute('aria-busy');
  forge.innerHTML = `
    <header class="forge-header">
      <div>
        <span class="forge-kicker">UltimateDarkTowerBoard</span>
        <h1 class="forge-title">Token Art Forge</h1>
        <p class="forge-sub">Set each token's image (used in the 2D map and as the 3D billboard) and an
          optional 3D model. Blank uses the default <code>tokens/&lt;group&gt;/&lt;id&gt;.png</code> convention.</p>
      </div>
      <div class="forge-header-right">
        <a class="back-link" href="./index.html">← Back to the demo</a>
        <span class="mode-badge ${state.mode === 'live' ? 'is-live' : 'is-static'}" id="modeBadge"></span>
      </div>
    </header>

    <section class="forge-controls">
      <div class="control">
        <label class="control-label" for="kindSelect">Token type</label>
        <select id="kindSelect"></select>
      </div>
      <div class="control">
        <label class="control-label" for="tokenSelect">Token <span id="tokenCount" class="control-label"></span></label>
        <select id="tokenSelect"></select>
      </div>
    </section>

    <section class="slot-grid" id="slotGrid">
      <div class="code code-token" id="tokenCard">
        <div class="code-head">
          <div class="code-titles"><h3 id="codeTokenHead">entry</h3><span class="code-note">just this token</span></div>
          <button class="copy-btn" data-copy="token">Copy</button>
        </div>
        <pre id="codeToken"></pre>
      </div>
    </section>

    <section class="code-wrap">
      <div class="code">
        <div class="code-head">
          <div class="code-titles"><h3 id="codeFileHead">file</h3><span class="code-note">All tokens with the same type (heros/foes/etc)</span></div>
          <button class="copy-btn" data-copy="file">Copy</button>
        </div>
        <pre id="codeFile"></pre>
      </div>
    </section>

    <div class="save-bar">
      <div class="save-target"><span class="save-kicker">writes</span><span id="saveTarget"></span></div>
      <div class="save-status" id="saveStatus"></div>
      <div class="save-actions">
        <button class="btn btn-ghost" id="copyBtn">Copy JSON</button>
        <button class="btn btn-ghost" id="downloadBtn">Download</button>
        <button class="btn btn-primary" id="saveBtn"></button>
      </div>
    </div>

    <datalist id="imgAssets"></datalist>
    <datalist id="modelAssets"></datalist>
  `;

  tokenSelect = forge.querySelector('#tokenSelect')!;
  slotGrid = forge.querySelector('#slotGrid')!;
  tokenCard = forge.querySelector('#tokenCard')!;
  codeToken = forge.querySelector('#codeToken')!;
  codeFile = forge.querySelector('#codeFile')!;
  saveTarget = forge.querySelector('#saveTarget')!;
  saveStatus = forge.querySelector('#saveStatus')!;
  imgList = forge.querySelector('#imgAssets')!;
  modelList = forge.querySelector('#modelAssets')!;

  forge.querySelector<HTMLElement>('#modeBadge')!.textContent =
    state.mode === 'live' ? 'Live — saves to JSON' : 'Preview — copy / download';

  const kindSelect = forge.querySelector<HTMLSelectElement>('#kindSelect')!;
  for (const { kind, label } of KINDS) kindSelect.append(new Option(label, kind));
  kindSelect.value = state.kind;
  kindSelect.addEventListener('change', () => selectKind(kindSelect.value as Kind));
  tokenSelect.addEventListener('change', () => selectToken(tokenSelect.value));

  for (const url of state.assets.images) imgList.append(new Option(url));
  // The 3D card accepts a GLB model OR a flat image, so offer both here (models first).
  for (const url of [...state.assets.models, ...state.assets.images]) modelList.append(new Option(url));

  const saveBtn = forge.querySelector<HTMLButtonElement>('#saveBtn')!;
  saveBtn.textContent = state.mode === 'live' ? 'Save to disk' : 'Download file';
  saveBtn.addEventListener('click', () => (state.mode === 'live' ? void save() : downloadFile()));
  const copyBtn = forge.querySelector<HTMLButtonElement>('#copyBtn')!;
  copyBtn.addEventListener('click', () => void copyText(fileJson(), copyBtn));
  forge.querySelector<HTMLButtonElement>('#downloadBtn')!.addEventListener('click', downloadFile);
  forge.querySelectorAll<HTMLButtonElement>('.copy-btn').forEach((btn) => {
    btn.addEventListener('click', () => void copyText(btn.dataset.copy === 'file' ? fileJson() : tokenJson(), btn));
  });
}

function selectKind(kind: Kind, preferredId?: string): void {
  state.kind = kind;
  const roster = rosterFor(kind);
  const map = state.config[kind];
  tokenSelect.innerHTML = '';
  // Every token now has an entry, so the ● marks the meaningful exception: a token with a 3D model.
  for (const { id, name } of roster) {
    tokenSelect.append(new Option(`${map[id]?.model3d ? '● ' : ''}${name}`, id));
  }
  const count = roster.filter((r) => map[r.id]?.model3d).length;
  document.getElementById('tokenCount')!.textContent = count ? `· ${count} with a 3D model` : '';
  saveTarget.textContent = `src/tokenArt/${kind}_tokens.json`;
  // Restore a remembered token when it still exists; otherwise land on the first.
  const first = roster[0]?.id ?? '';
  const target = preferredId && roster.some((r) => r.id === preferredId) ? preferredId : first;
  tokenSelect.value = target;
  selectToken(target);
}

function selectToken(id: string): void {
  state.id = id;
  saveSelection();
  renderSlots();
  refreshCode();
  setStatus('');
}

// ── art slots ─────────────────────────────────────────────────────────
function entry(): TokenArt {
  return state.config[state.kind][state.id] ?? {};
}

/**
 * Apply a mutation to a draft of the current entry, then persist. The key is always kept (even when
 * empty) so the file keeps listing every token; a cleared token just renders via the convention.
 */
function update(mutate: (draft: TokenArt) => void): void {
  const cur = entry();
  const m = cur.model3d;
  const draft: TokenArt = {
    image2d: cur.image2d,
    image3d: cur.image3d,
    model3d: m === undefined ? undefined : typeof m === 'string' ? { url: m } : { ...m, rotation: m.rotation ? { ...m.rotation } : undefined },
  };
  mutate(draft);
  state.config[state.kind][state.id] = cleanArt(draft) ?? {};
  refreshCode();
  refreshTokenBadge();
  setStatus('');
}

function renderSlots(): void {
  const e = entry();
  const fallback2d = conventionImageUrl(state.kind, state.id, '2d');
  // The image the 3D view shows when there's no model: the token's own image, else the 3D-view
  // convention (which differs from the 2D one for foes/adversaries — see conventionImageUrl).
  const fallback3d = conventionImageUrl(state.kind, state.id, '3d');
  const billboard = e.image2d ?? fallback3d;
  // The persistent per-token JSON panel rides in the third cell (where the 3D-model card used to be).
  slotGrid.replaceChildren(
    imageSlot('2D View', 'tag-2d', 'IMG', e.image2d, fallback2d, (v) => update((d) => (d.image2d = v))),
    modelSlot(e.model3d, e.image3d, billboard, update),
    tokenCard,
  );
}

// ── code panels + status ──────────────────────────────────────────────
function tokenJson(): string {
  const e = cleanArt(state.config[state.kind][state.id]);
  return e ? JSON.stringify({ [state.id]: e }, null, 2) : '// no override — uses the board library default';
}

function fileJson(): string {
  return JSON.stringify(overridesFor(state.kind), null, 2);
}

function refreshCode(): void {
  document.getElementById('codeTokenHead')!.textContent = `${state.kind} · ${state.id}`;
  document.getElementById('codeFileHead')!.textContent = `${state.kind}_tokens.json`;
  codeToken.innerHTML = highlight(tokenJson());
  codeFile.innerHTML = highlight(fileJson());
}

function refreshTokenBadge(): void {
  const map = state.config[state.kind];
  const opt = tokenSelect.selectedOptions[0];
  if (opt) {
    const name = rosterFor(state.kind).find((r) => r.id === state.id)?.name ?? state.id;
    opt.text = `${map[state.id]?.model3d ? '● ' : ''}${name}`;
  }
  const count = rosterFor(state.kind).filter((r) => map[r.id]?.model3d).length;
  document.getElementById('tokenCount')!.textContent = count ? `· ${count} with a 3D model` : '';
}

function setStatus(text: string, kind: '' | 'ok' | 'err' = ''): void {
  saveStatus.textContent = text;
  saveStatus.className = `save-status ${kind}`;
}

// ── persistence ───────────────────────────────────────────────────────
async function save(): Promise<void> {
  setStatus('Saving…');
  try {
    const res = await fetch('/__tokenart/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: state.kind, tokens: overridesFor(state.kind) }),
    });
    const data = (await res.json()) as { ok?: boolean; file?: string; error?: string };
    if (!res.ok || !data.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
    setStatus(`Saved ${data.file} ✓`, 'ok');
  } catch (err) {
    setStatus(`Save failed: ${String(err)} — use Copy / Download`, 'err');
  }
}

function downloadFile(): void {
  const blob = new Blob([`${fileJson()}\n`], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${state.kind}_tokens.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  setStatus(`Downloaded ${state.kind}_tokens.json — drop it in example/src/tokenArt/`, 'ok');
}

async function copyText(text: string, btn: HTMLElement): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    const prev = btn.textContent;
    btn.textContent = 'Copied ✓';
    setTimeout(() => (btn.textContent = prev), 1200);
  } catch {
    setStatus('Clipboard blocked — select the code and copy manually', 'err');
  }
}


