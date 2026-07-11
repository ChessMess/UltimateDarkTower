/**
 * Whole-game controls (PRD-04): the single GameSession is saved / loaded / exported /
 * imported here. Save & load use localStorage; export/copy + import are the "share with a
 * friend" path. This is a thin UI over the store's session actions.
 */
import { useRef, useState } from 'react';
import { useGameStore } from '@/state/gameStore';
import { NewGameWizard } from './NewGameWizard';

export function SessionBar() {
  const saveSession = useGameStore((s) => s.saveSession);
  const resetSession = useGameStore((s) => s.resetSession);
  const loadSession = useGameStore((s) => s.loadSession);
  const exportSession = useGameStore((s) => s.exportSession);
  const copySession = useGameStore((s) => s.copySession);
  const importSessionText = useGameStore((s) => s.importSessionText);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<string>('');
  const [showWizard, setShowWizard] = useState(false);

  const flash = (msg: string) => {
    setStatus(msg);
    window.setTimeout(() => setStatus(''), 2500);
  };

  const guard = (fn: () => void, ok: string) => () => {
    try {
      fn();
      flash(ok);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Something went wrong.');
    }
  };

  const onImportFile = async (file: File) => {
    try {
      importSessionText(await file.text());
      flash('Imported game.');
    } catch (err) {
      flash(err instanceof Error ? err.message : 'Import failed.');
    }
  };

  return (
    <div className="session-bar">
      <button onClick={() => setShowWizard(true)}>New</button>
      <button
        onClick={guard(() => {
          if (window.confirm('Restart this game from its setup? Tower, board, and progress reset.'))
            resetSession();
        }, 'Reset.')}
      >
        Reset
      </button>
      <button onClick={guard(saveSession, 'Saved.')}>Save</button>
      <button onClick={guard(() => loadSession() || flashThrow(), 'Loaded.')}>Load</button>
      <button onClick={guard(exportSession, 'Exported file.')}>Export</button>
      <button
        onClick={() => {
          copySession().then(
            () => flash('Copied JSON.'),
            () => flash('Clipboard blocked.'),
          );
        }}
      >
        Copy
      </button>
      <button onClick={() => fileRef.current?.click()}>Import</button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void onImportFile(file);
          e.target.value = ''; // allow re-importing the same file
        }}
      />
      {status && <span className="session-status">{status}</span>}
      {showWizard && <NewGameWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
}

/** loadSession() returns false when there's no save; turn that into a user-facing message. */
function flashThrow(): never {
  throw new Error('No saved game found.');
}
