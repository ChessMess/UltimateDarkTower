import type { BoardState, LocationName } from '../state/boardState';
import { BOARD_LOCATION_BY_NAME } from '../data/udtReexports';
import type { BoardKingdom } from '../data/udtReexports';
import type { BoardFocus, BoardRenderer } from './shared';
import { DEFAULT_FOCUS } from './shared';

/**
 * Deterministic text readout of a `BoardState`. Sorting makes output stable
 * regardless of insertion order — this is the snapshot test target. Foe `status`
 * is intentionally not shown (lethality is tracked but not rendered).
 *
 * When `focus.kingdom` is a specific kingdom, the readout is narrowed to entries
 * whose location is in that kingdom (PRD §7.2 opt-in filter); `all` shows everything.
 * `focus.angle` is a 3D-camera concept and does not affect the text body.
 */
export class BoardReadout implements BoardRenderer {
  private last = '';

  render(state: BoardState, focus: BoardFocus = DEFAULT_FOCUS): void {
    this.last = BoardReadout.toText(state, focus);
  }

  getText(): string {
    return this.last;
  }

  static toText(state: BoardState, focus: BoardFocus = DEFAULT_FOCUS): string {
    const { kingdom } = focus;
    /** A location passes the filter when focus is `all`, or its kingdom matches. */
    const inFocus = (loc: LocationName): boolean =>
      kingdom === 'all' || BOARD_LOCATION_BY_NAME[loc]?.kingdom === (kingdom as BoardKingdom);

    const lines: string[] = [`Board — focus: ${focus.kingdom}/${focus.angle}`];

    const heroIds = Object.keys(state.heroes)
      .filter((id) => inFocus(state.heroes[id].location))
      .sort((a, b) => a.localeCompare(b));
    lines.push(`Heroes (${heroIds.length}):`);
    for (const id of heroIds) {
      const hero = state.heroes[id];
      lines.push(`  - ${id} @ ${hero.location}${hero.owner ? ` (${hero.owner})` : ''}`);
    }

    const foeIds = Object.keys(state.foes)
      .filter((id) => inFocus(state.foes[id].location))
      .sort((a, b) => a.localeCompare(b));
    lines.push(`Foes (${foeIds.length}):`);
    for (const id of foeIds) {
      const foe = state.foes[id];
      lines.push(`  - ${id} ${foe.foe} @ ${foe.location}`);
    }

    const adversaryInFocus =
      state.adversary !== undefined &&
      (kingdom === 'all' ||
        (state.adversary.location !== undefined && inFocus(state.adversary.location)));
    if (state.adversary && adversaryInFocus) {
      const { id, location } = state.adversary;
      lines.push(`Adversary: ${id || '(unselected)'}${location ? ` @ ${location}` : ''}`);
    } else {
      lines.push('Adversary: none');
    }

    const active = Object.keys(state.buildings)
      .filter((loc) => {
        const b = state.buildings[loc];
        return (b.skulls > 0 || b.destroyed || (b.monument ?? null) !== null) && inFocus(loc);
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

    const markerLocs = Object.keys(state.spaceMarkers)
      .filter((loc) => inFocus(loc))
      .sort((a, b) => a.localeCompare(b));
    lines.push(`Space markers (${markerLocs.length}):`);
    for (const loc of markerLocs) {
      lines.push(`  - ${loc}: ${state.spaceMarkers[loc].join(', ')}`);
    }

    return lines.join('\n');
  }
}
