import { useCallback } from 'react';
import { getUDTReferenceLayer } from '@udtc/adapters';
import { useCreatorStore } from '../store';
import { categoryFor } from '../types';
import type { ScenarioDoc, SchemaNode, GroupProps } from '../types';

// Standard-game selection option lists — resolved once at load, like NewScenarioDialog.
const udtRef = getUDTReferenceLayer();
const ADVERSARY_OPTIONS = udtRef.adversaryRoster.map((a) => ({ id: a.id, name: a.name }));
const ALLY_OPTIONS = udtRef.allies.map((name) => ({ id: name.toLowerCase(), name }));
// The seed tier lists (udtRef.tierNFoes) are display names, whereas foeById is keyed by id, so
// resolve names → canonical foe via a name→foe map. Option ids must be foe ids ("brigands"), not
// names, to match what scenarios store in setup.selections.foes.
const foeByName: Record<string, { id: string; name: string }> = {};
for (const f of Object.values(udtRef.foeById)) foeByName[f.name] = f;
const foeOptions = (names: readonly string[]) =>
  names.map((n) => ({ id: foeByName[n]?.id ?? n, name: foeByName[n]?.name ?? n }));
const TIER1_OPTIONS = foeOptions(udtRef.tier1Foes);
const TIER2_OPTIONS = foeOptions(udtRef.tier2Foes);
const TIER3_OPTIONS = foeOptions(udtRef.tier3Foes);

export function InspectorPanel() {
  const { schemaDoc, rfNodes, selectedNodeId, validationResults } = useCreatorStore();
  const {
    updateNodeLabel,
    updateNodeProps,
    updateNodeDescription,
    updateScenarioDescription,
    updateSetupSelections,
    updateMainGoal,
    setEntry,
    deleteNode,
    syncLibraryHeroes,
  } = useCreatorStore();

  const selectedNode = rfNodes.find((n) => n.id === selectedNodeId);
  const sn = selectedNode?.data?.schemaNode;

  const handleLabelChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (sn) updateNodeLabel(sn.id, e.target.value);
    },
    [sn, updateNodeLabel],
  );

  const handleDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (sn) updateNodeDescription(sn.id, e.target.value);
    },
    [sn, updateNodeDescription],
  );

  const handleScenarioDescriptionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      updateScenarioDescription(e.target.value);
    },
    [updateScenarioDescription],
  );

  const handleSetEntry = useCallback(() => {
    if (sn) setEntry(sn.id);
  }, [sn, setEntry]);

  const handleDelete = useCallback(() => {
    if (sn && window.confirm(`Delete node "${sn.id}"?`)) deleteNode(sn.id);
  }, [sn, deleteNode]);

  const nodeErrors = sn
    ? [...(validationResults?.l2.errors ?? []), ...(validationResults?.l3.errors ?? [])].filter(
        (e) => e.includes(`"${sn.id}"`),
      )
    : [];

  const style = {
    panel: {
      width: 260,
      background: 'var(--c-surface)',
      borderLeft: '1px solid var(--c-border)',
      display: 'flex',
      flexDirection: 'column' as const,
      fontSize: 12,
      overflowY: 'auto' as const,
    },
    header: {
      padding: '10px 12px 6px',
      fontWeight: 700,
      fontSize: 11,
      letterSpacing: '0.08em',
      color: 'var(--c-text-muted)',
      textTransform: 'uppercase' as const,
      borderBottom: '1px solid var(--c-border)',
    },
    section: {
      padding: '10px 12px',
      borderBottom: '1px solid var(--c-border)',
    },
    label: {
      fontSize: 10,
      color: 'var(--c-text-faint)',
      textTransform: 'uppercase' as const,
      letterSpacing: '0.06em',
      marginBottom: 4,
    },
    value: {
      fontSize: 12,
      color: 'var(--c-text)',
    },
    input: {
      width: '100%',
      padding: '4px 8px',
      border: '1px solid var(--c-border-strong)',
      borderRadius: 4,
      fontSize: 12,
      fontFamily: 'inherit',
      background: 'var(--c-surface-raised)',
      color: 'var(--c-text)',
      boxSizing: 'border-box' as const,
    },
    textarea: {
      width: '100%',
      padding: '4px 8px',
      border: '1px solid var(--c-border-strong)',
      borderRadius: 4,
      fontSize: 12,
      fontFamily: 'inherit',
      background: 'var(--c-surface-raised)',
      color: 'var(--c-text)',
      boxSizing: 'border-box' as const,
      resize: 'vertical' as const,
    },
    btn: {
      padding: '4px 10px',
      border: '1px solid var(--c-border-strong)',
      borderRadius: 4,
      fontSize: 11,
      cursor: 'pointer',
      background: 'var(--c-surface-raised)',
      color: 'var(--c-text-2)',
    },
    btnDanger: {
      padding: '4px 10px',
      border: '1px solid #FCA5A5',
      borderRadius: 4,
      fontSize: 11,
      cursor: 'pointer',
      background: '#FEF2F2',
      color: 'var(--c-danger)',
    },
  };

  if (!schemaDoc) {
    return (
      <div style={style.panel}>
        <div style={style.header}>Inspector</div>
        <div style={{ padding: 12, color: 'var(--c-text-faint)', fontStyle: 'italic', fontSize: 11 }}>
          No scenario loaded
        </div>
      </div>
    );
  }

  if (!sn) {
    return (
      <div style={style.panel}>
        <div style={style.header}>Inspector</div>
        <div style={{ padding: 12, color: 'var(--c-text-faint)', fontStyle: 'italic', fontSize: 11 }}>
          Select a node to inspect
        </div>

        {/* Scenario meta */}
        <div style={style.section}>
          <div style={style.label}>Scenario</div>
          <div style={{ ...style.value, fontWeight: 700 }}>{schemaDoc.meta.title}</div>
          <div style={{ color: 'var(--c-text-muted)', marginTop: 2 }}>v{schemaDoc.meta.scenarioVersion}</div>
          <div style={{ color: 'var(--c-text-muted)' }}>by {schemaDoc.meta.designer?.name}</div>
          <div style={{ marginTop: 6, color: 'var(--c-text-muted)' }}>Entry: <code>{schemaDoc.graph.entry}</code></div>
          <div style={{ color: 'var(--c-text-muted)' }}>{schemaDoc.graph.nodes.length} nodes</div>
        </div>

        <div style={style.section}>
          <div style={style.label}>Description</div>
          <textarea
            style={style.textarea}
            value={schemaDoc.meta.description ?? ''}
            onChange={handleScenarioDescriptionChange}
            rows={5}
            placeholder="What is this scenario about? Shown to future authors, not players."
          />
        </div>

        {/* Setup — standard-game selections (all optional since schema 0.4.1). Leave blank for a
            rule-variant scenario that doesn't use these mechanics. */}
        <ScenarioSetupEditor
          schemaDoc={schemaDoc}
          sectionStyle={style.section}
          labelStyle={style.label}
          inputStyle={style.input}
          updateSetupSelections={updateSetupSelections}
          updateMainGoal={updateMainGoal}
        />

        {/* L1 errors */}
        {validationResults && validationResults.l1.errors.length > 0 && (
          <div style={{ ...style.section, background: '#FEF2F2' }}>
            <div style={{ ...style.label, color: 'var(--c-danger)' }}>L1 Schema Errors</div>
            {validationResults.l1.errors.slice(0, 5).map((e, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--c-danger)', marginBottom: 2 }}>
                {e}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const cat = categoryFor(sn.kind);
  const isEntry = sn.id === schemaDoc.graph.entry;

  return (
    <div style={style.panel}>
      <div style={{ ...style.header, background: cat.bgColor, color: cat.textColor, borderLeft: `3px solid ${cat.color}` }}>
        Inspector — {cat.label}
      </div>

      {nodeErrors.length > 0 && (
        <div style={{ padding: '8px 12px', background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
          {nodeErrors.map((e, i) => (
            <div key={i} style={{ fontSize: 11, color: 'var(--c-danger)' }}>⚠ {e}</div>
          ))}
        </div>
      )}

      <div style={style.section}>
        <div style={style.label}>Kind</div>
        <div style={{ ...style.value, fontFamily: 'monospace' }}>{sn.kind}</div>
      </div>

      <div style={style.section}>
        <div style={style.label}>ID</div>
        <div style={{ ...style.value, fontFamily: 'monospace' }}>{sn.id}</div>
      </div>

      <div style={style.section}>
        <div style={style.label}>{sn.kind === 'util.comment' ? 'Headline' : 'Label'}</div>
        <input
          style={style.input}
          value={sn.label ?? ''}
          onChange={handleLabelChange}
          placeholder={sn.kind === 'util.comment' ? 'Comment headline' : 'Optional display label'}
        />
      </div>

      <div style={style.section}>
        <div style={style.label}>{sn.kind === 'util.comment' ? 'Note' : 'Description'}</div>
        <textarea
          style={style.textarea}
          value={sn.description ?? ''}
          onChange={handleDescriptionChange}
          rows={sn.kind === 'util.comment' ? 8 : 4}
          placeholder={
            sn.kind === 'util.comment'
              ? 'Body of the sticky note — author documentation, no runtime meaning.'
              : 'Author-facing notes about this node.'
          }
        />
      </div>

      {sn.kind === 'util.group' && (
        <GroupEditor sn={sn} allNodes={rfNodes.map((n) => n.data.schemaNode)} onUpdate={(props) => updateNodeProps(sn.id, props)} />
      )}

      {sn.props && sn.kind !== 'util.group' && sn.kind !== 'util.comment' && (
        <div style={style.section}>
          <div style={style.label}>Props</div>
          <pre
            style={{
              fontSize: 10,
              background: 'var(--c-surface)',
              padding: 8,
              borderRadius: 4,
              overflow: 'auto',
              maxHeight: 180,
              margin: 0,
              color: 'var(--c-text)',
            }}
          >
            {JSON.stringify(sn.props, null, 2)}
          </pre>
        </div>
      )}

      {sn.wires && Object.keys(sn.wires).length > 0 && (
        <div style={style.section}>
          <div style={style.label}>Wires</div>
          {Object.entries(sn.wires).map(([handle, targets]) => (
            <div key={handle} style={{ fontSize: 11, color: 'var(--c-text)', marginBottom: 2 }}>
              <span style={{ color: cat.color, fontFamily: 'monospace' }}>{handle}</span>
              {' → '}
              <span style={{ fontFamily: 'monospace' }}>{targets.join(', ')}</span>
            </div>
          ))}
        </div>
      )}

      <div style={{ ...style.section, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {!isEntry && (
          <button style={style.btn} onClick={handleSetEntry} title="Make this the graph entry node">
            Set Entry
          </button>
        )}
        {isEntry && (
          <span style={{ fontSize: 11, color: 'var(--c-success)', fontWeight: 600 }}>✓ Entry node</span>
        )}
        <button style={style.btnDanger} onClick={handleDelete}>
          Delete
        </button>
      </div>

      {/* Props editor for effect.apply */}
      {sn.kind === 'effect.apply' && (
        <EffectApplyEditor
          sn={sn}
          onUpdate={(props) => updateNodeProps(sn.id, props)}
        />
      )}

      {/* Props editor for tower.op */}
      {sn.kind === 'tower.op' && (
        <TowerOpEditor sn={sn} onUpdate={(props) => updateNodeProps(sn.id, props)} />
      )}

      {/* Props editor for lifecycle.boardSetup — initial foe placement */}
      {sn.kind === 'lifecycle.boardSetup' && (
        <BoardSetupEditor
          sn={sn}
          schemaDoc={schemaDoc}
          onUpdate={(props) => updateNodeProps(sn.id, props)}
        />
      )}

      {/* Props editor for lifecycle.selectHero — authored hero candidate pool + library.heroes sync */}
      {sn.kind === 'lifecycle.selectHero' && (
        <SelectHeroEditor
          sn={sn}
          schemaDoc={schemaDoc}
          onUpdate={(props) => updateNodeProps(sn.id, props)}
          onSyncLibraryHeroes={(heroIds) => syncLibraryHeroes(heroIds)}
        />
      )}
    </div>
  );
}

function EffectApplyEditor({
  sn,
  onUpdate,
}: {
  sn: { props?: Record<string, unknown> };
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const effectsRaw = (sn.props?.effects ?? sn.props?.effect) as unknown;
  const effectsStr = JSON.stringify(effectsRaw ?? [], null, 2);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      try {
        const parsed = JSON.parse(e.target.value);
        if (Array.isArray(parsed)) {
          onUpdate({ effects: parsed });
        } else {
          onUpdate({ effect: parsed });
        }
      } catch {
        // ignore parse errors while typing
      }
    },
    [onUpdate],
  );

  return (
    <div style={{ padding: '8px 12px', borderTop: '1px solid var(--c-border)' }}>
      <div style={{ fontSize: 10, color: 'var(--c-text-faint)', textTransform: 'uppercase', marginBottom: 4 }}>
        Edit Effects (JSON)
      </div>
      <textarea
        defaultValue={effectsStr}
        onChange={handleChange}
        rows={6}
        style={{
          width: '100%',
          fontSize: 10,
          fontFamily: 'monospace',
          border: '1px solid var(--c-border-strong)',
          borderRadius: 4,
          padding: 6,
          boxSizing: 'border-box',
          resize: 'vertical',
          background: 'var(--c-surface-raised)',
          color: 'var(--c-text)',
        }}
      />
    </div>
  );
}

const TOWER_CHANNELS = [
  'skull.dropTrigger', 'light.named', 'sound', 'drum.rotate',
  'seal.break', 'seal.replace', 'wait', 'rotationBundle', 'timeline',
  'light.custom', 'light.effect',
];

function TowerOpEditor({
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
      <div style={{ fontSize: 10, color: 'var(--c-text-faint)', textTransform: 'uppercase', marginBottom: 4 }}>
        Tower Channel
      </div>
      <select
        value={currentChannel}
        onChange={handleChannelChange}
        style={{ width: '100%', padding: '4px 8px', border: '1px solid var(--c-border-strong)', borderRadius: 4, fontSize: 12,
                 background: 'var(--c-surface-raised)', color: 'var(--c-text)' }}
      >
        {TOWER_CHANNELS.map((ch) => (
          <option key={ch} value={ch}>{ch}</option>
        ))}
      </select>
    </div>
  );
}

const GROUP_COLOR_PRESETS = ['#3D5A80', '#2E7D32', '#D97706', '#7C3AED', '#DC2626', '#6B7280'];

function GroupEditor({
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
      <div style={{ fontSize: 10, color: 'var(--c-text-faint)', textTransform: 'uppercase', marginBottom: 6 }}>
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

      <div style={{ fontSize: 10, color: 'var(--c-text-faint)', textTransform: 'uppercase', marginBottom: 6 }}>
        Members ({memberIds.length})
      </div>
      {memberIds.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--c-text-faint)', fontStyle: 'italic', marginBottom: 6 }}>
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

// Scenario-wide standard-game selections editor (shown when no node is selected). All fields are
// optional (schema 0.4.1) — a rule-variant scenario may leave them blank. The dropdowns commit
// immediately; the Main Goal commits on blur (a local draft avoids creating a quest keyed on the
// first character typed and prevents orphan-quest accretion on repeated clear/retype).
function ScenarioSetupEditor({
  schemaDoc,
  sectionStyle,
  labelStyle,
  inputStyle,
  updateSetupSelections,
  updateMainGoal,
}: {
  schemaDoc: ScenarioDoc;
  sectionStyle: React.CSSProperties;
  labelStyle: React.CSSProperties;
  inputStyle: React.CSSProperties;
  updateSetupSelections: (patch: {
    adversaryId?: string | null;
    allyId?: string | null;
    tier1FoeId?: string | null;
    tier2FoeId?: string | null;
    tier3FoeId?: string | null;
  }) => void;
  updateMainGoal: (title: string) => void;
}) {
  const asObj = (v: unknown): Record<string, unknown> | undefined =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;
  const asStr = (v: unknown): string => (typeof v === 'string' ? v : '');

  const selections = asObj(schemaDoc.setup['selections']) ?? {};
  const curAdversary = asStr(selections['adversaryId']);
  const curAlly = asStr(selections['allyId']);
  const curFoes = asObj(selections['foes']) ?? {};
  const curTier1 = asStr(curFoes['tier1']);
  const curTier2 = asStr(curFoes['tier2']);
  const curTier3 = asStr(curFoes['tier3']);
  const curGoalId = asStr(selections['mainGoalId']);
  const quests = asObj(asObj(schemaDoc.library)?.['quests']) ?? {};
  const curGoalName = curGoalId ? asStr(asObj(quests[curGoalId])?.['name']) : '';

  const marginedInput = { ...inputStyle, marginBottom: 8 };
  const dropdown = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: Array<{ id: string; name: string }>,
  ) => (
    <>
      <div style={labelStyle}>{label}</div>
      <select style={marginedInput} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">— None —</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
          </option>
        ))}
      </select>
    </>
  );

  return (
    <div style={sectionStyle}>
      <div style={labelStyle}>Setup</div>
      <div style={{ fontSize: 10, color: 'var(--c-text-faint)', marginBottom: 8 }}>
        Optional standard-game selections. Leave blank for custom rules.
      </div>
      {dropdown('Adversary', curAdversary, (v) => updateSetupSelections({ adversaryId: v }), ADVERSARY_OPTIONS)}
      {dropdown('Ally', curAlly, (v) => updateSetupSelections({ allyId: v }), ALLY_OPTIONS)}
      {dropdown('Tier 1 Foe', curTier1, (v) => updateSetupSelections({ tier1FoeId: v }), TIER1_OPTIONS)}
      {dropdown('Tier 2 Foe', curTier2, (v) => updateSetupSelections({ tier2FoeId: v }), TIER2_OPTIONS)}
      {dropdown('Tier 3 Foe', curTier3, (v) => updateSetupSelections({ tier3FoeId: v }), TIER3_OPTIONS)}
      <div style={labelStyle}>Main Goal</div>
      {/* Uncontrolled + keyed on the committed name: typing stays local to the DOM (smooth, no
          per-keystroke quest churn) and commits once on blur. The key remounts the field with a
          fresh default only when the committed value changes externally (scenario load, clear). */}
      <input
        key={curGoalName}
        style={inputStyle}
        defaultValue={curGoalName}
        onBlur={(e) => {
          if (e.target.value.trim() !== curGoalName.trim()) updateMainGoal(e.target.value);
        }}
        placeholder="Defeat the Adversary"
      />
    </div>
  );
}

const FOE_STATUSES = ['panicked', 'unsteady', 'ready', 'savage', 'lethal'] as const;

// UDT board-location vocabulary (60 named spaces) — resolved once at load, like NewScenarioDialog.
const BOARD_LOCATION_NAMES: string[] = Object.keys(getUDTReferenceLayer().boardLocationByName);

type SpawnRow = { foeId?: string; location?: string; status?: string };

// The foes an author can place = those the scenario declares (library.foes keys ∪ tier selections),
// falling back to the full UDT foe roster if the scenario hasn't declared any yet.
function scenarioFoeIds(schemaDoc: ScenarioDoc): string[] {
  const asObj = (v: unknown): Record<string, unknown> | undefined =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

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

function BoardSetupEditor({
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

  const commit = (next: SpawnRow[]) => onUpdate({ spawns: next });
  const updateRow = (i: number, patch: SpawnRow) =>
    commit(spawns.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const addRow = () =>
    commit([...spawns, { foeId: foeIds[0] ?? '', location: BOARD_LOCATION_NAMES[0] ?? '' }]);
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
      <div style={{ fontSize: 10, color: 'var(--c-text-faint)', textTransform: 'uppercase', marginBottom: 6 }}>
        Foe Spawns (setup)
      </div>
      {spawns.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--c-text-faint)', fontStyle: 'italic', marginBottom: 6 }}>
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
              <option key={id} value={id}>{id}</option>
            ))}
          </select>
          <select
            value={row.location ?? ''}
            onChange={(e) => updateRow(i, { location: e.target.value })}
            style={selectStyle}
            title="Board location"
          >
            {withCurrent(BOARD_LOCATION_NAMES, row.location).map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
          <select
            value={row.status ?? 'ready'}
            onChange={(e) => updateRow(i, { status: e.target.value })}
            style={selectStyle}
            title="Starting status"
          >
            {FOE_STATUSES.map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <button
            onClick={() => removeRow(i)}
            title="Remove spawn"
            style={{ padding: '2px 6px', border: '1px solid #FCA5A5', borderRadius: 4, fontSize: 11, cursor: 'pointer', background: '#FEF2F2', color: 'var(--c-danger)' }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        onClick={addRow}
        style={{ marginTop: 4, padding: '4px 10px', border: '1px solid var(--c-border-strong)', borderRadius: 4, fontSize: 11, cursor: 'pointer', background: 'var(--c-surface-raised)', color: 'var(--c-text-2)' }}
      >
        + Add spawn
      </button>
    </div>
  );
}

// The heroes already declared for this scenario (library.heroes keys), falling back to the full
// UDT hero roster if the scenario hasn't declared any yet — mirrors scenarioFoeIds above.
function scenarioHeroIds(schemaDoc: ScenarioDoc): string[] {
  const asObj = (v: unknown): Record<string, unknown> | undefined =>
    v && typeof v === 'object' ? (v as Record<string, unknown>) : undefined;

  const heroesLib = asObj(asObj(schemaDoc.library)?.['heroes']);
  const fromLib = heroesLib ? Object.keys(heroesLib) : [];

  return fromLib.length ? fromLib : Object.keys(getUDTReferenceLayer().heroById);
}

function SelectHeroEditor({
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
      <div style={{ fontSize: 10, color: 'var(--c-text-faint)', textTransform: 'uppercase', marginBottom: 6 }}>
        Hero Candidate Pool (setup)
      </div>
      {heroIds.length === 0 && (
        <div style={{ fontSize: 11, color: 'var(--c-text-faint)', fontStyle: 'italic', marginBottom: 6 }}>
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
              style={{ padding: '2px 6px', border: '1px solid #FCA5A5', borderRadius: 4, fontSize: 11, cursor: 'pointer', background: '#FEF2F2', color: 'var(--c-danger)' }}
            >
              ✕
            </button>
          </div>
        );
      })}
      {available.length > 0 && (
        <select
          value=""
          onChange={(e) => addHero(e.target.value)}
          style={selectStyle}
        >
          <option value="" disabled>+ Add hero…</option>
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
