import { useState } from 'react';

// A titled section with a chevron toggle. Collapsed, it optionally shows a one-line summary; the
// caller decides the default open state. Used in InspectorPanel's no-node view to keep the
// scenario-wide editors (meta, setup, battle decks) compact without hiding what each contains.
export function CollapsibleSection({
  title,
  defaultOpen = false,
  collapsedSummary,
  sectionStyle,
  labelStyle,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  collapsedSummary?: React.ReactNode;
  sectionStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={sectionStyle}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          width: '100%',
          padding: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ width: 10, fontSize: 10, color: 'var(--c-text-muted)' }}>
          {open ? '▾' : '▸'}
        </span>
        <span style={{ ...labelStyle, marginBottom: 0 }}>{title}</span>
      </button>
      {open ? (
        <div style={{ marginTop: 8 }}>{children}</div>
      ) : collapsedSummary ? (
        <div style={{ marginTop: 6, fontSize: 11, color: 'var(--c-text-muted)', paddingLeft: 16 }}>
          {collapsedSummary}
        </div>
      ) : null}
    </div>
  );
}
