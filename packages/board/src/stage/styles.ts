// Stage CSS, mirroring Display's `TOWER_DISPLAY_CSS` pattern: a string export plus
// an idempotent injector. Scoped under `.bsv-root` and themeable — every colour reads
// a `--bsv-*` variable that falls back to the host's theme token (e.g. `--accent`) and
// then to a sensible default, so the stage looks right standalone and themes when the
// host defines those tokens. Covers the render panes/modes, PiP chrome, the on-map
// Spin/Pan + focus bars, the dockable editing UI (mountBoardUI injects no CSS of its
// own), and the pop-out window. Pass `injectStyles: false` to supply your own.

export const BOARD_STAGE_CSS = `
.bsv-root {
  --bsv-bg: var(--bg, #0b0a09);
  --bsv-panel-bg: var(--bg-panel, #110d0a);
  --bsv-glass: var(--bg-glass, rgba(11, 9, 5, 0.82));
  --bsv-input: var(--bg-input, #0d0a07);
  --bsv-border: var(--border-dim, rgba(122, 85, 32, 0.35));
  --bsv-border-gold: var(--border-gold, #7a5520);
  --bsv-text: var(--text, #e8d4ae);
  --bsv-text-dim: var(--text-dim, #a88f6c);
  --bsv-text-mono: var(--text-mono, #d4c48a);
  --bsv-accent: var(--accent, #c87020);
  --bsv-lume: var(--lume, #f0c060);
  --bsv-radius: var(--radius, 4px);
  --bsv-radius-card: var(--radius-card, 6px);

  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  width: 100%;
  height: 100%;
  min-height: 0;
  box-sizing: border-box;
}
.bsv-root *,
.bsv-root *::before,
.bsv-root *::after { box-sizing: border-box; }

/* ── Toolbar (mode pills + actions) ─────────────────────────────────────── */
.bsv-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}
.bsv-toolbar-right { display: inline-flex; gap: 0.4rem; align-items: center; }

.bsv-pills {
  position: relative;
  display: inline-flex;
  background: var(--bsv-panel-bg);
  border: 1px solid var(--bsv-border-gold);
  border-radius: 4px;
  overflow: hidden;
}
.bsv-pill {
  flex: 1 1 0;
  text-align: center;
  white-space: nowrap;
  border: none;
  border-right: 1px solid var(--bsv-border);
  border-radius: 0;
  background: transparent;
  color: var(--bsv-text);
  font: inherit;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 0.45rem 1.1rem;
  cursor: pointer;
  transition: color 180ms, background 180ms;
}
.bsv-pill:last-child { border-right: none; }
.bsv-pill:hover { background: rgba(200, 112, 32, 0.08); }
.bsv-pill.is-active {
  background: linear-gradient(180deg, #2a2010 0%, #1a1608 100%);
  color: var(--bsv-lume);
}

.bsv-action {
  background: transparent;
  border: 1px solid var(--bsv-border);
  color: var(--bsv-text);
  font: inherit;
  font-size: 0.68rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.4rem 0.75rem;
  border-radius: 3px;
  cursor: pointer;
  transition: color 150ms, background 150ms, border-color 150ms;
}
.bsv-action:hover { background: rgba(200, 112, 32, 0.08); border-color: var(--bsv-accent); color: var(--bsv-lume); }
.bsv-action[hidden] { display: none; }
.bsv-action.is-active { border-color: var(--bsv-accent); color: var(--bsv-lume); }

/* When the 3D tower is off the stage is 2D-only: there is no mode choice and the
   Overhead/Isometric tilt is inert, so hide the mode switcher + the angle group.
   (The Tower 3D toggle stays visible so the tower can be turned back on.) */
.bsv-root:not(.bsv-tower-on) .bsv-pills { display: none; }

/* ── Render panel + panes + modes ───────────────────────────────────────── */
.bsv-panel {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
  background: var(--bsv-panel-bg);
  border: 1px solid var(--bsv-border-gold);
  border-radius: var(--bsv-radius);
}
/* Editing-UI host overlays the whole stage; empty areas pass clicks through. */
.bsv-overlay { position: absolute; inset: 0; z-index: 5; pointer-events: none; }

.bsv-pane {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #0b0a09;
}
/* 2D pane stacks a control bar above the map. */
.bsv-pane-2d { flex-direction: column; align-items: stretch; justify-content: flex-start; }

/* The tower builds into this host (siblings: the pane's PiP handles, which survive a
   tower rebuild). It fills the pane and anchors the Display view's absolute layout. */
.bsv-pane-3d-host { position: absolute; inset: 0; }
/* Display's 3D view fills the pane (decoupled from its square aspect-ratio default). */
.bsv-pane .trv-root { width: 100%; height: 100%; }
.bsv-pane .t3v-wrapper {
  position: absolute;
  inset: 0;
  width: auto;
  height: auto;
  aspect-ratio: auto;
  max-width: none;
  max-height: none;
}
.bsv-pane .t3v-wrapper,
.bsv-pane .t3v-canvas,
.bsv-pane .t3v-canvas canvas { transition: none !important; }

/* Single-view modes. */
.bsv-mode-2d .bsv-pane-3d,
.bsv-mode-3d .bsv-pane-2d { display: none; }

/* Side-by-side. */
.bsv-mode-2d3d { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; }
.bsv-mode-2d3d .bsv-pane { position: relative; inset: auto; }

/* Picture-in-picture. */
.bsv-mode-pip .bsv-pane.is-big { position: absolute; inset: 0; }
.bsv-mode-pip .bsv-pane.is-mini {
  position: absolute;
  inset: auto 0.75rem 0.75rem auto;
  width: clamp(225px, 35%, 400px);
  aspect-ratio: 1;
  height: auto;
  z-index: 4;
  border: 1px solid var(--bsv-border-gold);
  border-radius: var(--bsv-radius);
  box-shadow: 0 6px 22px rgba(0, 0, 0, 0.7);
}

/* ── PiP move strip + resize corners (shown only on the inset) ───────────── */
.bsv-pip-handle { display: none; }
.bsv-pane.is-mini > .bsv-pip-handle {
  display: flex;
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 16px;
  align-items: center;
  justify-content: center;
  z-index: 10;
  cursor: move;
  background: rgba(11, 9, 5, 0.92);
  border-bottom: 1px solid var(--bsv-border);
  border-radius: var(--bsv-radius) var(--bsv-radius) 0 0;
}
.bsv-pane.is-mini > .bsv-pip-handle:hover { background: rgba(42, 30, 18, 0.95); }
.bsv-pip-grip {
  width: 26px; height: 6px;
  background-image: radial-gradient(var(--bsv-text-dim) 40%, transparent 45%);
  background-size: 5px 3px;
  opacity: 0.8;
}
.bsv-pip-corner { display: none; }
.bsv-pane.is-mini > .bsv-pip-corner { display: block; position: absolute; width: 16px; height: 16px; z-index: 12; }
.bsv-pane.is-mini > .bsv-pip-corner-nw { top: 0; left: 0; cursor: nwse-resize; }
.bsv-pane.is-mini > .bsv-pip-corner-ne { top: 0; right: 0; cursor: nesw-resize; }
.bsv-pane.is-mini > .bsv-pip-corner-sw { bottom: 0; left: 0; cursor: nesw-resize; }
.bsv-pane.is-mini > .bsv-pip-corner-se { bottom: 0; right: 0; cursor: nwse-resize; }
.bsv-pane.is-mini > .bsv-pip-corner::after {
  content: ''; position: absolute; width: 6px; height: 6px;
  border: 0 solid var(--bsv-text-dim); opacity: 0.7;
}
.bsv-pane.is-mini > .bsv-pip-corner:hover::after { border-color: var(--bsv-accent); opacity: 1; }
.bsv-pane.is-mini > .bsv-pip-corner-nw::after { top: 3px; left: 3px; border-top-width: 2px; border-left-width: 2px; }
.bsv-pane.is-mini > .bsv-pip-corner-ne::after { top: 3px; right: 3px; border-top-width: 2px; border-right-width: 2px; }
.bsv-pane.is-mini > .bsv-pip-corner-sw::after { bottom: 3px; left: 3px; border-bottom-width: 2px; border-left-width: 2px; }
.bsv-pane.is-mini > .bsv-pip-corner-se::after { bottom: 3px; right: 3px; border-bottom-width: 2px; border-right-width: 2px; }
/* Reserve the top strip so the handle clears the pane's own control bar. */
.bsv-pane-2d.is-mini { padding-top: 16px; }
.bsv-pane.is-mini .t3v-wrapper { top: 16px; }

/* ── 2D pane toolbar (Spin/Pan + N/E/S/W + All) + map host ──────────────── */
.bsv-pane-toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: stretch;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
}
/* The three control groups stretch to fill the row; flex-grow ≈ button count so every
   button ends up the same width, with the All button set apart in its own trailing group. */
.bsv-pane-toolbar .udt-focus-group { display: flex; min-width: 0; }
.bsv-pane-toolbar .bsv-dragmode { flex: 2 1 0; }
.bsv-pane-toolbar .bsv-kingdom { flex: 4 1 0; }
.bsv-pane-toolbar .bsv-all { flex: 1 1 0; }
.bsv-pane-toolbar .udt-focus-button { flex: 1 1 0; min-width: 0; }
.bsv-map-host {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  background: #000;
  overflow: hidden;
}
/* Contain-fit the SVG map inside its pane in every mode. */
.bsv-pane .udt-board-map {
  width: auto !important;
  height: auto !important;
  max-width: 100%;
  max-height: 100%;
  margin: auto;
}

/* ── Segmented controls (Spin/Pan + N/E/S/W + All), built by createSegmented ─── */
.udt-focus-group { display: inline-flex; }
.udt-focus-button {
  border: 1px solid var(--bsv-border-gold);
  border-right-width: 0;
  background: linear-gradient(180deg, #2a1e12 0%, #1a1208 100%);
  color: var(--bsv-text);
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 0.3rem 0.6rem;
  cursor: pointer;
  transition: color 150ms, background 150ms;
}
.udt-focus-group .udt-focus-button:first-child { border-radius: 3px 0 0 3px; }
.udt-focus-group .udt-focus-button:last-child { border-radius: 0 3px 3px 0; border-right-width: 1px; }
.udt-focus-button:hover { background: linear-gradient(180deg, #3a2a18 0%, #2a1a0e 100%); color: var(--bsv-lume); }
.udt-focus-button.is-active {
  background: linear-gradient(180deg, #2a2010 0%, #1a1608 100%);
  border-color: var(--bsv-accent);
  color: var(--bsv-lume);
}

/* Re-skin Display's built-in 3D control bar (N/E/S/W + Center/Reset) to match the 2D
   buttons above, so both views read as one toolbar family. Scoped under .bsv-panel
   (which moves with the pop-out window) and out-specifies Display's single-class rules. */
.bsv-panel .tower-side-btn,
.bsv-panel .t3v-center-btn,
.bsv-panel .t3v-reset-btn {
  border: 1px solid var(--bsv-border-gold);
  background: linear-gradient(180deg, #2a1e12 0%, #1a1208 100%);
  color: var(--bsv-text);
  font: inherit;
  font-size: 0.66rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 3px;
  padding: 0.3rem 0.6rem;
  transition: color 150ms, background 150ms, border-color 150ms;
}
.bsv-panel .tower-side-btn:hover,
.bsv-panel .t3v-center-btn:hover,
.bsv-panel .t3v-reset-btn:hover {
  background: linear-gradient(180deg, #3a2a18 0%, #2a1a0e 100%);
  border-color: var(--bsv-accent);
  color: var(--bsv-lume);
}
.bsv-panel .tower-side-btn[data-active='true'] {
  background: linear-gradient(180deg, #2a2010 0%, #1a1608 100%);
  border-color: var(--bsv-accent);
  color: var(--bsv-lume);
}

/* ── Dockable editing UI (palette / inspector / summary) ────────────────── */
.udt-board-ui { position: absolute; inset: 3rem 0 0 0; pointer-events: none; }
.udt-panel {
  position: absolute;
  width: 232px;
  background: var(--bsv-glass);
  border: 1px solid var(--bsv-border-gold);
  border-radius: var(--bsv-radius-card);
  box-shadow: inset 0 1px 0 rgba(200, 160, 64, 0.07), 0 8px 24px rgba(0, 0, 0, 0.6);
  font-size: 12px;
  color: var(--bsv-text);
  pointer-events: auto;
  backdrop-filter: blur(2px);
}
.udt-panel-title {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.55rem;
  background: linear-gradient(180deg, #221913 0%, #160f09 100%);
  border-bottom: 1px solid var(--bsv-border);
  border-radius: var(--bsv-radius-card) var(--bsv-radius-card) 0 0;
  cursor: move;
}
.udt-panel-title-text {
  flex: 1;
  font-size: 0.62rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--bsv-lume);
}
.udt-panel-collapse,
.udt-panel-close {
  background: none; border: none; color: var(--bsv-text-dim);
  cursor: pointer; font: inherit; line-height: 1; padding: 0 0.3rem;
}
.udt-panel-collapse:hover,
.udt-panel-close:hover { color: var(--bsv-lume); }
.udt-panel-body { display: flex; flex-direction: column; gap: 0.4rem; padding: 0.55rem; max-height: 50vh; overflow: auto; }
.udt-board-ui button {
  background: linear-gradient(180deg, #2a1e12 0%, #1a1208 100%);
  color: var(--bsv-text);
  border: 1px solid var(--bsv-border-gold);
  border-radius: 3px;
  padding: 0.25rem 0.55rem;
  cursor: pointer;
  font: inherit;
  font-size: 0.62rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.udt-board-ui select,
.udt-board-ui input {
  background: var(--bsv-input);
  color: var(--bsv-text);
  border: 1px solid var(--bsv-border-gold);
  border-radius: 3px;
  padding: 0.25rem;
  font: inherit;
  font-size: 0.7rem;
  width: 100%;
}
.udt-field, .udt-field-row { display: flex; gap: 0.4rem; }
.udt-field { flex-direction: column; gap: 0.15rem; flex: 1; }
.udt-field-label { font-size: 0.56rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--bsv-text-dim); }
.udt-palette-add-row, .udt-palette-confirm, .udt-inspector-row { display: flex; align-items: center; gap: 0.4rem; }
.udt-palette-hint { flex-basis: 100%; color: var(--bsv-text-dim); font-style: italic; }
.udt-palette-setup summary { cursor: pointer; color: var(--bsv-text-dim); font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; padding: 0.25rem 0; }
.udt-inspector-heading { font-size: 0.66rem; letter-spacing: 0.06em; color: var(--bsv-lume); margin-bottom: 0.2rem; }
.udt-inspector-empty { color: var(--bsv-text-dim); font-style: italic; }
.udt-summary { width: 100%; border-collapse: collapse; font-size: 0.66rem; }
.udt-summary th, .udt-summary td { padding: 0.15rem 0.3rem; text-align: center; border-bottom: 1px solid var(--bsv-border); }
.udt-summary th { color: var(--bsv-text-dim); font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }

/* ── Pop-out window ─────────────────────────────────────────────────────── */
.bsv-popout-body {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 0.5rem;
  background-color: var(--bg, #0b0a09);
  box-sizing: border-box;
  overflow: hidden;
}
.bsv-popout-body > .bsv-panel { flex: 1 1 auto; min-height: 0; height: auto; }
.bsv-popout-body .t3v-wrapper { aspect-ratio: auto; max-height: none; height: 100%; }
.bsv-popout-placeholder {
  border: 1px dashed var(--bsv-border-gold);
  border-radius: 6px;
  padding: 1.25rem 1rem;
  color: var(--bsv-text-dim);
  font-style: italic;
  text-align: center;
  background: var(--bsv-panel-bg);
  min-height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
}
`;

const STYLE_MARKER_ID = 'bsv-stage-styles';

/** Inject {@link BOARD_STAGE_CSS} into `document.head` once (idempotent). */
export function injectStageStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_MARKER_ID)) return;
  const style = doc.createElement('style');
  style.id = STYLE_MARKER_ID;
  style.textContent = BOARD_STAGE_CSS;
  doc.head.appendChild(style);
}
