import { getUDTReferenceLayer } from '@udtc/adapters';
import { activeBoardLocationNames } from '../../boards/vocabulary';
import { asObj } from '../../utils/objectHelpers';
import type { ScenarioDoc, SchemaNode } from '../../types';

const FOE_STATUSES = ['panicked', 'unsteady', 'ready', 'savage', 'lethal'] as const;

type SpawnRow = { foeId?: string; location?: string; status?: string };

// The foes an author can place = those the scenario declares (library.foes keys ∪ tier selections),
// falling back to the full UDT foe roster if the scenario hasn't declared any yet.
function scenarioFoeIds(schemaDoc: ScenarioDoc): string[] {
  const foesLib = asObj(asObj(schemaDoc.library)?.['foes']);
  const fromLib = foesLib ? Object.keys(foesLib) : [];

  const foesSel = asObj(asObj(schemaDoc.setup['selections'])?.['foes']);
  const fromSel = foesSel
    ? ['tier1', 'tier2', 'tier3']
        .map((k) => foesSel[k])
        .filter((v): v is string => typeof v === 'string')
    : [];

  const ids = [...new Set([...fromLib, ...fromSel])];
  return ids.length ? ids : Object.keys(getUDTReferenceLayer().foeById);
}

export function BoardSetupEditor({
  sn,
  schemaDoc,
  onUpdate,
}: {
  sn: SchemaNode;
  schemaDoc: ScenarioDoc;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const raw = sn.props?.spawns;
  const spawns: SpawnRow[] = Array.isArray(raw) ? (raw as SpawnRow[]) : [];
  const foeIds = scenarioFoeIds(schemaDoc);
  // The active board's vocabulary — a custom board's own names, else the built-in RtDT roster.
  const locationNames = [...activeBoardLocationNames(schemaDoc)];

  const commit = (next: SpawnRow[]) => onUpdate({ spawns: next });
  const updateRow = (i: number, patch: SpawnRow) =>
    commit(spawns.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    commit([...spawns, { foeId: foeIds[0] ?? '', location: locationNames[0] ?? '' }]);
  const removeRow = (i: number) => commit(spawns.filter((_, idx) => idx !== i));

  // Keep a hand-authored foe/location that isn't in the option list visible + selectable.
  const withCurrent = (options: string[], current?: string) =>
    current && !options.includes(current) ? [current, ...options] : options;

  const selectStyle = {
    flex: 1,
    minWidth: 0,
    padding: '3px 4px',
    border: '1px solid var(--c-border-strong)',
    borderRadius: 4,
    fontSize: 11,
    background: 'var(--c-surface-raised)',
    color: 'var(--c-text)',
  } as const;

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
        Foe Spawns (setup)
      </div>
      {spawns.length === 0 && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--c-text-faint)',
            fontStyle: 'italic',
            marginBottom: 6,
          }}
        >
          No foes placed at setup.
        </div>
      )}
      {spawns.map((row, i) => (
        <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
          <select
            value={row.foeId ?? ''}
            onChange={(e) => updateRow(i, { foeId: e.target.value })}
            style={selectStyle}
            title="Foe"
          >
            {withCurrent(foeIds, row.foeId).map((id) => (
              <option key={id} value={id}>
                {id}
              </option>
            ))}
          </select>
          <select
            value={row.location ?? ''}
            onChange={(e) => updateRow(i, { location: e.target.value })}
            style={selectStyle}
            title="Board location"
          >
            {withCurrent(locationNames, row.location).map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
          <select
            value={row.status ?? 'ready'}
            onChange={(e) => updateRow(i, { status: e.target.value })}
            style={selectStyle}
            title="Starting status"
          >
            {FOE_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
          <button
            onClick={() => removeRow(i)}
            title="Remove spawn"
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
      ))}
      <button
        onClick={addRow}
        style={{
          marginTop: 4,
          padding: '4px 10px',
          border: '1px solid var(--c-border-strong)',
          borderRadius: 4,
          fontSize: 11,
          cursor: 'pointer',
          background: 'var(--c-surface-raised)',
          color: 'var(--c-text-2)',
        }}
      >
        + Add spawn
      </button>
    </div>
  );
}
