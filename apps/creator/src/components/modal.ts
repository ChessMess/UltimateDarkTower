// Shared themed modal styles — the single source for dialog chrome so every overlay dialog
// (ConfirmDialog, RecoveryDialog, NewScenarioDialog, AssetManagerDialog) matches both themes.

import type { CSSProperties } from 'react';

export const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export const panel: CSSProperties = {
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 10,
  boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
  padding: '24px 28px',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
};

export const dialogTitle: CSSProperties = {
  fontSize: 17,
  fontWeight: 700,
  color: 'var(--c-text)',
};

export const dialogBody: CSSProperties = {
  fontSize: 13,
  color: 'var(--c-text-2)',
  lineHeight: 1.5,
};

export const buttonRow: CSSProperties = {
  display: 'flex',
  justifyContent: 'flex-end',
  gap: 10,
  marginTop: 4,
};

export const secondaryBtn: CSSProperties = {
  padding: '7px 18px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 6,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  cursor: 'pointer',
  fontSize: 13,
};

export const primaryDialogBtn: CSSProperties = {
  padding: '7px 18px',
  border: '1px solid var(--c-primary)',
  borderRadius: 6,
  background: 'var(--c-primary)',
  color: 'var(--c-primary-fg)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};

export const dangerDialogBtn: CSSProperties = {
  padding: '7px 18px',
  border: 'none',
  borderRadius: 6,
  background: 'var(--c-danger)',
  color: 'var(--c-danger-fg)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
};
