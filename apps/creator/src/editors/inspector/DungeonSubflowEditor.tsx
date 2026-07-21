import type { ScenarioDoc } from '../../types';

export function DungeonSubflowEditor({
  sn,
  schemaDoc,
  onUpdate,
  onEditInBuilder,
}: {
  sn: { props?: Record<string, unknown> };
  schemaDoc: ScenarioDoc | null;
  onUpdate: (props: Record<string, unknown>) => void;
  onEditInBuilder: (dungeonId: string) => void;
}) {
  const dungeons = ((schemaDoc?.library as Record<string, unknown> | undefined)?.dungeons ??
    {}) as Record<string, { name?: string }>;
  const ids = Object.keys(dungeons);
  const current = typeof sn.props?.dungeonId === 'string' ? (sn.props.dungeonId as string) : '';
  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: 0.04,
    textTransform: 'uppercase',
    color: 'var(--c-text-faint)',
    margin: '0 0 4px',
  };
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '4px 6px',
    border: '1px solid var(--c-border-strong)',
    borderRadius: 4,
    fontSize: 12,
    background: 'var(--c-surface-raised)',
    color: 'var(--c-text)',
    boxSizing: 'border-box',
  };
  return (
    <div style={{ marginTop: 12 }}>
      <div style={labelStyle}>Dungeon</div>
      <select
        style={inputStyle}
        value={current}
        onChange={(e) => onUpdate({ dungeonId: e.target.value })}
      >
        <option value="">— select a dungeon —</option>
        {ids.map((id) => (
          <option key={id} value={id}>
            {dungeons[id].name || id}
          </option>
        ))}
      </select>
      {current && (
        <button
          style={{ ...inputStyle, cursor: 'pointer', marginTop: 8 }}
          onClick={() => onEditInBuilder(current)}
        >
          Edit in Dungeon Builder →
        </button>
      )}
      {ids.length === 0 && (
        <p style={{ fontSize: 11, color: 'var(--c-text-faint)', marginTop: 6 }}>
          No dungeons yet — create one in the Dungeons workspace.
        </p>
      )}
    </div>
  );
}
