interface Props {
  title: string;
  savedAt: string;
  onRestore: () => void;
  onDiscard: () => void;
}

export function RecoveryDialog({ title, savedAt, onRestore, onDiscard }: Props) {
  const savedAtLabel = new Date(savedAt).toLocaleString();

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 10,
          boxShadow: '0 8px 40px rgba(0,0,0,0.25)',
          width: 440,
          padding: '24px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, color: '#111827' }}>Restore unsaved work?</div>
        <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>
          We found unsaved changes to <strong>{title}</strong>, autosaved on {savedAtLabel}. Would
          you like to restore them, or discard and start clean?
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
          <button
            onClick={onDiscard}
            style={{ padding: '7px 18px', border: '1px solid #D1D5DB', borderRadius: 6, background: '#F9FAFB', cursor: 'pointer', fontSize: 13 }}
          >
            Discard
          </button>
          <button
            onClick={onRestore}
            style={{
              padding: '7px 18px',
              border: '1px solid #2563EB',
              borderRadius: 6,
              background: '#2563EB',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Restore
          </button>
        </div>
      </div>
    </div>
  );
}
