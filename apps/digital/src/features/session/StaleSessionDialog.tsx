/**
 * Blocks on a save `loadSession` refused to read (PRD-04 FR-04.7's refuse-don't-migrate
 * policy) — most often an older `GAME_SESSION_SCHEMA_VERSION`. There is no dismiss: closing
 * without downloading or discarding would leave `staleSession` set, which blocks autosave
 * indefinitely to protect the very bytes this dialog exists to save.
 */
import { useGameStore } from '@/state/gameStore';
import { downloadJson } from '@/session';

export function StaleSessionDialog() {
  const stale = useGameStore((s) => s.staleSession);
  const discardStaleSession = useGameStore((s) => s.discardStaleSession);

  if (!stale) return null;

  return (
    <div
      className="wizard-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Incompatible saved game"
    >
      <div className="wizard">
        <header className="wizard-head">
          <h2>Saved game can&rsquo;t be opened</h2>
        </header>
        <div className="wizard-body">
          <p>
            Your saved game is from an older version of this app and can&rsquo;t be loaded. Download
            a copy if you want to keep it, then start fresh.
          </p>
        </div>
        <div className="wizard-actions">
          <button onClick={() => downloadJson(stale.raw, 'rtdt-game-unreadable.json')}>
            Download it
          </button>
          <span className="wizard-spacer" />
          <button className="wizard-start" onClick={discardStaleSession}>
            Start fresh
          </button>
        </div>
      </div>
    </div>
  );
}
