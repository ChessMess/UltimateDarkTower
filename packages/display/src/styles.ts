let injected = false;
let styleElement: HTMLStyleElement | null = null;

const CSS = `
/* ── Tower Display Readout ── */

@keyframes tdr-breathe {
  0%, 100% { opacity: 0.3; }
  50%      { opacity: 1; }
}

@keyframes tdr-flicker {
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.2; }
}

@keyframes tdr-skull-flash {
  0%   { transform: scale(1.3); }
  100% { transform: scale(1); }
}

.tdr-box {
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  padding: 0.5rem 1rem 0.75rem;
  background: #141414;
  max-height: 100vh;
  overflow-y: auto;
}

.tdr-idle {
  font-size: 0.85rem;
  color: #888;
  font-style: italic;
}

.tdr-section h3 {
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #888;
  margin: 0.6rem 0 0.3rem;
}

/* ── LED Grid ── */

.tdr-leds h3 {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
}

.tdr-leds-hint {
  font-size: 0.7rem;
  color: #888;
  text-transform: none;
  letter-spacing: 0;
}

.tdr-layer {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.15rem 0;
}

.tdr-layer-label {
  font-size: 0.65rem;
  color: #888;
  width: 7rem;
  text-align: right;
  flex-shrink: 0;
}

.tdr-led {
  width: clamp(14px, 1.5vw, 20px);
  height: clamp(14px, 1.5vw, 20px);
  border-radius: 50%;
  background: #333;
  border: 1px solid #555;
  display: inline-block;
  transition: background 0.2s;
  /* Button reset */
  padding: 0;
  appearance: none;
  -webkit-appearance: none;
  cursor: default;
  outline: none;
  font: inherit;
  color: inherit;
  vertical-align: middle;
}

button.tdr-led:not([disabled]) {
  cursor: pointer;
}

button.tdr-led:not([disabled]):hover {
  filter: brightness(1.35);
  border-color: #aaa;
}

button.tdr-led:not([disabled]):focus-visible {
  outline: 2px solid #80a0ff;
  outline-offset: 2px;
}

button.tdr-led[data-overridden="true"] {
  box-shadow: 0 0 0 2px #f39c12;
}

button.tdr-led[data-overridden="true"][data-effect="on"] {
  box-shadow: 0 0 6px rgba(240, 192, 64, 0.5), 0 0 0 2px #f39c12;
}

.tdr-led[data-effect="on"] {
  background: #f0c040;
  box-shadow: 0 0 6px rgba(240, 192, 64, 0.5);
}

.tdr-led[data-effect="breathe"] {
  background: #80a0ff;
  animation: tdr-breathe 2s ease-in-out infinite;
}

.tdr-led[data-effect="breathe-fast"] {
  background: #80a0ff;
  animation: tdr-breathe 0.8s ease-in-out infinite;
}

.tdr-led[data-effect="breathe-50"] {
  background: #80a0ff;
  animation: tdr-breathe 2s ease-in-out infinite;
  opacity: 0.5;
}

.tdr-led[data-effect="flicker"] {
  background: #ff6040;
  animation: tdr-flicker 0.3s step-end infinite;
}

/* ── Drums ── */

.tdr-drum {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.3rem 0;
}

.tdr-drum-name {
  font-size: 0.75rem;
  font-weight: 600;
  color: #e8e8e8;
}

.tdr-drum-pos {
  font-size: 0.85rem;
  font-weight: 700;
  color: #c0392b;
}

.tdr-drum-cal {
  font-size: 0.75rem;
  color: #888;
}

.tdr-glyph {
  font-size: 0.7rem;
  color: #f39c12;
  font-style: italic;
}

/* ── Audio ── */

.tdr-audio {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
}

.tdr-audio-name {
  color: #e8e8e8;
  font-weight: 500;
}

.tdr-audio-loop {
  font-size: 0.65rem;
  color: #27ae60;
  border: 1px solid #27ae60;
  border-radius: 3px;
  padding: 0 4px;
}

.tdr-audio-vol {
  font-size: 0.65rem;
  color: #888;
}

/* ── Skull / Beam ── */

.tdr-skull-drop {
  color: #e74c3c;
  font-weight: 700;
  font-size: 0.9rem;
  margin-top: 0.5rem;
  animation: tdr-skull-flash 0.6s ease-out;
}

.tdr-beam-count {
  font-size: 0.8rem;
  color: #888;
  margin-top: 0.5rem;
}

/* ── LED Sequence Override ── */

.tdr-led-seq {
  font-size: 0.75rem;
  color: #f39c12;
  margin-top: 0.3rem;
}

/* ── Seals Grid ── */

.tdr-seals-grid {
  display: grid;
  grid-template-columns: auto repeat(4, 1fr);
  gap: 0.25rem 0.35rem;
  align-items: center;
  justify-items: center;
  max-width: 14rem;
}

.tdr-seals-header {
  font-size: 0.7rem;
  color: #888;
  font-weight: 600;
}

.tdr-seals-label {
  font-size: 0.7rem;
  color: #888;
  justify-self: end;
  padding-right: 0.25rem;
}

.tdr-seal {
  width: clamp(14px, 1.5vw, 20px);
  height: clamp(14px, 1.5vw, 20px);
  border-radius: 50%;
  border: 1px solid #555;
  background: transparent;
  padding: 0;
  transition: background 0.15s, box-shadow 0.15s, transform 0.1s;
}

.tdr-seal[data-broken="false"] {
  background: #f0c040;
  border-color: #a68828;
  box-shadow: 0 0 4px rgba(240, 192, 64, 0.45);
}

.tdr-seal[data-broken="true"] {
  background: transparent;
}

.tdr-seal:not(:disabled) {
  cursor: pointer;
}

.tdr-seal:not(:disabled):hover {
  border-color: #e8e8e8;
}

.tdr-seal:not(:disabled):focus-visible {
  outline: 2px solid #80a0ff;
  outline-offset: 2px;
}

.tdr-seal:not(:disabled):active {
  transform: scale(0.92);
}

.tdr-seal:disabled {
  cursor: default;
  opacity: 0.85;
}

/* ── Multi-Renderer Layout ── */

.td-layout {
  display: flex;
  flex-wrap: wrap;
  gap: 1.5rem;
  align-items: stretch;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
}

.td-slot {
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.td-slot-readout {
  flex-basis: 100%;
}

/* ── SVG Side View ── */

.tsv-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 100%;
  height: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
}

.tsv-side-selector {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
  flex: 0 0 auto;
}

.tsv-svg {
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
}

.tower-side-btn {
  flex: 1;
  padding: 0.3rem 0;
  border: 1px solid #444;
  background: #222;
  color: #aaa;
  font-size: 0.7rem;
  cursor: pointer;
  border-radius: 4px;
  text-align: center;
}

.tower-side-btn[data-active="true"] {
  background: #3a3a3a;
  color: #e8e8e8;
  border-color: #666;
}

.tower-side-btn:hover {
  background: #333;
}

.tsv-svg svg {
  display: block;
  width: 100%;
  height: 100%;
}

.tsv-seal {
  cursor: pointer;
  pointer-events: all;
  transition: opacity 0.3s ease;
}

.tsv-seal[data-broken="true"] {
  opacity: 0;
}

.tsv-led {
  fill: #333 !important;
  stroke: #555 !important;
  opacity: 1;
  filter: none;
  animation: none;
  transition: fill 0.2s;
}

.tsv-led[data-effect="on"] {
  fill: #f0c040 !important;
  filter: drop-shadow(0 0 4px rgba(240, 192, 64, 0.65));
}

.tsv-led[data-effect="breathe"] {
  fill: #80a0ff !important;
  animation: tdr-breathe 2s ease-in-out infinite;
}

.tsv-led[data-effect="breathe-fast"] {
  fill: #80a0ff !important;
  animation: tdr-breathe 0.8s ease-in-out infinite;
}

.tsv-led[data-effect="breathe-50"] {
  fill: #80a0ff !important;
  animation: tdr-breathe 2s ease-in-out infinite;
  opacity: 0.5;
}

.tsv-led[data-effect="flicker"] {
  fill: #ff6040 !important;
  animation: tdr-flicker 0.3s step-end infinite;
}

/* ── 3D View ── */

.t3v-wrapper {
  display: flex;
  flex-direction: column;
  width: 100%;
  aspect-ratio: 1;
  max-width: 100%;
  max-height: 100vh;
}

.t3v-controls {
  display: flex;
  gap: 0.25rem;
  margin: 0.5rem;
  align-items: center;
}


.t3v-reset-btn,
.t3v-center-btn {
  padding: 0.3rem 0.7rem;
  border: 1px solid #444;
  background: #1a1a1a;
  color: #aaa;
  font-size: 0.7rem;
  cursor: pointer;
  border-radius: 4px;
  margin-left: 0.25rem;
}

.t3v-reset-btn:hover,
.t3v-center-btn:hover {
  background: #2a2a2a;
  color: #e8e8e8;
}

.t3v-canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  overflow: hidden;
  background: #111;
}

.t3v-canvas canvas {
  display: block;
  width: 100% !important;
  height: 100% !important;
}

/* ── Tower Render View (facade chrome) ── */

.trv-root {
  --trv-border: #2a2a2a;
  --trv-title-color: #e8e8e8;
  --trv-subtitle-color: #888;
  --trv-badge-bg: #1a1a1a;
  --trv-badge-border: #333;
  --trv-badge-color: #b8b8b8;
  --trv-accent: #f0c040;
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  width: 100%;
}

.trv-body {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-height: 0;
  /* Anchor for the absolutely-positioned overlay layer. */
  position: relative;
}

.trv-header {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--trv-border);
}

.trv-header-left {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  min-width: 0;
}

.trv-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--trv-title-color);
  margin: 0;
}

.trv-subtitle {
  font-size: 0.7rem;
  color: var(--trv-subtitle-color);
  margin: 0;
}

.trv-badges {
  margin-left: auto;
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.trv-badge {
  font-size: 0.65rem;
  padding: 0.15rem 0.5rem;
  background: var(--trv-badge-bg);
  border: 1px solid var(--trv-badge-border);
  border-radius: 3px;
  color: var(--trv-badge-color);
  display: inline-flex;
  gap: 0.35rem;
  align-items: baseline;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.trv-badge-label {
  color: var(--trv-subtitle-color);
}

.trv-badge-value {
  color: var(--trv-title-color);
  font-weight: 600;
}

.trv-badge[data-tone="accent"] {
  border-color: var(--trv-accent);
}
.trv-badge[data-tone="accent"] .trv-badge-value {
  color: var(--trv-accent);
}

.trv-badge[data-tone="warn"] {
  border-color: #b35414;
}
.trv-badge[data-tone="warn"] .trv-badge-value {
  color: #e67e22;
}

.trv-badge[data-tone="good"] {
  border-color: #27ae60;
}
.trv-badge[data-tone="good"] .trv-badge-value {
  color: #27ae60;
}

.trv-actions {
  display: flex;
  gap: 0.4rem;
}

/* ── UI docking (overlay HUD + panel slots) ── */

/* Absolutely-positioned overlay above the canvas. The layer itself ignores
   pointer events so empty areas still orbit/zoom; mounted children opt back in. */
.trv-overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 2;
}
.trv-overlay > * {
  pointer-events: auto;
}

/* Docking grid that reflows the canvas around fixed side/top/bottom panels. */
.trv-dock {
  display: grid;
  grid-template-columns: auto 1fr auto;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "top top top"
    "left body right"
    "bottom bottom bottom";
  flex: 1 1 0;
  min-height: 0;
  min-width: 0;
}
.trv-dock > .trv-body {
  grid-area: body;
  min-width: 0;
  min-height: 0;
}
.trv-panel {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
.trv-panel-left { grid-area: left; }
.trv-panel-right { grid-area: right; }
.trv-panel-top { grid-area: top; }
.trv-panel-bottom { grid-area: bottom; }
`;

/** The raw CSS string for all tower display components.
 *  Import and ship via your own bundler when using `injectStyles: false` on TowerDisplayOptions. */
export const TOWER_DISPLAY_CSS: string = CSS;

/**
 * Injects the tower display readout stylesheet into `document.head`.
 * Safe to call multiple times — the `<style>` tag is only appended once.
 */
export function injectStyles(): void {
  if (injected) return;
  styleElement = document.createElement('style');
  styleElement.textContent = CSS;
  document.head.appendChild(styleElement);
  injected = true;
}

/**
 * Marks styles as already handled so subsequent injectStyles() calls from any
 * renderer become no-ops. Call this before creating any renderers when you are
 * supplying TOWER_DISPLAY_CSS via your own bundler (e.g. Electron with strict CSP).
 * @internal
 */
export function suppressStyleInjection(): void {
  injected = true;
}

/**
 * Reset the injection guard (for testing only).
 * @internal
 */
export function _resetStyleInjection(): void {
  if (styleElement) {
    styleElement.remove();
    styleElement = null;
  }
  injected = false;
}
