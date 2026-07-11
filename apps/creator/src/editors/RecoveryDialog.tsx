import { overlay, panel, dialogTitle, dialogBody, buttonRow, secondaryBtn, primaryDialogBtn } from '../components/modal';

interface Props {
  title: string;
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({ title, savedAt, onRestore, onDiscard }: Props) {
  const savedAtLabel = new Date(savedAt).toLocaleString();

  return (
    <div style={overlay}>
      <div style={{ ...panel, width: 440 }}>
        <div style={dialogTitle}>Restore unsaved work?</div>
        <div style={dialogBody}>
          We found unsaved changes to <strong>{title}</strong>, autosaved on {savedAtLabel}. Would
          you like to restore them, or discard and start clean?
        </div>
        <div style={buttonRow}>
          <button onClick={onDiscard} style={secondaryBtn}>
            Discard
          </button>
          <button onClick={onRestore} style={primaryDialogBtn}>
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
