/**
 * TowerVisualizer — renders a live representation of the tower state for observer clients.
 *
 * Decodes a TowerState (from the `ultimatedarktower` library) and renders LEDs, drum positions,
 * audio, and skull drop events into a DOM container.
 */

import {
  type TowerState,
  LIGHT_EFFECTS,
  GLYPHS,
  TOWER_AUDIO_LIBRARY,
  LAYER_TO_POSITION,
  LIGHT_INDEX_TO_DIRECTION,
  TOWER_LIGHT_SEQUENCES,
  VOLUME_DESCRIPTIONS,
} from 'ultimatedarktower';

const COMPASS = ['N', 'E', 'S', 'W'] as const;
const DRUM_NAMES = ['Top', 'Middle', 'Bottom'] as const;

const EFFECT_LABELS: Record<number, string> = {
  [LIGHT_EFFECTS.off]: 'off',
  [LIGHT_EFFECTS.on]: 'on',
  [LIGHT_EFFECTS.breathe]: 'breathe',
  [LIGHT_EFFECTS.breatheFast]: 'breathe-fast',
  [LIGHT_EFFECTS.breathe50percent]: 'breathe-50',
  [LIGHT_EFFECTS.flicker]: 'flicker',
};

/** Reverse lookup: led_sequence value → human-readable label. */
const SEQUENCE_LABELS: Record<number, string> = Object.fromEntries(
  Object.entries(TOWER_LIGHT_SEQUENCES).map(([name, val]) => [val, name]),
);

/** Reverse lookup: TOWER_AUDIO_LIBRARY by sample value. */
const AUDIO_BY_VALUE: Map<number, string> = new Map(
  Object.values(TOWER_AUDIO_LIBRARY).map((entry) => [entry.value, entry.name]),
);

/**
 * TowerVisualizer renders decoded tower state into a DOM container.
 *
 * @example
 * ```ts
 * const viz = new TowerVisualizer(document.getElementById('visualizer')!);
 * viz.update(rtdt_unpack_state(bytes));
 * ```
 */
export class TowerVisualizer {
  private readonly container: HTMLElement;
  private prevState: TowerState | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.renderIdle();
  }

  /** Update the visualizer with a new decoded tower state. */
  update(state: TowerState): void {
    const skullDrop =
      this.prevState !== null && state.beam.count > this.prevState.beam.count;
    this.prevState = state;
    this.render(state, skullDrop);
  }

  private renderIdle(): void {
    this.container.innerHTML = '<p class="vis-idle">Waiting for tower state\u2026</p>';
  }

  private render(state: TowerState, skullDrop: boolean): void {
    // --- LEDs: 6 layers × 4 lights ---
    const ledRows = state.layer.map((layer, li) => {
      const layerName = LAYER_TO_POSITION[li as keyof typeof LAYER_TO_POSITION] ?? `L${li}`;
      const lights = layer.light.map((light, ji) => {
        const eff = EFFECT_LABELS[light.effect] ?? 'off';
        const dir = LIGHT_INDEX_TO_DIRECTION[ji as keyof typeof LIGHT_INDEX_TO_DIRECTION] ?? ji;
        return `<span class="vis-led" data-effect="${eff}" title="${layerName} ${dir}: ${eff}${light.loop ? ' (loop)' : ''}"></span>`;
      }).join('');
      return `<div class="vis-layer"><span class="vis-layer-label">${layerName}</span>${lights}</div>`;
    }).join('');

    // --- Drums ---
    const drumRows = state.drum.map((drum, di) => {
      const dir = COMPASS[drum.position] ?? '?';
      const cal = drum.calibrated ? '\u2713' : '\u2014';
      const activeGlyph = this.findGlyph(di, drum.position, drum.calibrated);
      return `<div class="vis-drum">
        <span class="vis-drum-name">${DRUM_NAMES[di]}</span>
        <span class="vis-drum-pos">${dir}</span>
        <span class="vis-drum-cal" title="Calibrated: ${drum.calibrated}">${cal}</span>
        ${activeGlyph ? `<span class="vis-glyph">${activeGlyph}</span>` : ''}
      </div>`;
    }).join('');

    // --- Audio ---
    const audioName = this.lookupAudio(state.audio.sample, state.audio.loop);
    const volLabel = VOLUME_DESCRIPTIONS[state.audio.volume as keyof typeof VOLUME_DESCRIPTIONS] ?? `Vol ${state.audio.volume}`;
    const audioHtml = `<div class="vis-audio">
      <span class="vis-audio-name">${audioName}</span>
      ${state.audio.loop ? '<span class="vis-audio-loop">loop</span>' : ''}
      <span class="vis-audio-vol">${volLabel}</span>
    </div>`;

    // --- Skull drop / beam ---
    const skullHtml = skullDrop
      ? `<div class="vis-skull-drop">\uD83D\uDC80 Skull Drop! (${state.beam.count})</div>`
      : `<div class="vis-beam-count">Skulls: ${state.beam.count}${state.beam.fault ? ' \u26A0 fault' : ''}</div>`;

    // --- LED sequence override ---
    const seqHtml = state.led_sequence !== 0
      ? `<div class="vis-led-seq">LED Sequence: ${SEQUENCE_LABELS[state.led_sequence] ?? `0x${state.led_sequence.toString(16).padStart(2, '0')}`}</div>`
      : '';

    this.container.innerHTML = `
      <div class="vis-section vis-leds"><h3>LEDs</h3>${ledRows}</div>
      <div class="vis-section vis-drums"><h3>Drums</h3>${drumRows}</div>
      <div class="vis-section vis-info">
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
    const level = (['top', 'middle', 'bottom'] as const)[drumIndex];
    const facing = COMPASS[position]; // which side is currently facing north
    for (const glyph of Object.values(GLYPHS)) {
      if (glyph.level === level && glyph.side === facing?.toLowerCase()) {
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
