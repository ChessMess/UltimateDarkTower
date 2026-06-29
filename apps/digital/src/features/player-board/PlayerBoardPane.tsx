/**
 * Player-board pane (PRD-03). Shows one tab per hero in the session (FR-03.7) and the full
 * tracker for the selected hero. Edits go through `updatePlayerBoard`, so they land in the
 * single `GameSession` and round-trip through save/load (FR-03.8 / PRD-04).
 */
import { useState } from 'react';
import { HERO_BY_ID } from '@/lib/udtData';
import { useSession, usePlayerBoardAction } from '@/lib/hooks';
import { isCorruptionLoss } from '@/session';
import { PlayerBoardCard } from './PlayerBoardCard';

export function PlayerBoardPane() {
  const session = useSession();
  const updatePlayerBoard = usePlayerBoardAction();
  const boards = session.playerBoards;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (boards.length === 0) {
    return (
      <section className="panel">
        <h2>Player boards</h2>
        <p className="muted">No heroes yet — start a game with “New”.</p>
      </section>
    );
  }

  // Fall back to the first board if nothing's picked or the picked hero left the session.
  const selected = boards.find((b) => b.heroId === selectedId) ?? boards[0];

  return (
    <section className="panel">
      <h2>Player boards</h2>

      {boards.length > 1 && (
        <div className="pb-tabs" role="tablist">
          {boards.map((pb) => (
            <button
              key={pb.heroId}
              role="tab"
              aria-selected={pb.heroId === selected.heroId}
              className={`pb-tab${pb.heroId === selected.heroId ? ' is-active' : ''}`}
              onClick={() => setSelectedId(pb.heroId)}
            >
              {HERO_BY_ID[pb.heroId]?.name ?? pb.heroId}
              {isCorruptionLoss(pb) && (
                <span className="pb-tab-flag" title="3rd corruption — game loss">
                  !
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <PlayerBoardCard
        key={selected.heroId}
        pb={selected}
        update={(fn) => updatePlayerBoard(selected.heroId, fn)}
      />
    </section>
  );
}
