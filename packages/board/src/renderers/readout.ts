import type { BoardState, LocationName } from '../state/boardState';
import {
  adversaryOf,
  buildingAt,
  foesOf,
  heroesOf,
  markersAt,
  monumentAt,
  skullsAt,
} from '../state/selectors';
import type { BoardKingdom } from '../data/udtReexports';
import type { BoardDefinition } from '../data/boardDefinition';
import { resolveBoard } from '../data/boardDefinition';
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

  /** `board` selects the location vocabulary; omit for the built-in RtDT board. */
  constructor(private readonly board?: BoardDefinition) {}

  render(state: BoardState, focus: BoardFocus = DEFAULT_FOCUS): void {
    this.last = BoardReadout.toText(state, focus, this.board);
  }

  getText(): string {
    return this.last;
  }

  static toText(
    state: BoardState,
    focus: BoardFocus = DEFAULT_FOCUS,
    board?: BoardDefinition,
  ): string {
    const { kingdom } = focus;
    const { locationByName } = resolveBoard(board);
    /** A location passes the filter when focus is `all`, or its kingdom matches. */
    const inFocus = (loc: LocationName): boolean =>
      kingdom === 'all' || locationByName[loc]?.kingdom === (kingdom as BoardKingdom);

    const lines: string[] = [`Board — focus: ${focus.kingdom}/${focus.angle}`];

    const heroes = heroesOf(state)
      .filter((h) => inFocus(h.location))
      .sort((a, b) => a.id.localeCompare(b.id));
    lines.push(`Heroes (${heroes.length}):`);
    for (const hero of heroes) {
      const owner = hero.data?.owner;
      lines.push(`  - ${hero.id} @ ${hero.location}${owner ? ` (${owner})` : ''}`);
    }

    const foes = foesOf(state)
      .filter((f) => inFocus(f.location))
      .sort((a, b) => a.id.localeCompare(b.id));
    lines.push(`Foes (${foes.length}):`);
    for (const foe of foes) {
      lines.push(`  - ${foe.id} ${foe.art ?? ''} @ ${foe.location}`);
    }

    const adversary = adversaryOf(state);
    const adversaryInFocus =
      adversary !== undefined &&
      (kingdom === 'all' || (adversary.location !== undefined && inFocus(adversary.location)));
    if (adversary && adversaryInFocus) {
      lines.push(
        `Adversary: ${adversary.id || '(unselected)'}${adversary.location ? ` @ ${adversary.location}` : ''}`,
      );
    } else {
      lines.push('Adversary: none');
    }

    // Sourced from `state.tokens` (like the marker set below), not the board definition's
    // static building-location list — so a building/skull/monument token placed anywhere it
    // actually exists in state is reported, even on a board the state wasn't seeded from.
    const buildingLocs = new Set<LocationName>();
    for (const token of Object.values(state.tokens)) {
      if (token.typeId === 'building' || token.typeId === 'skull' || token.typeId === 'monument') {
        buildingLocs.add(token.location);
      }
    }
    const active = [...buildingLocs]
      .filter((loc) => {
        const skulls = skullsAt(state, loc);
        const b = buildingAt(state, loc);
        return (skulls > 0 || b.destroyed || monumentAt(state, loc) !== undefined) && inFocus(loc);
      })
      .sort((a, b) => a.localeCompare(b));
    lines.push(`Buildings (${active.length} active):`);
    for (const loc of active) {
      const skulls = skullsAt(state, loc);
      const b = buildingAt(state, loc);
      const monument = monumentAt(state, loc);
      const parts = [`${skulls} skull${skulls === 1 ? '' : 's'}`];
      if (b.destroyed) parts.push('destroyed');
      if (monument) parts.push(`monument: ${monument}`);
      lines.push(`  - ${loc}: ${parts.join(', ')}`);
    }

    const markerLocSet = new Set<LocationName>();
    for (const token of Object.values(state.tokens)) {
      if (token.typeId === 'marker') markerLocSet.add(token.location);
    }
    const markerLocs = [...markerLocSet].filter(inFocus).sort((a, b) => a.localeCompare(b));
    lines.push(`Space markers (${markerLocs.length}):`);
    for (const loc of markerLocs) {
      lines.push(`  - ${loc}: ${markersAt(state, loc).join(', ')}`);
    }

    return lines.join('\n');
  }
}
