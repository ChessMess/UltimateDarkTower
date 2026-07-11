// ImagePicker — a popover over library.resources.images ids with thumbnails, plus a "Manage images…"
// entry that opens the asset manager. Only offers existing image ids (C2: pickers never mint dangling
// refs); a dangling current value still shows so it can be cleared.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { smallBtn } from './shared';

export interface ImagePickerProps {
  images: Record<string, string>;
  value: string | undefined;
  onChange: (key: string | undefined) => void;
  onManage: () => void;
  label?: string;
}

export function ImagePicker({ images, value, onChange, onManage, label }: ImagePickerProps) {
  const [open, setOpen] = useState(false);
  const ids = Object.keys(images);
  const currentUrl = value ? images[value] : undefined;

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button style={{ ...smallBtn, display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => setOpen((o) => !o)}>
        {currentUrl ? (
          <img src={currentUrl} alt={value} style={thumb} />
        ) : (
          <span style={{ ...thumb, background: 'var(--c-surface)', border: '1px dashed var(--c-border-strong)' }} />
        )}
        <span style={{ fontSize: 11 }}>{value || label || 'no image'}</span>
        <span style={{ fontSize: 9, color: 'var(--c-text-faint)' }}>▾</span>
      </button>
      {open && (
        <>
          <div style={backdrop} onClick={() => setOpen(false)} />
          <div style={panel}>
            <button
              style={{ ...pickItem, color: 'var(--c-text-muted)' }}
              onClick={() => {
                onChange(undefined);
                setOpen(false);
              }}
            >
              <span style={{ ...thumb, background: 'var(--c-surface)', border: '1px dashed var(--c-border-strong)' }} />
              none
            </button>
            {value && !ids.includes(value) && (
              <div style={{ ...pickItem, color: 'var(--c-danger)' }}>
                <span style={{ ...thumb, background: 'var(--c-surface)' }} />
                {value} (missing)
              </div>
            )}
            {ids.map((id) => (
              <button
                key={id}
                style={{ ...pickItem, fontWeight: id === value ? 700 : 400 }}
                onClick={() => {
                  onChange(id);
                  setOpen(false);
                }}
              >
                <img src={images[id]} alt={id} style={thumb} />
                {id}
              </button>
            ))}
            {ids.length === 0 && (
              <div style={{ padding: 8, fontSize: 11, color: 'var(--c-text-faint)' }}>No images yet.</div>
            )}
            <button
              style={{ ...pickItem, borderTop: '1px solid var(--c-border)', color: 'var(--c-primary)' }}
              onClick={() => {
                onManage();
                setOpen(false);
              }}
            >
              Manage images…
            </button>
          </div>
        </>
      )}
    </div>
  );
}

const thumb: CSSProperties = {
  width: 24,
  height: 34,
  objectFit: 'cover',
  borderRadius: 3,
  display: 'inline-block',
  flex: '0 0 auto',
};
const backdrop: CSSProperties = { position: 'fixed', inset: 0, zIndex: 40 };
const panel: CSSProperties = {
  position: 'absolute',
  top: '100%',
  left: 0,
  marginTop: 4,
  minWidth: 200,
  maxHeight: 280,
  overflowY: 'auto',
  background: 'var(--c-surface-raised)',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 6,
  boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
  zIndex: 41,
  padding: 4,
};
const pickItem: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '5px 6px',
  border: 'none',
  background: 'transparent',
  color: 'var(--c-text)',
  fontSize: 11,
  cursor: 'pointer',
  textAlign: 'left',
};
