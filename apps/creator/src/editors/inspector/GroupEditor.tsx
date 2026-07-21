import type { SchemaNode, GroupProps } from '../../types';

const GROUP_COLOR_PRESETS = ['#3D5A80', '#2E7D32', '#D97706', '#7C3AED', '#DC2626', '#6B7280'];

export function GroupEditor({
  sn,
  allNodes,
  onUpdate,
}: {
  sn: SchemaNode;
  allNodes: SchemaNode[];
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const props = sn.props as GroupProps | undefined;
  const color = props?.color ?? '#6B7280';
  const memberIds = props?.nodeIds ?? [];
  const byId = new Map(allNodes.map((n) => [n.id, n]));

  const setMembers = (ids: string[]) => onUpdate({ nodeIds: ids });
  const removeMember = (id: string) => setMembers(memberIds.filter((m) => m !== id));
  const addMember = (id: string) => {
    if (!id || memberIds.includes(id)) return;
    setMembers([...memberIds, id].sort());
  };

  const eligible = allNodes.filter(
    (n) => n.id !== sn.id && n.kind !== 'util.group' && !memberIds.includes(n.id),
  );

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--c-border)' }}>
      <div
        style={{
          fontSize: 10,
          color: 'var(--c-text-faint)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Group Color
      </div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {GROUP_COLOR_PRESETS.map((c) => (
          <button
            key={c}
            onClick={() => onUpdate({ color: c })}
            title={c}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: c,
              border: c === color ? '2px solid var(--c-text)' : '2px solid transparent',
              cursor: 'pointer',
              padding: 0,
            }}
          />
        ))}
      </div>

      <div
        style={{
          fontSize: 10,
          color: 'var(--c-text-faint)',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Members ({memberIds.length})
      </div>
      {memberIds.length === 0 && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--c-text-faint)',
            fontStyle: 'italic',
            marginBottom: 6,
          }}
        >
          No members yet.
        </div>
      )}
      {memberIds.map((id) => {
        const member = byId.get(id);
        return (
          <div key={id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <span
              style={{
                flex: 1,
                fontSize: 11,
                fontFamily: 'monospace',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {member?.label || id}
            </span>
            <button
              onClick={() => removeMember(id)}
              title="Remove from group"
              style={{
                padding: '2px 6px',
                border: '1px solid #FCA5A5',
                borderRadius: 4,
                fontSize: 11,
                cursor: 'pointer',
                background: '#FEF2F2',
                color: 'var(--c-danger)',
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
      {eligible.length > 0 && (
        <select
          value=""
          onChange={(e) => addMember(e.target.value)}
          style={{
            width: '100%',
            marginTop: 4,
            padding: '4px 8px',
            border: '1px solid var(--c-border-strong)',
            borderRadius: 4,
            fontSize: 11,
            background: 'var(--c-surface-raised)',
            color: 'var(--c-text)',
          }}
        >
          <option value="">+ Add node…</option>
          {eligible.map((n) => (
            <option key={n.id} value={n.id}>
              {n.label || n.id}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
