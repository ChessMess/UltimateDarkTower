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
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #333;
  border: 1px solid #555;
  display: inline-block;
  transition: background 0.2s;
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

/* ── Multi-Renderer Layout ── */

.td-layout {
  display: flex;
  gap: 1.5rem;
  align-items: flex-start;
}

.td-slot {
  flex: 1;
  min-width: 0;
}

/* ── SVG Side View ── */

.tsv-wrapper {
  max-width: 240px;
}

.tsv-side-selector {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.tsv-side-btn {
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

.tsv-side-btn[data-active="true"] {
  background: #3a3a3a;
  color: #e8e8e8;
  border-color: #666;
}

.tsv-side-btn:hover {
  background: #333;
}

.tsv-svg svg {
  width: 100%;
  height: auto;
  display: block;
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
`;

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
