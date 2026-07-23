// StaleScenarioDialog — shown when a document fails the schema-version guard in
// `store.loadScenario` (schema 0.5.0's `$defs/boardDef.anchors` -> `spots` change is the first
// non-backward-compatible bump, so there is no migration to fall back to). Offers a download of
// the untouched document — re-serialized here, not the original file bytes, since by this point
// every load path (file import, the IndexedDB library, autosave-draft recovery) has already
// parsed it to a plain object — then the caller just dismisses; nothing was ever loaded, so
// there is nothing destructive to confirm.
import {
  overlay,
  panel,
  dialogTitle,
  dialogBody,
  buttonRow,
  secondaryBtn,
  primaryDialogBtn,
} from '../components/modal';

interface Props {
  /** The rejected document's own `schemaVersion`, or `undefined` if it didn't even have one. */
  foundVersion: string | undefined;
  currentVersion: string;
  onDownload: () => void;
  onDismiss: () => void;
}

export function StaleScenarioDialog({
  foundVersion,
  currentVersion,
  onDismiss,
  onDownload,
}: Props) {
  return (
    <div style={overlay} onClick={onDismiss} onKeyDown={(e) => e.key === 'Escape' && onDismiss()}>
      <div style={{ ...panel, width: 440 }} onClick={(e) => e.stopPropagation()}>
        <div style={dialogTitle}>Can't open this scenario</div>
        <div style={dialogBody}>
          This document was saved by an earlier version of the Creator (schema{' '}
          <strong>{foundVersion ?? 'unknown'}</strong>) and can't be opened by this one (schema{' '}
          <strong>{currentVersion}</strong>) — the board format changed in a way this build can't
          read back. Nothing was loaded.
          <br />
          <br />
          Download a copy first if you want to keep it.
        </div>
        <div style={buttonRow}>
          <button autoFocus style={secondaryBtn} onClick={onDismiss}>
            OK
          </button>
          <button style={primaryDialogBtn} onClick={onDownload}>
            Download a copy
          </button>
        </div>
      </div>
    </div>
  );
}
