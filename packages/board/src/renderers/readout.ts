import type { BoardState } from '../state/boardState';
import type { BoardFocus, BoardRenderer } from './shared';

/**
 * Deterministic text readout of a `BoardState`. Sorting makes output stable
 * regardless of insertion order — this is the snapshot test target. Foe `status`
 * is intentionally not shown (lethality is tracked but not rendered).
 */
export class BoardReadout implements BoardRenderer {
  private last = '';

  render(state: BoardState, focus: BoardFocus = 'all'): void {
    this.last = BoardReadout.toText(state, focus);
  }

  getText(): string {
    return this.last;
  }

  static toText(state: BoardState, focus: BoardFocus = 'all'): string {
    const lines: string[] = [`Board — focus: ${focus}`];

    const heroIds = Object.keys(state.heroes).sort((a, b) => a.localeCompare(b));
    lines.push(`Heroes (${heroIds.length}):`);
    for (const id of heroIds) {
      const hero = state.heroes[id];
      lines.push(`  - ${id} @ ${hero.location}${hero.owner ? ` (${hero.owner})` : ''}`);
    }

    const foeIds = Object.keys(state.foes).sort((a, b) => a.localeCompare(b));
    lines.push(`Foes (${foeIds.length}):`);
    for (const id of foeIds) {
      const foe = state.foes[id];
      lines.push(`  - ${id} ${foe.foe} @ ${foe.location}`);
    }

    if (state.adversary) {
      const { id, location } = state.adversary;
      lines.push(`Adversary: ${id || '(unselected)'}${location ? ` @ ${location}` : ''}`);
    } else {
      lines.push('Adversary: none');
    }

    const active = Object.keys(state.buildings)
      .filter((loc) => {
        const b = state.buildings[loc];
        return b.skulls > 0 || b.destroyed || (b.monument ?? null) !== null;
      })
      .sort((a, b) => a.localeCompare(b));
    lines.push(`Buildings (${active.length} active):`);
    for (const loc of active) {
      const b = state.buildings[loc];
      const parts = [`${b.skulls} skull${b.skulls === 1 ? '' : 's'}`];
      if (b.destroyed) parts.push('destroyed');
      if (b.monument) parts.push(`monument: ${b.monument}`);
      lines.push(`  - ${loc}: ${parts.join(', ')}`);
    }

    const markerLocs = Object.keys(state.spaceMarkers).sort((a, b) => a.localeCompare(b));
    lines.push(`Space markers (${markerLocs.length}):`);
    for (const loc of markerLocs) {
      lines.push(`  - ${loc}: ${state.spaceMarkers[loc].join(', ')}`);
    }

    return lines.join('\n');
  }
}
