import { getUDTReferenceLayer } from '@udtc/adapters';
import { asObj } from '../../utils/objectHelpers';
import type { ScenarioDoc, SchemaNode } from '../../types';

// The heroes already declared for this scenario (library.heroes keys), falling back to the full
// UDT hero roster if the scenario hasn't declared any yet — mirrors scenarioFoeIds (BoardSetupEditor).
function scenarioHeroIds(schemaDoc: ScenarioDoc): string[] {
  const heroesLib = asObj(asObj(schemaDoc.library)?.['heroes']);
  const fromLib = heroesLib ? Object.keys(heroesLib) : [];

  return fromLib.length ? fromLib : Object.keys(getUDTReferenceLayer().heroById);
}

export function SelectHeroEditor({
  sn,
  schemaDoc,
  onUpdate,
  onSyncLibraryHeroes,
}: {
  sn: SchemaNode;
  schemaDoc: ScenarioDoc;
  onUpdate: (props: Record<string, unknown>) => void;
  onSyncLibraryHeroes: (heroIds: string[]) => void;
}) {
  const raw = sn.props?.heroIds;
  const heroIds: string[] = Array.isArray(raw) ? (raw as string[]) : [];
  const heroById = getUDTReferenceLayer().heroById;
  const candidates = scenarioHeroIds(schemaDoc);

  const commit = (next: string[]) => {
    onUpdate({ heroIds: next });
    onSyncLibraryHeroes(next);
  };
  const addHero = (id: string) => {
    if (id && !heroIds.includes(id)) commit([...heroIds, id]);
  };
  const removeHero = (id: string) => commit(heroIds.filter((h) => h !== id));

  const available = candidates.filter((id) => !heroIds.includes(id));

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
        Hero Candidate Pool (setup)
      </div>
      {heroIds.length === 0 && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--c-text-faint)',
            fontStyle: 'italic',
            marginBottom: 6,
          }}
        >
          No heroes in the pool yet — add at least one.
        </div>
      )}
      {heroIds.map((id) => {
        const h = heroById[id];
        return (
          <div key={id} style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
            <span style={{ flex: 1, fontSize: 11 }}>
              {h?.name ?? id} <code style={{ color: 'var(--c-text-faint)' }}>{id}</code>
            </span>
            <button
              onClick={() => removeHero(id)}
              title="Remove from pool"
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
      {available.length > 0 && (
        <select value="" onChange={(e) => addHero(e.target.value)} style={selectStyle}>
          <option value="" disabled>
            + Add hero…
          </option>
          {available.map((id) => {
            const h = heroById[id];
            return (
              <option key={id} value={id}>
                {h ? `${h.name} (${h.source})` : id}
              </option>
            );
          })}
        </select>
      )}
    </div>
  );
}
