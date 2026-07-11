// 2D Token Designer — a companion tool to the Token Art Forge. Where the Forge assigns per-token
// art URLs, the Designer COMPOSES a token: pick or upload a background at the shipped foe-token
// size (256×222), overlay freely movable / resizable / rotatable text fields (name, strength,
// attack-type, foe-type, or custom), then save the editable project (JSON) and export a finished
// PNG. A dirty-guard warns before losing unsaved edits. Backgrounds come from the board's own foe/
// adversary art (via the Forge dev endpoint, or the re-exported UDT rosters on the static build).
import '../tokenArtEditor/editor.css';
import './designer.css';
import { FOES, ADVERSARY_ROSTER, resolveTokenImageFor } from '../../../src/index';
import type { TokenArtRef } from '../../../src/index';
import { createCanvas } from './canvas';
import type { DesignCanvas } from './canvas';
import { FONT_OPTIONS, newDesign, newFieldId, makeBackground, CANVAS_W, CANVAS_H, MIN_CANVAS, MAX_CANVAS } from './types';
import type { Align, TextField } from './types';
import { saveProject, loadProject, readImageFile, exportPng, fileBase } from './io';

const ASSET_BASE = './tokens/';

interface BgOption {
  url: string;
  label: string;
}

const state = {
  design: newDesign(),
  selectedId: null as string | null,
  savedJson: '',
  backgrounds: [] as BgOption[],
};

let canvas: DesignCanvas;
let inspector: HTMLElement; // left column: Canvas + Token
let fieldsPanel: HTMLElement; // right column: Text fields
let statusEl: HTMLElement;
let dirtyBadge: HTMLElement;
// Numeric inputs the canvas drags write back into live, so a drag updates the inspector in place.
const liveInputs: Partial<Record<'x' | 'y' | 'fontSize' | 'rotation', HTMLInputElement>> = {};

boot();

function boot(): void {
  state.backgrounds = loadBackgrounds();
  buildUI();
  markSaved();
  window.addEventListener('beforeunload', (e) => {
    if (isDirty()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });
}

// ── background sources ───────────────────────────────────────────────────
/**
 * Foe/adversary art the user can drop behind a token, resolved through the board library's own
 * `resolveTokenImageFor` (the same resolver the board renders with) so the URLs always match what
 * ships under example/public/tokens. Each roster token offers its flat 2D icon (which already bakes
 * in text — handy as a re-texting base) and its larger portrait ("art", a clean text-free base).
 * Works identically in dev and the static build; for anything else the user can Upload an image.
 */
function loadBackgrounds(): BgOption[] {
  const out = new Map<string, string>(); // url → label
  const roster: { ref: TokenArtRef; name: string }[] = [
    ...FOES.map((f) => ({ ref: { kind: 'foe', id: f.id } as TokenArtRef, name: f.name })),
    ...ADVERSARY_ROSTER.map((a) => ({ ref: { kind: 'adversary', id: a.id } as TokenArtRef, name: a.name })),
  ];
  for (const { ref, name } of roster) {
    const art = resolveTokenImageFor(ref, '3d', { assetBaseUrl: ASSET_BASE });
    const icon = resolveTokenImageFor(ref, '2d', { assetBaseUrl: ASSET_BASE });
    if (art) out.set(art, `${name} (art)`);
    if (icon && icon !== art) out.set(icon, `${name} (token)`);
  }
  return [...out.entries()].map(([url, label]) => ({ url, label })).sort((a, b) => a.label.localeCompare(b.label));
}

// ── dirty tracking ─────────────────────────────────────────────────────────
function isDirty(): boolean {
  return JSON.stringify(state.design) !== state.savedJson;
}
function markSaved(): void {
  state.savedJson = JSON.stringify(state.design);
  refreshDirty();
}
function refreshDirty(): void {
  if (!dirtyBadge) return;
  const dirty = isDirty();
  dirtyBadge.textContent = dirty ? 'Unsaved changes' : 'Saved';
  dirtyBadge.className = `td-dirty ${dirty ? 'is-dirty' : 'is-clean'}`;
}
/** Any mutation of the design routes through here so dirty state stays honest. */
function touched(): void {
  refreshDirty();
}

// ── UI ───────────────────────────────────────────────────────────────────
function buildUI(): void {
  const el = document.getElementById('designer')!;
  el.removeAttribute('aria-busy');
  el.innerHTML = `
    <header class="forge-header">
      <div>
        <span class="forge-kicker">UltimateDarkTowerBoard</span>
        <h1 class="forge-title">Token Designer</h1>
        <nav class="forge-tabs">
          <a class="forge-tab" href="./tokens.html">Art Forge</a>
          <span class="forge-tab is-active">Token Designer</span>
          <a class="forge-tab" href="./location-marker.html">Location Marker</a>
        </nav>
      </div>
      <div class="forge-header-right">
        <a class="back-link" href="./index.html">← Back to the demo</a>
      </div>
      <p class="forge-sub">Compose a 2D token: choose a background, then place and edit text fields.
        Move, resize and rotate each field, save your project, and export a PNG at the token's native
        pixel size.</p>
    </header>

    <section class="td-work">
      <aside class="td-inspector" id="inspector"></aside>
      <div class="td-stage-wrap">
        <div class="td-stage-host" id="stageHost"></div>
        <p class="td-hint">The canvas is shown enlarged for editing — the token's true pixel size is
          set in the <strong>Canvas</strong> panel and is what gets exported. Click a field to select
          it, then drag to move, or use the corner / top handles to resize &amp; rotate.</p>
      </div>
      <aside class="td-inspector td-fields-col" id="fieldsPanel"></aside>
    </section>

    <div class="save-bar">
      <div class="save-target"><span class="save-kicker">token</span><span id="tdDirty" class="td-dirty is-clean">Saved</span></div>
      <div class="save-status" id="tdStatus"></div>
      <div class="save-actions">
        <button class="btn btn-ghost" id="btnNew">New</button>
        <button class="btn btn-ghost" id="btnLoad">Load</button>
        <button class="btn btn-ghost" id="btnSave">Save Project</button>
        <button class="btn btn-primary" id="btnExport">Export PNG</button>
      </div>
    </div>
  `;

  statusEl = el.querySelector('#tdStatus')!;
  dirtyBadge = el.querySelector('#tdDirty')!;
  inspector = el.querySelector('#inspector')!;
  fieldsPanel = el.querySelector('#fieldsPanel')!;

  ensureSelection(); // start with the first field selected

  canvas = createCanvas({
    getDesign: () => state.design,
    getSelectedId: () => state.selectedId,
    onSelect: select,
    onFieldChange: (commit) => {
      syncLiveInputs();
      touched();
      if (commit) refreshDirty();
    },
    onBackgroundChange: (commit) => {
      touched();
      // After a pan gesture, rebuild the inspector so its Offset fields show the new values.
      if (commit) renderInspector();
    },
  });
  el.querySelector('#stageHost')!.appendChild(canvas.root);

  el.querySelector('#btnNew')!.addEventListener('click', onNew);
  el.querySelector('#btnLoad')!.addEventListener('click', () => void onLoad());
  el.querySelector('#btnSave')!.addEventListener('click', onSave);
  el.querySelector('#btnExport')!.addEventListener('click', () => void onExport());

  renderInspector();
  // Delete removes the selected field (unless the user is typing in an input).
  window.addEventListener('keydown', (e) => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedId && !isTyping()) {
      e.preventDefault();
      deleteSelected();
    }
  });
}

function isTyping(): boolean {
  const a = document.activeElement;
  return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
}

function selectedField(): TextField | undefined {
  return state.design.fields.find((f) => f.id === state.selectedId);
}

function select(id: string | null): void {
  // Never leave the token with nothing selected while fields exist (e.g. clicking the empty canvas).
  if (id === null && state.design.fields.length > 0) return;
  state.selectedId = id;
  canvas.refresh();
  renderInspector();
}

/** Keep one field selected whenever any exist, so the Text fields panel always shows an editor. */
function ensureSelection(): void {
  const { fields } = state.design;
  if (!fields.some((f) => f.id === state.selectedId)) {
    state.selectedId = fields[0]?.id ?? null;
  }
}

function syncLiveInputs(): void {
  const f = selectedField();
  if (!f) return;
  if (liveInputs.x) liveInputs.x.value = String(Math.round(f.x));
  if (liveInputs.y) liveInputs.y.value = String(Math.round(f.y));
  if (liveInputs.fontSize) liveInputs.fontSize.value = String(Math.round(f.fontSize));
  if (liveInputs.rotation) liveInputs.rotation.value = String(Math.round(f.rotation));
}

// ── inspector ──────────────────────────────────────────────────────────────
function renderInspector(): void {
  liveInputs.x = liveInputs.y = liveInputs.fontSize = liveInputs.rotation = undefined;
  inspector.replaceChildren(designSection(), canvasSection()); // left column: Token above Canvas
  fieldsPanel.replaceChildren(fieldsSection()); // right column
}

/** Token pixel size — a live readout plus width/height entry. The on-screen stage is enlarged for
 *  editing, so this is the authoritative size (and exactly what Export PNG produces). */
function canvasSection(): HTMLElement {
  const sec = section('Canvas');

  const readout = document.createElement('p');
  readout.className = 'td-size-readout';
  const renderSize = (): void => {
    readout.innerHTML = `Token size: <strong>${state.design.canvas.width} × ${state.design.canvas.height} px</strong>`;
  };
  renderSize();
  sec.appendChild(readout);

  const note = document.createElement('p');
  note.className = 'td-inline-hint';
  note.textContent = 'Exports at exactly this size. The canvas is drawn enlarged for easier editing.';
  sec.appendChild(note);

  const applySize = (w: number, h: number): void => {
    state.design.canvas.width = w;
    state.design.canvas.height = h;
    renderSize();
    canvas.refresh();
    touched();
  };

  const row = twoCol(sec);
  labeledInput(row, 'Width px', 'number', String(state.design.canvas.width), (v) =>
    applySize(clampNum(v, MIN_CANVAS, MAX_CANVAS, state.design.canvas.width), state.design.canvas.height)
  );
  labeledInput(row, 'Height px', 'number', String(state.design.canvas.height), (v) =>
    applySize(state.design.canvas.width, clampNum(v, MIN_CANVAS, MAX_CANVAS, state.design.canvas.height))
  );

  sec.appendChild(
    button(`Reset to foe-token size (${CANVAS_W}×${CANVAS_H})`, 'btn-link td-full', () => {
      applySize(CANVAS_W, CANVAS_H);
      renderInspector();
    })
  );
  return sec;
}

function designSection(): HTMLElement {
  const sec = section('Token');
  const nameInput = labeledInput(sec, 'Name / filename', 'text', state.design.name, (v) => {
    state.design.name = v;
    touched();
  });
  nameInput.placeholder = 'foe-token';

  // Background picker.
  const bgField = document.createElement('div');
  bgField.className = 'field';
  const bgLabel = document.createElement('label');
  bgLabel.textContent = 'Background';
  const select = document.createElement('select');
  select.append(new Option('— none —', ''));
  const custom = state.design.background?.kind === 'custom';
  if (custom) {
    const o = new Option(`custom: ${state.design.background?.label ?? 'uploaded'}`, '__custom__');
    o.selected = true;
    select.append(o);
  }
  for (const bg of state.backgrounds) {
    const o = new Option(bg.label, bg.url);
    if (!custom && state.design.background?.src === bg.url) o.selected = true;
    select.append(o);
  }
  select.addEventListener('change', () => {
    if (select.value === '' ) {
      state.design.background = null;
    } else if (select.value !== '__custom__') {
      const bg = state.backgrounds.find((b) => b.url === select.value);
      state.design.background = makeBackground('library', select.value, bg?.label);
    }
    canvas.refresh();
    renderInspector();
    touched();
  });
  bgField.append(bgLabel, select);
  sec.appendChild(bgField);

  // Upload + clear row.
  const row = document.createElement('div');
  row.className = 'td-btn-row';
  const upload = button('Upload image…', 'btn btn-ghost', () => pickImage());
  const clear = button('Clear', 'btn btn-ghost', () => {
    state.design.background = null;
    canvas.refresh();
    renderInspector();
    touched();
  });
  row.append(upload, clear);
  sec.appendChild(row);

  // Background sizing (fit / zoom / pan) — only meaningful once an image is set.
  const activeBg = state.design.background;
  if (activeBg) {
    const w = state.design.canvas.width;
    const h = state.design.canvas.height;

    labeledSelect(
      sec,
      'Image fit',
      [
        { label: 'Cover (fill token)', value: 'cover' },
        { label: 'Contain (whole image)', value: 'contain' },
      ],
      activeBg.fit,
      (v) => {
        activeBg.fit = v === 'contain' ? 'contain' : 'cover';
        canvas.refresh();
        touched();
      }
    );

    // Zoom slider (25%–400%), label reflects the live value.
    const scaleField = document.createElement('div');
    scaleField.className = 'field';
    const scaleLabel = document.createElement('label');
    const scalePct = (): string => `Zoom (${Math.round(activeBg.scale * 100)}% of fit)`;
    scaleLabel.textContent = scalePct();
    const range = document.createElement('input');
    range.type = 'range';
    range.min = '25';
    range.max = '400';
    range.step = '1';
    range.value = String(Math.round(activeBg.scale * 100));
    range.addEventListener('input', () => {
      activeBg.scale = Number(range.value) / 100;
      scaleLabel.textContent = scalePct();
      canvas.refresh();
      touched();
    });
    scaleField.append(scaleLabel, range);
    sec.appendChild(scaleField);

    // Pan offsets (also driven live by dragging the image on the canvas).
    const offRow = twoCol(sec);
    labeledInput(offRow, 'Offset X', 'number', String(Math.round(activeBg.offsetX)), (v) => {
      activeBg.offsetX = clampNum(v, -w, w, activeBg.offsetX);
      canvas.refresh();
      touched();
    });
    labeledInput(offRow, 'Offset Y', 'number', String(Math.round(activeBg.offsetY)), (v) => {
      activeBg.offsetY = clampNum(v, -h, h, activeBg.offsetY);
      canvas.refresh();
      touched();
    });

    const reset = button('Reset image size & position', 'btn-link td-full', () => {
      activeBg.fit = 'cover';
      activeBg.scale = 1;
      activeBg.offsetX = 0;
      activeBg.offsetY = 0;
      canvas.refresh();
      renderInspector();
      touched();
    });
    sec.appendChild(reset);

    const dragHint = document.createElement('p');
    dragHint.className = 'td-inline-hint';
    dragHint.textContent = 'Tip: drag the image on the canvas to reposition it.';
    sec.appendChild(dragHint);
  }

  return sec;
}

function fieldsSection(): HTMLElement {
  const sec = section('Text fields');

  const add = button('+ Add text field', 'btn btn-ghost td-full', () => {
    const f: TextField = {
      id: newFieldId(),
      text: 'TEXT',
      x: state.design.canvas.width / 2,
      y: state.design.canvas.height / 2,
      fontSize: 18,
      rotation: 0,
      color: '#f4ecdd',
      align: 'middle',
      fontFamily: FONT_OPTIONS[0].value,
      bold: true,
    };
    state.design.fields.push(f);
    select(f.id);
    touched();
  });
  sec.appendChild(add);

  // Field list.
  const list = document.createElement('div');
  list.className = 'td-field-list';
  for (const f of state.design.fields) {
    const chip = document.createElement('button');
    chip.className = `td-chip${f.id === state.selectedId ? ' is-selected' : ''}`;
    chip.textContent = f.text || '(empty)';
    chip.addEventListener('click', () => select(f.id));
    list.appendChild(chip);
  }
  sec.appendChild(list);

  const f = selectedField();
  if (!f) {
    const none = document.createElement('p');
    none.className = 'td-inline-hint';
    none.textContent = 'Select a field to edit it.';
    sec.appendChild(none);
    return sec;
  }

  labeledInput(sec, 'Text', 'text', f.text, (v) => {
    f.text = v;
    canvas.refresh();
    // keep the chip label in sync without stealing focus from the text box
    const chip = list.querySelector<HTMLButtonElement>('.td-chip.is-selected');
    if (chip) chip.textContent = v || '(empty)';
    touched();
  });

  // Font + weight row.
  const fontRow = twoCol(sec);
  labeledSelect(fontRow, 'Font', FONT_OPTIONS, f.fontFamily, (v) => {
    f.fontFamily = v;
    canvas.refresh();
    touched();
  });
  labeledSelect(
    fontRow,
    'Weight',
    [
      { label: 'Bold', value: 'bold' },
      { label: 'Regular', value: 'regular' },
    ],
    f.bold ? 'bold' : 'regular',
    (v) => {
      f.bold = v === 'bold';
      canvas.refresh();
      touched();
    }
  );

  // Size + rotation row.
  const sizeRow = twoCol(sec);
  liveInputs.fontSize = labeledInput(sizeRow, 'Size', 'number', String(Math.round(f.fontSize)), (v) => {
    f.fontSize = clampNum(v, 4, 200, f.fontSize);
    canvas.refresh();
    touched();
  });
  liveInputs.rotation = labeledInput(sizeRow, 'Rotation°', 'number', String(Math.round(f.rotation)), (v) => {
    f.rotation = clampNum(v, -360, 360, f.rotation);
    canvas.refresh();
    touched();
  });

  // X + Y row.
  const posRow = twoCol(sec);
  liveInputs.x = labeledInput(posRow, 'X', 'number', String(Math.round(f.x)), (v) => {
    f.x = clampNum(v, -200, state.design.canvas.width + 200, f.x);
    canvas.refresh();
    touched();
  });
  liveInputs.y = labeledInput(posRow, 'Y', 'number', String(Math.round(f.y)), (v) => {
    f.y = clampNum(v, -200, state.design.canvas.height + 200, f.y);
    canvas.refresh();
    touched();
  });

  // Align + color row.
  const styleRow = twoCol(sec);
  labeledSelect(
    styleRow,
    'Align',
    [
      { label: 'Left', value: 'start' },
      { label: 'Center', value: 'middle' },
      { label: 'Right', value: 'end' },
    ],
    f.align,
    (v) => {
      f.align = v as Align;
      canvas.refresh();
      touched();
    }
  );
  labeledInput(styleRow, 'Color', 'color', f.color, (v) => {
    f.color = v;
    canvas.refresh();
    touched();
  });

  const del = document.createElement('button');
  del.className = 'btn btn-ghost td-full td-delete';
  del.innerHTML =
    '<svg class="td-icon" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<polyline points="3 6 5 6 21 6"></polyline>' +
    '<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>' +
    '<line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>' +
    '<span>Delete field</span>';
  del.addEventListener('click', deleteSelected);
  sec.appendChild(del);
  return sec;
}

function deleteSelected(): void {
  if (!state.selectedId) return;
  state.design.fields = state.design.fields.filter((f) => f.id !== state.selectedId);
  ensureSelection(); // select the next remaining field (or none if the list is now empty)
  canvas.refresh();
  renderInspector();
  touched();
}

// ── background upload ────────────────────────────────────────────────────
function pickImage(): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    if (!file) return;
    void readImageFile(file)
      .then((src) => {
        state.design.background = makeBackground('custom', src, file.name);
        canvas.refresh();
        renderInspector();
        touched();
        setStatus(`Loaded background: ${file.name}`, 'ok');
      })
      .catch((err) => setStatus(`Image failed: ${String(err)}`, 'err'));
  });
  input.click();
}

// ── save-bar actions ───────────────────────────────────────────────────────
function onNew(): void {
  if (isDirty() && !confirm('Discard unsaved changes and start a new token?')) return;
  state.design = newDesign();
  ensureSelection();
  canvas.refresh();
  renderInspector();
  markSaved();
  setStatus('New token started', 'ok');
}

async function onLoad(): Promise<void> {
  if (isDirty() && !confirm('Discard unsaved changes and load a token project?')) return;
  try {
    const design = await loadProject();
    state.design = design;
    ensureSelection();
    canvas.refresh();
    renderInspector();
    markSaved();
    setStatus(`Loaded ${fileBase(design.name)}.token.json`, 'ok');
  } catch (err) {
    setStatus(`Load failed: ${String(err)}`, 'err');
  }
}

function onSave(): void {
  saveProject(state.design);
  markSaved();
  setStatus(`Saved ${fileBase(state.design.name)}.token.json`, 'ok');
}

async function onExport(): Promise<void> {
  setStatus('Rendering PNG…');
  try {
    await document.fonts?.ready;
    await exportPng(state.design, canvas.svg);
    const { width, height } = state.design.canvas;
    setStatus(`Exported ${fileBase(state.design.name)}.png (${width}×${height})`, 'ok');
  } catch (err) {
    setStatus(`Export failed: ${String(err)}`, 'err');
  }
}

function setStatus(text: string, kind: '' | 'ok' | 'err' = ''): void {
  statusEl.textContent = text;
  statusEl.className = `save-status ${kind}`;
}

// ── small DOM helpers ────────────────────────────────────────────────────
function section(title: string): HTMLElement {
  const s = document.createElement('section');
  s.className = 'td-section';
  const h = document.createElement('h2');
  h.className = 'td-section-title';
  h.textContent = title;
  s.appendChild(h);
  return s;
}

function twoCol(parent: HTMLElement): HTMLElement {
  const row = document.createElement('div');
  row.className = 'field-row';
  parent.appendChild(row);
  return row;
}

function labeledInput(
  parent: HTMLElement,
  label: string,
  type: string,
  value: string,
  onChange: (v: string) => void
): HTMLInputElement {
  const field = document.createElement('div');
  field.className = 'field';
  const l = document.createElement('label');
  l.textContent = label;
  const input = document.createElement('input');
  input.type = type;
  input.value = value;
  const evt = type === 'text' || type === 'number' || type === 'color' ? 'input' : 'change';
  input.addEventListener(evt, () => onChange(input.value));
  field.append(l, input);
  parent.appendChild(field);
  return input;
}

function labeledSelect(
  parent: HTMLElement,
  label: string,
  options: { label: string; value: string }[],
  value: string,
  onChange: (v: string) => void
): HTMLSelectElement {
  const field = document.createElement('div');
  field.className = 'field';
  const l = document.createElement('label');
  l.textContent = label;
  const sel = document.createElement('select');
  for (const o of options) {
    const opt = new Option(o.label, o.value);
    if (o.value === value) opt.selected = true;
    sel.append(opt);
  }
  sel.addEventListener('change', () => onChange(sel.value));
  field.append(l, sel);
  parent.appendChild(field);
  return sel;
}

function button(label: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function clampNum(raw: string, min: number, max: number, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
