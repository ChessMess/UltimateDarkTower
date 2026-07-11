// AssetManagerDialog — upload (resize→WebP data URL), rename, and delete images in
// library.resources.images. Delete/rename run a usage scan across artRef/backRef/bitmapSlice/
// masterBitmap/imageRef and WARN (never block). Shows per-image KB + a running total vs the ~5 MB
// draft budget so authors can see the localStorage pressure the risks note calls out.

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { ScenarioDoc } from '../types';
import { slugify } from '../utils/scaffold';
import { resizeAndEncode } from './imageUtils';
import { IMAGE_BUDGET_BYTES, byteLen, smallBtn, primaryBtn, dangerBtn, ID_RE } from './shared';
import { ConfirmDialog } from '../components/ConfirmDialog';

const REF_KEYS = new Set(['artRef', 'backRef', 'bitmapSlice', 'masterBitmap', 'imageRef']);

function countUsage(node: unknown, id: string): number {
  if (Array.isArray(node)) return node.reduce((a: number, c) => a + countUsage(c, id), 0);
  if (node && typeof node === 'object') {
    let n = 0;
    for (const [k, v] of Object.entries(node)) {
      if (REF_KEYS.has(k) && v === id) n += 1;
      else n += countUsage(v, id);
    }
    return n;
  }
  return 0;
}

export interface AssetManagerDialogProps {
  doc: ScenarioDoc | null;
  images: Record<string, string>;
  onSetImage: (id: string, dataUrlOrNull: string | null) => void;
  onClose: () => void;
}

export function AssetManagerDialog({ doc, images, onSetImage, onClose }: AssetManagerDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameTo, setRenameTo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const ids = Object.keys(images);
  const total = ids.reduce((a, id) => a + byteLen(images[id]), 0);

  const uniqueId = (base: string): string => {
    let id = base || 'image';
    let i = 2;
    while (images[id]) id = `${base}-${i++}`;
    return id;
  };

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const url = await resizeAndEncode(file, { maxW: 750, maxH: 1050, capBytes: 250_000 });
      const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'image';
      onSetImage(uniqueId(base), url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'upload failed');
    } finally {
      setBusy(false);
    }
  };

  const doRename = (oldId: string) => {
    const next = renameTo.trim();
    if (!next || !ID_RE.test(next) || images[next]) {
      setError('rename needs a unique kebab-case id');
      return;
    }
    const url = images[oldId];
    onSetImage(next, url);
    onSetImage(oldId, null);
    setRenaming(null);
    setRenameTo('');
    setError(null);
  };

  const doDelete = (id: string) => {
    if (countUsage(doc, id) > 0) setPendingDeleteId(id);
    else onSetImage(id, null);
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <strong style={{ fontSize: 14 }}>Images</strong>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: total > IMAGE_BUDGET_BYTES ? 'var(--c-danger)' : 'var(--c-text-muted)' }}>
            {kb(total)} / ~{Math.round(IMAGE_BUDGET_BYTES / 1_000_000)} MB
          </span>
        </div>

        <div style={budgetBar}>
          <div
            style={{
              width: `${Math.min(100, (total / IMAGE_BUDGET_BYTES) * 100)}%`,
              height: '100%',
              background: total > IMAGE_BUDGET_BYTES ? 'var(--c-danger)' : 'var(--c-primary)',
              borderRadius: 3,
            }}
          />
        </div>

        <div style={{ maxHeight: 320, overflowY: 'auto', margin: '10px 0' }}>
          {ids.length === 0 && (
            <div style={{ fontSize: 12, color: 'var(--c-text-faint)', padding: 8 }}>
              No images yet. Upload a PNG/JPG — it lands as a compact WebP data URL embedded in the scenario.
            </div>
          )}
          {ids.map((id) => {
            const uses = countUsage(doc, id);
            return (
              <div key={id} style={imageRow}>
                <img src={images[id]} alt={id} style={{ width: 40, height: 56, objectFit: 'cover', borderRadius: 4 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  {renaming === id ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <input
                        autoFocus
                        value={renameTo}
                        onChange={(e) => setRenameTo(e.target.value)}
                        placeholder="new-id"
                        style={renameInput}
                      />
                      <button style={smallBtn} onClick={() => doRename(id)}>Save</button>
                      <button style={smallBtn} onClick={() => setRenaming(null)}>✕</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: 12, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {id}
                      </div>
                      <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>
                        {kb(byteLen(images[id]))} · {uses} use{uses === 1 ? '' : 's'}
                      </div>
                    </>
                  )}
                </div>
                {renaming !== id && (
                  <>
                    <button style={smallBtn} onClick={() => { setRenaming(id); setRenameTo(id); setError(null); }}>
                      Rename
                    </button>
                    <button style={dangerBtn} onClick={() => doDelete(id)}>Delete</button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {error && <div style={{ color: 'var(--c-danger)', fontSize: 11, marginBottom: 8 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={primaryBtn} disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? 'Encoding…' : 'Upload image'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={onUpload}
          />
          <span style={{ flex: 1 }} />
          <button style={smallBtn} onClick={onClose}>Close</button>
        </div>
      </div>

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete image?"
          message={
            <>
              <strong>{pendingDeleteId}</strong> is referenced {countUsage(doc, pendingDeleteId)} time(s). Those
              refs will show a placeholder. This cannot be undone.
            </>
          }
          onConfirm={() => {
            onSetImage(pendingDeleteId, null);
            setPendingDeleteId(null);
          }}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </div>
  );
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(0)} KB`;

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};
const dialog: CSSProperties = {
  width: 460,
  maxWidth: '92vw',
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 10,
  padding: 16,
  boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
};
const budgetBar: CSSProperties = {
  height: 6,
  background: 'var(--c-surface)',
  borderRadius: 3,
  overflow: 'hidden',
};
const imageRow: CSSProperties = {
  display: 'flex',
  gap: 10,
  alignItems: 'center',
  padding: '6px 0',
  borderBottom: '1px solid var(--c-border)',
};
const renameInput: CSSProperties = {
  flex: 1,
  padding: '3px 5px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  fontSize: 11,
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
};
