/**
 * Per-kingdom skull totals (PRD-02 follow-up). Read-only — reuses `ultimatedarktowerboard`'s
 * `skullsInKingdom` / `destroyedInKingdom` selectors, the same rollup the board library's own
 * (unused-here) editing UI computes for its summary table.
 */
import { destroyedInKingdom, skullsInKingdom } from 'ultimatedarktowerboard';
import { useBoardState } from '@/lib/hooks';
import { KINGDOMS } from './boardData';

export function KingdomSkulls() {
  const boardState = useBoardState();

  return (
    <section className="panel">
      <h2>Kingdom skulls</h2>
      {!boardState ? (
        <p className="muted">Loading board…</p>
      ) : (
        <ul className="rows">
          {KINGDOMS.map((k) => (
            <li key={k}>
              <span>{k}</span>
              <span>
                {skullsInKingdom(boardState, k)} skulls · {destroyedInKingdom(boardState, k)}{' '}
                destroyed
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
