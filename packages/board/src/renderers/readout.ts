import type { BoardState } from '../state/boardState';
import type { BoardFocus, BoardRenderer } from './shared';

/**
 * Deterministic text readout of a `BoardState`. Sorting makes output stable
 * regardless of insertion order — this is the snapshot test target (spec §6).
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
    const lines: string[] = [];
    lines.push(`Board (v${state.version}) — focus: ${focus}`);
    lines.push(`Tokens: ${state.tokens.length}`);
    for (const t of [...state.tokens].sort((a, b) => a.id.localeCompare(b.id))) {
      lines.push(`  - ${t.kind} @ ${t.location} [${t.id}]`);
    }
    lines.push(`Space markers: ${Object.keys(state.spaceMarkers).length}`);
    return lines.join('\n');
  }
}
