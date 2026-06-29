/**
 * Turn / month tracker (PRD-04 FR-04.9). Shows where the game is in the 6-month base-game
 * cadence and lets the player step the turn/month manually. It also surfaces the base-game
 * loss conditions as *non-enforced* reminders — gentle, dismissible hints, never blocks.
 */
import { useMemo } from 'react';
import { activeReminders, MONTHS, turnsInMonth } from '@/session';
import { useProgress, useProgressActions, useSession } from '@/lib/hooks';

export function TurnTracker() {
  const session = useSession();
  const progress = useProgress();
  const { advanceTurn, retreatTurn, goToMonth, dismissReminder } = useProgressActions();

  // Derive only when the session reference actually changes (see useSession docs).
  const reminders = useMemo(() => activeReminders(session), [session]);
  const lastTurn = turnsInMonth(session.config.playerCount);
  const atStart = progress.month === 1 && progress.turn === 1;
  const atEnd = progress.month >= MONTHS && progress.turn >= lastTurn;

  return (
    <div className="turn-tracker">
      <div className="turn-readout">
        <button onClick={retreatTurn} disabled={atStart} aria-label="Previous turn">
          ‹
        </button>
        <span className="turn-month">
          Month{' '}
          <select
            value={progress.month}
            onChange={(e) => goToMonth(Number(e.target.value))}
            aria-label="Month"
          >
            {Array.from({ length: MONTHS }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>{' '}
          / {MONTHS}
        </span>
        <span className="turn-turn">
          Turn {progress.turn} / {lastTurn}
        </span>
        <button onClick={advanceTurn} disabled={atEnd} aria-label="Next turn">
          ›
        </button>
      </div>

      {reminders.length > 0 && (
        <ul className="turn-reminders">
          {reminders.map((r) => (
            <li key={r.id} className={`reminder reminder-${r.tone}`}>
              <span>{r.text}</span>
              <button onClick={() => dismissReminder(r.id)} aria-label="Dismiss reminder">
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
