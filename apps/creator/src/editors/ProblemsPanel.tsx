import { useCreatorStore } from '../store';

export function ProblemsPanel() {
  const { validationResults, selectNode } = useCreatorStore();

  if (!validationResults) {
    return (
      <div style={{ padding: '6px 12px', color: '#94A3B8', fontSize: 11, fontStyle: 'italic' }}>
        No scenario loaded
      </div>
    );
  }

  const { l1, l2, l3, allOk } = validationResults;
  const totalErrors = l1.errors.length + l2.errors.length + l3.errors.length;

  if (allOk) {
    return (
      <div style={{ padding: '6px 12px', color: '#059669', fontSize: 12, fontWeight: 600 }}>
        ✓ All validation layers pass — Export is enabled
      </div>
    );
  }

  function extractNodeId(err: string): string | null {
    const m = err.match(/"([a-z0-9]+(?:[-_][a-z0-9]+)*)"/);
    return m ? m[1] : null;
  }

  function renderLayer(
    label: string,
    result: { ok: boolean; errors: string[] },
    color: string,
    level: 'L1' | 'L2' | 'L3',
  ) {
    if (result.ok) {
      return (
        <span style={{ fontSize: 11, color: '#059669', marginRight: 12 }}>
          {level} ✓
        </span>
      );
    }
    return (
      <div style={{ marginBottom: 4 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color,
            padding: '3px 8px',
            background: '#FEF2F2',
            borderLeft: `3px solid ${color}`,
          }}
        >
          {level} — {label} ({result.errors.length} error{result.errors.length > 1 ? 's' : ''})
        </div>
        {result.errors.map((e, i) => {
          const nodeId = extractNodeId(e);
          return (
            <div
              key={i}
              style={{
                padding: '2px 8px 2px 16px',
                fontSize: 11,
                color: '#B91C1C',
                cursor: nodeId ? 'pointer' : 'default',
                textDecoration: nodeId ? 'underline' : 'none',
              }}
              onClick={() => nodeId && selectNode(nodeId)}
              title={nodeId ? `Click to select ${nodeId}` : undefined}
            >
              {e}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowY: 'auto', height: '100%' }}>
      <div
        style={{
          padding: '4px 12px',
          borderBottom: '1px solid #E2E8F0',
          fontSize: 11,
          color: '#DC2626',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        ⚠ {totalErrors} problem{totalErrors !== 1 ? 's' : ''} — Export blocked
        <span style={{ fontSize: 10, color: '#64748B', fontWeight: 400 }}>
          {!l1.ok && '[L1 Schema] '}
          {!l2.ok && '[L2 Refs] '}
          {!l3.ok && '[L3 Graph]'}
        </span>
      </div>
      {renderLayer('Schema', l1, '#7C3AED', 'L1')}
      {renderLayer('References', l2, '#DC2626', 'L2')}
      {renderLayer('Graph', l3, '#D97706', 'L3')}
    </div>
  );
}
