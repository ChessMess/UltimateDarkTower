import { useCallback } from 'react';

const TOWER_CHANNELS = [
  'skull.dropTrigger',
  'light.named',
  'sound',
  'drum.rotate',
  'seal.break',
  'seal.replace',
  'wait',
  'rotationBundle',
  'timeline',
  'light.custom',
  'light.effect',
];

export function TowerOpEditor({
  sn,
  onUpdate,
}: {
  sn: { props?: Record<string, unknown> };
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const towerOp = sn.props?.towerOp as Record<string, unknown> | undefined;
  const currentChannel = (towerOp?.channel as string) ?? 'skull.dropTrigger';

  const handleChannelChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const newOp: Record<string, unknown> = { channel: e.target.value };
      onUpdate({ towerOp: newOp });
    },
    [onUpdate],
  );

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--c-border)' }}>
      <div
        style={{
          fontSize: 10,
          color: 'var(--c-text-faint)',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}
      >
        Tower Channel
      </div>
      <select
        value={currentChannel}
        onChange={handleChannelChange}
        style={{
          width: '100%',
          padding: '4px 8px',
          border: '1px solid var(--c-border-strong)',
          borderRadius: 4,
          fontSize: 12,
          background: 'var(--c-surface-raised)',
          color: 'var(--c-text)',
        }}
      >
        {TOWER_CHANNELS.map((ch) => (
          <option key={ch} value={ch}>
            {ch}
          </option>
        ))}
      </select>
    </div>
  );
}
