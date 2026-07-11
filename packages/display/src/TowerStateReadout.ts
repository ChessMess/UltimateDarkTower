import {
  type TowerState,
  type TowerSide,
  type TowerLevels,
  GLYPHS,
  TOWER_AUDIO_LIBRARY,
  TOWER_LIGHT_SEQUENCES,
  VOLUME_DESCRIPTIONS,
  LAYER_TO_POSITION,
  LIGHT_INDEX_TO_DIRECTION,
} from 'ultimatedarktower';
import type { ITowerDisplay, SealIdentifier } from './types';
import { injectStyles } from './styles';
import { EFFECT_LABELS, EFFECT_TOOLTIP_LABELS, EFFECT_CYCLE } from './effectLabels';

const COMPASS = ['N', 'E', 'S', 'W'] as const;
const COMPASS_FULL = ['north', 'east', 'south', 'west'] as const;
const DRUM_NAMES = ['Top', 'Middle', 'Bottom'] as const;
const DRUM_LEVELS = ['top', 'middle', 'bottom'] as const;

const SEAL_SIDES: readonly TowerSide[] = ['north', 'east', 'south', 'west'];
const SEAL_LEVELS: readonly TowerLevels[] = ['top', 'middle', 'bottom'];
const SEAL_LEVEL_LABELS: Record<TowerLevels, string> = { top: 'Top', middle: 'Mid', bottom: 'Bot' };
const sealKey = (side: TowerSide, level: TowerLevels): string => `${side}:${level}`;

/** Escape HTML special characters to prevent XSS when interpolating into innerHTML. */
function esc(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const SEQUENCE_LABELS: Record<number, string> = Object.fromEntries(
  Object.entries(TOWER_LIGHT_SEQUENCES).map(([name, val]) => [val, name]),
);

const AUDIO_BY_VALUE: Map<number, string> = new Map(
  Object.values(TOWER_AUDIO_LIBRARY).map((entry) => [entry.value, entry.name]),
);

/**
 * Core DOM renderer for tower state.
 *
 * Renders a live readout of LED grid, drum positions, audio state,
 * skull drops, LED sequence overrides, and a 3×4 seal grid.
 *
 * @example
 * ```ts
 * const readout = new TowerStateReadout(document.getElementById('tower')!);
 * readout.applyState(state);
 * readout.applySeals([{ side: 'north', level: 'top' }]);
 * ```
 */
export class TowerStateReadout implements ITowerDisplay {
  private readonly container: HTMLElement;
  private readonly sealClickHandler: (evt: Event) => void;
  private prevBeamCount: number | null = null;
  private latestState: TowerState | null = null;
  private brokenSeals: Set<string> = new Set();

  /** Optional callback fired when a user clicks a seal indicator in the readout grid. */
  onSealClick?: (seal: SealIdentifier) => void;

  /** Optional callback fired when a user clicks an LED circle to cycle its effect. */
  onLedClick?: (layer: number, light: number, effect: number) => void;

  private _clickToToggleSeals = false;
  private userOverriddenLeds: Map<string, number> = new Map();
  private _clickToToggleLeds = false;

  /** When true, the readout's seal grid is interactive. Defaults to false (read-only). */
  get clickToToggleSeals(): boolean {
    return this._clickToToggleSeals;
  }

  set clickToToggleSeals(value: boolean) {
    if (this._clickToToggleSeals === value) return;
    this._clickToToggleSeals = value;
    if (this.latestState) this.render(false);
    else this.renderIdle();
  }

  /** When true, the readout's LED circles are interactive (click to cycle effect). Defaults to false (read-only). */
  get clickToToggleLeds(): boolean {
    return this._clickToToggleLeds;
  }

  set clickToToggleLeds(value: boolean) {
    if (this._clickToToggleLeds === value) return;
    this._clickToToggleLeds = value;
    if (this.latestState) this.render(false);
    else this.renderIdle();
  }

  constructor(container: HTMLElement) {
    this.container = container;
    injectStyles();
    this.sealClickHandler = (evt) => this.onContainerClick(evt);
    this.container.addEventListener('click', this.sealClickHandler);
    this.renderIdle();
  }

  /**
   * Update the display with a new decoded tower state. The `_force`
   * parameter exists for `ITowerDisplay` compatibility; this renderer has
   * no audio path and ignores it.
   */
  applyState(state: TowerState, _force?: boolean): void {
    const skullDrop = this.prevBeamCount !== null && state.beam.count > this.prevBeamCount;
    this.prevBeamCount = state.beam.count;
    this.latestState = state;
    this.render(skullDrop);
  }

  /** Update which seals are currently broken and re-render the seal grid. */
  applySeals(brokenSeals: SealIdentifier[]): void {
    this.brokenSeals = new Set(brokenSeals.map((s) => sealKey(s.side, s.level)));
    if (this.latestState) this.render(false);
    else this.renderIdle();
  }

  /** Reset the state readout to its idle message. The seal grid stays visible and interactive. */
  showIdle(): void {
    this.latestState = null;
    this.renderIdle();
  }

  /** Clear all user-applied LED effect overrides and re-render. */
  clearLedOverrides(): void {
    if (this.userOverriddenLeds.size === 0) return;
    this.userOverriddenLeds.clear();
    if (this.latestState) this.render(false);
  }

  /** Remove all rendered DOM content and reset internal state. */
  dispose(): void {
    this.container.removeEventListener('click', this.sealClickHandler);
    this.container.innerHTML = '';
    this.prevBeamCount = null;
    this.latestState = null;
    this.brokenSeals.clear();
    this.userOverriddenLeds.clear();
  }

  private onContainerClick(evt: Event): void {
    const target = evt.target as HTMLElement | null;

    if (this.clickToToggleLeds) {
      const ledBtn = target?.closest<HTMLElement>('[data-tdr-led]');
      if (ledBtn) {
        const layer = parseInt(ledBtn.getAttribute('data-layer') ?? '', 10);
        const light = parseInt(ledBtn.getAttribute('data-light') ?? '', 10);
        if (!isNaN(layer) && !isNaN(light)) {
          const key = `${layer}:${light}`;
          const current =
            this.userOverriddenLeds.get(key) ??
            (this.latestState?.layer[layer]?.light[light]?.effect ?? 0);
          const idx = EFFECT_CYCLE.indexOf(current);
          const next = EFFECT_CYCLE[(idx === -1 ? 0 : idx + 1) % EFFECT_CYCLE.length];
          this.userOverriddenLeds.set(key, next);
          if (this.latestState) this.render(false);
          this.onLedClick?.(layer, light, next);
        }
        return;
      }
    }

    if (!this.clickToToggleSeals) return;
    const btn = target?.closest<HTMLElement>('[data-tdr-seal]');
    if (!btn) return;
    const side = btn.getAttribute('data-side') as TowerSide | null;
    const level = btn.getAttribute('data-level') as TowerLevels | null;
    if (!side || !level) return;
    this.onSealClick?.({ side, level });
  }

  private renderIdle(): void {
    this.container.innerHTML = `
      <div class="tdr-box">
        <p class="tdr-idle">Waiting for tower state…</p>
        ${this.renderSealsSection()}
      </div>
    `;
  }

  private render(skullDrop: boolean): void {
    const state = this.latestState;
    if (!state) { this.renderIdle(); return; }

    const ledRows = state.layer.map((layer, li) => {
      const layerName = LAYER_TO_POSITION[li as keyof typeof LAYER_TO_POSITION] ?? `L${li}`;
      const lights = layer.light.map((light, ji) => {
        const key = `${li}:${ji}`;
        const hasOverride = this.userOverriddenLeds.has(key);
        const effectValue = hasOverride ? this.userOverriddenLeds.get(key)! : light.effect;
        const eff = EFFECT_LABELS[effectValue] ?? 'off';
        const tooltip = EFFECT_TOOLTIP_LABELS[effectValue] ?? eff;
        const dir = LIGHT_INDEX_TO_DIRECTION[ji as keyof typeof LIGHT_INDEX_TO_DIRECTION] ?? ji;
        const overrideMark = hasOverride ? ' [override]' : '';
        const loopMark = light.loop ? ' (loop)' : '';
        const disabled = this._clickToToggleLeds ? '' : 'disabled';
        return `<button type="button" class="tdr-led" data-tdr-led data-layer="${li}" data-light="${ji}" data-effect="${esc(eff)}" data-overridden="${hasOverride}" title="${esc(`${layerName} ${dir}: ${tooltip}${overrideMark}${loopMark}`)}" ${disabled}></button>`;
      }).join('');
      return `<div class="tdr-layer"><span class="tdr-layer-label">${esc(layerName)}</span>${lights}</div>`;
    }).join('');

    // --- Drums ---
    const drumRows = state.drum.map((drum, di) => {
      const dir = COMPASS[drum.position] ?? '?';
      const cal = drum.calibrated ? '✓' : '—';
      const activeGlyph = this.findGlyph(di, drum.position, drum.calibrated);
      return `<div class="tdr-drum">
        <span class="tdr-drum-name">${esc(DRUM_NAMES[di])}</span>
        <span class="tdr-drum-pos">${esc(dir)}</span>
        <span class="tdr-drum-cal" title="Calibrated: ${drum.calibrated}">${cal}</span>
        ${activeGlyph ? `<span class="tdr-glyph">${esc(activeGlyph)}</span>` : ''}
      </div>`;
    }).join('');

    // --- Audio ---
    const audioName = this.lookupAudio(state.audio.sample, state.audio.loop);
    const volLabel = VOLUME_DESCRIPTIONS[state.audio.volume as keyof typeof VOLUME_DESCRIPTIONS] ?? `Vol ${state.audio.volume}`;
    const audioHtml = `<div class="tdr-audio">
      <span class="tdr-audio-name">${esc(audioName)}</span>
      ${state.audio.loop ? '<span class="tdr-audio-loop">loop</span>' : ''}
      <span class="tdr-audio-vol">${esc(volLabel)}</span>
    </div>`;

    // --- Skull drop / beam ---
    const skullHtml = skullDrop
      ? `<div class="tdr-skull-drop">💀 Skull Drop! (${state.beam.count})</div>`
      : `<div class="tdr-beam-count">Skulls: ${state.beam.count}${state.beam.fault ? ' ⚠ fault' : ''}</div>`;

    // --- LED sequence override ---
    const seqLabel = SEQUENCE_LABELS[state.led_sequence] ?? `0x${state.led_sequence.toString(16).padStart(2, '0')}`;
    const seqHtml = state.led_sequence !== 0
      ? `<div class="tdr-led-seq">LED Sequence: ${esc(seqLabel)}</div>`
      : '';

    const ledsHint = this._clickToToggleLeds
      ? '<span class="tdr-leds-hint">click to change</span>'
      : '';

    this.container.innerHTML = `
      <div class="tdr-box">
        <div class="tdr-section tdr-leds"><h3>LEDs${ledsHint}</h3>${ledRows}</div>
        <div class="tdr-section tdr-drums"><h3>Drums</h3>${drumRows}</div>
        ${this.renderSealsSection()}
        <div class="tdr-section tdr-info">
          ${audioHtml}
          ${skullHtml}
          ${seqHtml}
        </div>
      </div>
    `;
  }

  private renderSealsSection(): string {
    const headers = ['', ...COMPASS]
      .map((h) => `<div class="tdr-seals-header">${h}</div>`)
      .join('');

    const rows = SEAL_LEVELS.map((level) => {
      const cells = SEAL_SIDES.map((side) => {
        const broken = this.brokenSeals.has(sealKey(side, level));
        const label = `${side[0].toUpperCase()}${side.slice(1)} ${level} seal — ${broken ? 'broken' : 'present'}`;
        const disabled = this.clickToToggleSeals ? '' : 'disabled';
        return `<button type="button" class="tdr-seal" data-tdr-seal data-side="${side}" data-level="${level}" data-broken="${broken}" aria-pressed="${broken}" aria-label="${esc(label)}" ${disabled}></button>`;
      }).join('');
      return `<div class="tdr-seals-label">${SEAL_LEVEL_LABELS[level]}</div>${cells}`;
    }).join('');

    return `<div class="tdr-section tdr-seals"><h3>Seals</h3><div class="tdr-seals-grid">${headers}${rows}</div></div>`;
  }

  /**
   * Find the glyph name on the north-facing side of a drum, if any.
   * Only valid when the drum is calibrated.
   */
  private findGlyph(drumIndex: number, position: number, calibrated: boolean): string | null {
    if (!calibrated) return null;
    const level = DRUM_LEVELS[drumIndex];
    const facing = COMPASS_FULL[position];
    for (const glyph of Object.values(GLYPHS)) {
      if (glyph.level === level && glyph.side === facing) {
        return glyph.name;
      }
    }
    return null;
  }

  /** Look up an audio sample name from TOWER_AUDIO_LIBRARY by value. */
  private lookupAudio(sample: number, loop: boolean): string {
    if (sample === 0 && !loop) return 'Silence';
    return AUDIO_BY_VALUE.get(sample) ?? `Sample ${sample}`;
  }
}
