import {
  type TowerState,
  GLYPHS,
  TOWER_AUDIO_LIBRARY,
  TOWER_LIGHT_SEQUENCES,
  VOLUME_DESCRIPTIONS,
  LAYER_TO_POSITION,
  LIGHT_INDEX_TO_DIRECTION,
} from 'ultimatedarktower';
import type { ITowerDisplay } from './types';
import { injectStyles } from './styles';
import { EFFECT_LABELS } from './effectLabels';

const COMPASS = ['N', 'E', 'S', 'W'] as const;
const COMPASS_FULL = ['north', 'east', 'south', 'west'] as const;
const DRUM_NAMES = ['Top', 'Middle', 'Bottom'] as const;
const DRUM_LEVELS = ['top', 'middle', 'bottom'] as const;

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
 * skull drops, and LED sequence overrides.
 *
 * @example
 * ```ts
 * const readout = new TowerStateReadout(document.getElementById('tower')!);
 * readout.applyState(state);
 * ```
 */
export class TowerStateReadout implements ITowerDisplay {
  private readonly container: HTMLElement;
  private prevBeamCount: number | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    injectStyles();
    this.showIdle();
  }

  /** Update the display with a new decoded tower state. */
  applyState(state: TowerState): void {
    const skullDrop = this.prevBeamCount !== null && state.beam.count > this.prevBeamCount;
    this.prevBeamCount = state.beam.count;
    this.render(state, skullDrop);
  }

  /** Reset the display to its idle/waiting state. */
  showIdle(): void {
    this.container.innerHTML = '<p class="tdr-idle">Waiting for tower state\u2026</p>';
  }

  /** Remove all rendered DOM content and reset internal state. */
  dispose(): void {
    this.container.innerHTML = '';
    this.prevBeamCount = null;
  }

  private render(state: TowerState, skullDrop: boolean): void {
    // --- LEDs: 6 layers × 4 lights ---
    const ledRows = state.layer.map((layer, li) => {
      const layerName = LAYER_TO_POSITION[li as keyof typeof LAYER_TO_POSITION] ?? `L${li}`;
      const lights = layer.light.map((light, ji) => {
        const eff = EFFECT_LABELS[light.effect] ?? 'off';
        const dir = LIGHT_INDEX_TO_DIRECTION[ji as keyof typeof LIGHT_INDEX_TO_DIRECTION] ?? ji;
        return `<span class="tdr-led" data-effect="${esc(eff)}" title="${esc(`${layerName} ${dir}: ${eff}${light.loop ? ' (loop)' : ''}`)}"></span>`;
      }).join('');
      return `<div class="tdr-layer"><span class="tdr-layer-label">${esc(layerName)}</span>${lights}</div>`;
    }).join('');

    // --- Drums ---
    const drumRows = state.drum.map((drum, di) => {
      const dir = COMPASS[drum.position] ?? '?';
      const cal = drum.calibrated ? '\u2713' : '\u2014';
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
      ? `<div class="tdr-skull-drop">\uD83D\uDC80 Skull Drop! (${state.beam.count})</div>`
      : `<div class="tdr-beam-count">Skulls: ${state.beam.count}${state.beam.fault ? ' \u26A0 fault' : ''}</div>`;

    // --- LED sequence override ---
    const seqLabel = SEQUENCE_LABELS[state.led_sequence] ?? `0x${state.led_sequence.toString(16).padStart(2, '0')}`;
    const seqHtml = state.led_sequence !== 0
      ? `<div class="tdr-led-seq">LED Sequence: ${esc(seqLabel)}</div>`
      : '';

    this.container.innerHTML = `
      <div class="tdr-section tdr-leds"><h3>LEDs</h3>${ledRows}</div>
      <div class="tdr-section tdr-drums"><h3>Drums</h3>${drumRows}</div>
      <div class="tdr-section tdr-info">
        ${audioHtml}
        ${skullHtml}
        ${seqHtml}
      </div>
    `;
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
