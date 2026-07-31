/**
 * Bulk skull assignment (PRD-06 skull collection) — the escape hatch for assigning several
 * pending skulls at once, grouped by kingdom. Shell copied from `NewGameWizard`'s
 * wizard-backdrop/wizard/wizard-body/wizard-actions modal.
 */
import { useState } from 'react';
import { buildingAt, destroyedInKingdom, skullsAt, skullsInKingdom } from 'ultimatedarktowerboard';
import { useBoardState, useSkullPool } from '@/lib/hooks';
import { SKULLS_TO_DESTROY } from '@/sources/ManualBoardSource';
import { BUILDING_LOCATIONS, KINGDOMS } from './boardData';

export function SkullAssignDialog({ onClose }: { onClose: () => void }) {
  const boardState = useBoardState();
  const { pending, placeSkulls, adjustPendingSkulls } = useSkullPool();
  const [assignments, setAssignments] = useState<Record<string, number>>({});

  const assignedTotal = Object.values(assignments).reduce((sum, n) => sum + n, 0);
  const remainingPool = Math.max(0, pending - assignedTotal);

  const inc = (loc: string) => {
    if (remainingPool <= 0) return;
    setAssignments((a) => ({ ...a, [loc]: (a[loc] ?? 0) + 1 }));
  };
  const dec = (loc: string) => {
    setAssignments((a) => {
      const next = (a[loc] ?? 0) - 1;
      if (next <= 0) {
        const { [loc]: _drop, ...rest } = a;
        return rest;
      }
      return { ...a, [loc]: next };
    });
  };

  const confirm = () => {
    if (assignedTotal > 0) placeSkulls(assignments);
    onClose();
  };

  if (!boardState) return null;

  return (
    <div className="wizard-backdrop" role="dialog" aria-modal="true" aria-label="Assign skulls">
      <div className="wizard">
        <header className="wizard-head">
          <h2>Assign skulls</h2>
          <button className="wizard-x" onClick={onClose} aria-label="Cancel">
            ✕
          </button>
        </header>

        <div className="board-place-actions">
          <span className="muted">{remainingPool} in pool</span>
          <button disabled={remainingPool <= 0} onClick={() => adjustPendingSkulls(-1)}>
            − pool
          </button>
          <button onClick={() => adjustPendingSkulls(1)}>+ pool</button>
        </div>

        <div className="wizard-body">
          {KINGDOMS.map((kingdom) => {
            const locs = BUILDING_LOCATIONS.filter((l) => l.kingdom === kingdom);
            if (locs.length === 0) return null;
            return (
              <div key={kingdom}>
                <h3>
                  {kingdom} — {skullsInKingdom(boardState, kingdom)} skulls ·{' '}
                  {destroyedInKingdom(boardState, kingdom)} destroyed
                </h3>
                <ul className="rows">
                  {locs.map((loc) => {
                    const current = skullsAt(boardState, loc.name);
                    const assigned = assignments[loc.name] ?? 0;
                    const destroyed = buildingAt(boardState, loc.name).destroyed;
                    const willDestroy = !destroyed && current + assigned >= SKULLS_TO_DESTROY;
                    return (
                      <li key={loc.name}>
                        <span className={willDestroy ? 'board-destroyed' : ''}>
                          {loc.name}
                          {destroyed
                            ? ' (destroyed)'
                            : willDestroy
                              ? ' — ⚠ destroys this building'
                              : ''}
                        </span>
                        <span className="skull-row-controls">
                          <span className="muted">
                            {current + assigned} / {SKULLS_TO_DESTROY}
                          </span>
                          <button
                            disabled={destroyed || assigned <= 0}
                            onClick={() => dec(loc.name)}
                          >
                            −
                          </button>
                          <button
                            disabled={destroyed || remainingPool <= 0}
                            onClick={() => inc(loc.name)}
                          >
                            +
                          </button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        <footer className="wizard-actions">
          <span className="wizard-spacer" />
          <button onClick={onClose}>Later</button>
          <button className="wizard-start" onClick={confirm} disabled={assignedTotal === 0}>
            Place all
          </button>
        </footer>
      </div>
    </div>
  );
}
