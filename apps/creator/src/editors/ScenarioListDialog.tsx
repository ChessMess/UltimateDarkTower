// ScenarioListDialog — the scenario library: open, rename, duplicate, delete.
//
// Renders exclusively from the `meta` IDB store, never from documents or image payloads, so the
// list stays O(list length) no matter how much art the library holds.
//
// It also carries the durability story. Browser storage is evictable — Safari's ITP drops
// IndexedDB after ~7 idle days, Chrome evicts under pressure — so a scenario that has never been
// exported has no durable copy anywhere. The "never exported" warning is the only thing standing
// between an author and silent data loss, which is why it is a row-level badge and not a footnote.

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { type ScenarioMeta, storageEstimate } from '@udtc/scenario-store';
import { useCreatorStore } from '../store';
import { overlay, panel, dialogTitle, secondaryBtn } from '../components/modal';
import { ConfirmDialog } from '../components/ConfirmDialog';

export interface ScenarioListDialogProps {
  onClose: () => void;
  /** asked to confirm before discarding unsaved work */
  isDirty: boolean;
}

function relativeTime(ms: number): string {
  const secs = Math.round((Date.now() - ms) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString();
}

function sizeLabel(bytes: number): string {
  if (bytes === 0) return 'no art';
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}

export function ScenarioListDialog({ onClose, isDirty }: ScenarioListDialogProps) {
  const scenarioList = useCreatorStore((s) => s.scenarioList);
  const currentScenarioId = useCreatorStore((s) => s.currentScenarioId);
  const refreshScenarioList = useCreatorStore((s) => s.refreshScenarioList);
  const openScenario = useCreatorStore((s) => s.openScenario);
  const renameScenario = useCreatorStore((s) => s.renameScenario);
  const duplicateScenario = useCreatorStore((s) => s.duplicateScenario);
  const removeScenario = useCreatorStore((s) => s.removeScenario);

  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');
  const [pendingDelete, setPendingDelete] = useState<ScenarioMeta | null>(null);
  const [estimate, setEstimate] = useState<{ usage?: number; quota?: number } | null>(null);

  useEffect(() => {
    void refreshScenarioList();
    void storageEstimate().then(setEstimate);
  }, [refreshScenarioList]);

  const totalBytes = scenarioList.reduce((a, r) => a + r.imageBytes, 0);

  const doOpen = async (id: string) => {
    if (id === currentScenarioId) return onClose();
    if (isDirty && !window.confirm('Discard unsaved changes and open this scenario?')) return;
    const ok = await openScenario(id);
    if (!ok) {
      window.alert('That scenario could not be read — it may have been evicted or removed.');
      void refreshScenarioList();
      return;
    }
    onClose();
  };

  const commitRename = async (id: string) => {
    const next = renameTo.trim();
    if (!next) return;
    await renameScenario(id, next);
    setRenaming(null);
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={{ ...panel, width: 640, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={dialogTitle}>Scenarios</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
            {scenarioList.length} saved · {sizeLabel(totalBytes)} of art
            {estimate?.quota
              ? ` · ${Math.round((estimate.quota - (estimate.usage ?? 0)) / 1_000_000)} MB free`
              : ''}
          </span>
        </div>

        <div style={{ maxHeight: 380, overflowY: 'auto', margin: '0 -4px' }}>
          {scenarioList.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--c-text-faint)', padding: '18px 8px' }}>
              No saved scenarios yet. Use <strong>Save</strong> to add the one you&rsquo;re working
              on.
            </div>
          )}

          {scenarioList.map((row) => {
            const isOpen = row.id === currentScenarioId;
            return (
              <div key={row.id} style={{ ...rowStyle, ...(isOpen ? openRow : null) }}>
                <span
                  title={
                    row.allOk === null
                      ? 'Not validated yet'
                      : row.allOk
                        ? 'Valid'
                        : 'Has validation errors'
                  }
                  style={{
                    ...dot,
                    background:
                      row.allOk === null
                        ? 'var(--c-text-faint)'
                        : row.allOk
                          ? 'var(--c-ok, #3fb950)'
                          : 'var(--c-danger)',
                  }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  {renaming === row.id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        autoFocus
                        value={renameTo}
                        onChange={(e) => setRenameTo(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void commitRename(row.id);
                          if (e.key === 'Escape') setRenaming(null);
                        }}
                        style={renameInput}
                      />
                      <button style={smallBtn} onClick={() => void commitRename(row.id)}>
                        Save
                      </button>
                      <button style={smallBtn} onClick={() => setRenaming(null)}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <>
                      <div style={titleRow}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{row.title}</span>
                        {row.scenarioVersion && (
                          <span style={{ fontSize: 10, color: 'var(--c-text-faint)' }}>
                            v{row.scenarioVersion}
                          </span>
                        )}
                        {isOpen && <span style={badge}>open</span>}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--c-text-muted)', marginTop: 2 }}>
                        {relativeTime(row.updatedAt)} · {sizeLabel(row.imageBytes)}
                        {row.imageCount > 0 && ` (${row.imageCount})`} ·{' '}
                        {row.lastExportedAt ? (
                          `exported ${relativeTime(row.lastExportedAt)}`
                        ) : (
                          <span
                            style={{ color: 'var(--c-warn, #d29922)' }}
                            title="Browser storage can be cleared or evicted. Export to keep a durable copy."
                          >
                            never exported
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {renaming !== row.id && (
                  <>
                    <button style={smallBtn} onClick={() => void doOpen(row.id)} disabled={isOpen}>
                      Open
                    </button>
                    <button
                      style={smallBtn}
                      onClick={() => {
                        setRenaming(row.id);
                        setRenameTo(row.title);
                      }}
                    >
                      Rename
                    </button>
                    <button style={smallBtn} onClick={() => void duplicateScenario(row.id)}>
                      Duplicate
                    </button>
                    <button style={dangerBtn} onClick={() => setPendingDelete(row)}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: 'var(--c-text-faint)', flex: 1 }}>
            Saved in this browser. Export a scenario to keep a copy you can share or restore.
          </span>
          <button style={secondaryBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete scenario?"
          message={
            <>
              <strong>{pendingDelete.title}</strong> will be deleted from this browser.
              {!pendingDelete.lastExportedAt && (
                <>
                  {' '}
                  It has <strong>never been exported</strong>, so no copy of it exists anywhere
                  else.
                </>
              )}{' '}
              This cannot be undone.
            </>
          }
          onConfirm={() => {
            void removeScenario(pendingDelete.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 4px',
  borderBottom: '1px solid var(--c-border)',
};
const openRow: CSSProperties = { background: 'var(--c-surface)' };
const dot: CSSProperties = { width: 7, height: 7, borderRadius: '50%', flexShrink: 0 };
const titleRow: CSSProperties = { display: 'flex', alignItems: 'baseline', gap: 6 };
const badge: CSSProperties = {
  fontSize: 9,
  padding: '1px 5px',
  borderRadius: 3,
  background: 'var(--c-primary)',
  color: 'var(--c-primary-fg)',
};
const smallBtn: CSSProperties = {
  padding: '4px 9px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 11,
  cursor: 'pointer',
};
const dangerBtn: CSSProperties = {
  padding: '4px 9px',
  border: '1px solid var(--c-danger)',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-danger)',
  fontSize: 11,
  cursor: 'pointer',
};
const renameInput: CSSProperties = {
  flex: 1,
  padding: '3px 5px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  fontSize: 12,
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
};
