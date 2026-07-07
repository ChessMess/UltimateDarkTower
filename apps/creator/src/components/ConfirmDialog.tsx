// ConfirmDialog — themed replacement for window.confirm on destructive actions. Deletes autosave
// to the draft within ~800ms and there is no undo, so anything destructive must pass through here.
// Cancel is the focused default (Enter cancels); Escape and overlay click also cancel.

import { overlay, panel, dialogTitle, dialogBody, buttonRow, secondaryBtn, dangerDialogBtn } from './modal';

export interface ConfirmDialogProps {
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      style={overlay}
      onClick={(e) => {
        // stopPropagation so a stacked parent overlay (e.g. AssetManagerDialog) doesn't also close
        e.stopPropagation();
        onCancel();
      }}
      onKeyDown={(e) => e.key === 'Escape' && onCancel()}
    >
      <div style={{ ...panel, width: 380, maxWidth: '92vw' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ ...dialogTitle, fontSize: 15 }}>{title}</div>
        <div style={dialogBody}>{message}</div>
        <div style={buttonRow}>
          <button autoFocus style={secondaryBtn} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button style={dangerDialogBtn} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
