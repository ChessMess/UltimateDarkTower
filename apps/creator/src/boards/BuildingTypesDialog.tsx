// BuildingTypesDialog — the editor for `library.buildingTypes`, the scenario's building registry.
//
// Schema 0.4.7 turned that map from a fixed {citadel, sanctuary, village, bazaar} into an OPEN
// registry, so a creator can define their own buildings the way they already define their own
// terrain. A building is a rules object, not just a label: its `free`/`enhanced` effects are what
// Reinforce runs on that space, `skullCapacity` is how many skulls it takes before it's razed, and
// `heroStart` marks it as a hero's start space (replacing the hardcoded 'citadel' string).
//
// Reached from the Board Designer — the Locations panel's `Building types…` button, and the
// building picker's `Custom…` option, which opens this straight into a new type.

import { useState } from 'react';
import type { CSSProperties } from 'react';
import { EffectListEditor } from '../editors/effects';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { slugify } from '../utils/scaffold';
import type { ScenarioDoc } from '../types';
import {
  BUILDING_TYPES,
  ID_RE,
  buildingLabel,
  dangerBtn,
  inputStyle,
  labelStyle,
  primaryBtn,
  smallBtn,
} from './shared';
import type { Board, BuildingTypeDef } from './shared';

/** A new type's starting rules — the shape `scaffold.ts`'s `baseBuildingType` writes. */
const newDef = (name: string): BuildingTypeDef => ({
  name,
  free: [{ op: 'resource.gain', resource: 'warriors', amount: 1 }],
  enhanced: {
    cost: { resource: 'spirit', amount: 1 },
    effects: [{ op: 'resource.gain', resource: 'warriors', amount: 2 }],
  },
  skullCapacity: 3,
});

/**
 * Where a building type is referenced. Both sites matter for the delete guard: a location on any
 * board, AND a hand-authored inline `setup.board.boardState.buildings[]` — the latter is opaque to
 * L1 and invisible to L2, so nothing else would catch a delete orphaning it.
 */
function usageOf(doc: ScenarioDoc | null, boards: Record<string, Board>, id: string): number {
  let n = 0;
  for (const board of Object.values(boards)) {
    for (const loc of board.locations) if (loc.building === id) n++;
  }
  const setup = doc?.setup as Record<string, unknown> | undefined;
  const board = setup?.board as Record<string, unknown> | undefined;
  const inline = board?.boardState as Record<string, unknown> | undefined;
  const inlineBuildings = inline?.buildings;
  if (Array.isArray(inlineBuildings)) {
    for (const b of inlineBuildings) {
      if (b && typeof b === 'object' && (b as Record<string, unknown>).type === id) n++;
    }
  }
  return n;
}

export interface BuildingTypesDialogProps {
  doc: ScenarioDoc | null;
  /** Every authored board — the usage counts and the delete guard read all of them. */
  boards: Record<string, Board>;
  types: Record<string, BuildingTypeDef>;
  onCommit: (types: Record<string, BuildingTypeDef>) => void;
  /** Renames the registry key AND retypes every location using it, in one undoable commit. */
  onRename: (from: string, to: string) => void;
  /** When set, the dialog opens on a fresh type seeded with this name (the picker's `Custom…`). */
  createWith?: string | null;
  onClose: () => void;
}

export function BuildingTypesDialog({
  doc,
  boards,
  types,
  onCommit,
  onRename,
  createWith,
  onClose,
}: BuildingTypesDialogProps) {
  const ids = Object.keys(types);
  const [selected, setSelected] = useState<string | null>(createWith ? null : (ids[0] ?? null));
  const [draftId, setDraftId] = useState(createWith ?? '');
  const [creating, setCreating] = useState(createWith != null);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const def = selected ? types[selected] : undefined;

  /** Ids are `$defs/id` — the same value goes in a location's `building`, so L1 rejects anything else. */
  const validateId = (raw: string, allowCurrent?: string): string | null => {
    const id = raw.trim();
    if (!id) return 'an id is required';
    if (!ID_RE.test(id)) return `"${id}" must be kebab/snake case (a-z, 0-9, - or _)`;
    if (id !== allowCurrent && id in types) return `"${id}" already exists`;
    return null;
  };

  const patch = (next: Partial<BuildingTypeDef>): void => {
    if (!selected || !def) return;
    onCommit({ ...types, [selected]: { ...def, ...next } });
  };

  const commitNew = (): void => {
    // Slugified rather than rejected: a creator typing "Watch Tower" means `watch-tower`, and
    // silently failing L1 at export is the trap this dialog exists to close.
    const id = slugify(draftId);
    const problem = validateId(id);
    if (problem) return setError(problem);
    onCommit({ ...types, [id]: newDef(draftId.trim()) });
    setSelected(id);
    setCreating(false);
    setDraftId('');
    setError(null);
  };

  const commitRename = (): void => {
    if (!selected) return;
    const id = slugify(draftId);
    const problem = validateId(id, selected);
    if (problem) return setError(problem);
    if (id !== selected) onRename(selected, id);
    setSelected(id);
    setRenaming(false);
    setError(null);
  };

  const clone = (id: string): void => {
    let copy = `${id}-copy`;
    let i = 2;
    while (copy in types) copy = `${id}-copy-${i++}`;
    onCommit({ ...types, [copy]: { ...types[id], name: `${buildingLabel(types, id)} copy` } });
    setSelected(copy);
  };

  const remove = (id: string): void => {
    const next = { ...types };
    delete next[id];
    onCommit(next);
    setSelected(Object.keys(next)[0] ?? null);
    setPendingDelete(null);
  };

  const startCreate = (): void => {
    setCreating(true);
    setRenaming(false);
    setDraftId('');
    setError(null);
  };

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <strong style={{ fontSize: 14 }}>Building types</strong>
          <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
            scenario-wide — shared by every board
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 10 }}>
          A building's effects are what <strong>Reinforce</strong> runs on its space. Mark one type{' '}
          <strong>hero start</strong> to say where heroes begin; with none marked, a{' '}
          <code>citadel</code> is the start space.
        </div>

        <div style={{ display: 'flex', gap: 12, minHeight: 300 }}>
          {/* ---- the registry ---- */}
          <div style={rail}>
            {ids.length === 0 && !creating && (
              <div style={{ fontSize: 11, color: 'var(--c-text-faint)', padding: 6 }}>
                No building types yet.
              </div>
            )}
            {ids.map((id) => {
              const uses = usageOf(doc, boards, id);
              return (
                <div
                  key={id}
                  style={id === selected ? railRowSelected : railRow}
                  onClick={() => {
                    setSelected(id);
                    setCreating(false);
                    setRenaming(false);
                    setError(null);
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={railName}>{buildingLabel(types, id)}</div>
                    <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>
                      {id} · {uses} use{uses === 1 ? '' : 's'}
                      {types[id]?.heroStart ? ' · hero start' : ''}
                    </div>
                  </div>
                </div>
              );
            })}
            {creating && (
              <div style={railRowSelected}>
                <input
                  autoFocus
                  style={{ ...inputStyle, width: '100%' }}
                  value={draftId}
                  placeholder="watchtower"
                  onChange={(e) => setDraftId(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitNew();
                    if (e.key === 'Escape') setCreating(false);
                  }}
                  onBlur={commitNew}
                />
              </div>
            )}
            <button style={{ ...smallBtn, width: '100%', marginTop: 6 }} onClick={startCreate}>
              + Add type
            </button>
          </div>

          {/* ---- the selected type's rules ---- */}
          <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: 420 }}>
            {!def && (
              <div style={{ fontSize: 12, color: 'var(--c-text-faint)', padding: 8 }}>
                Select a building type, or add one.
              </div>
            )}
            {def && selected && (
              <>
                <div style={{ display: 'flex', gap: 8 }}>
                  <label style={{ ...fieldLabel, flex: 1 }}>
                    name
                    <input
                      style={{ ...inputStyle, width: '100%' }}
                      value={def.name ?? ''}
                      placeholder={selected}
                      onChange={(e) => patch({ name: e.target.value })}
                    />
                  </label>
                  <label style={{ ...fieldLabel, flex: 1 }}>
                    id
                    {renaming ? (
                      <input
                        autoFocus
                        style={{ ...inputStyle, width: '100%' }}
                        value={draftId}
                        onChange={(e) => setDraftId(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename();
                          if (e.key === 'Escape') setRenaming(false);
                        }}
                        onBlur={commitRename}
                      />
                    ) : (
                      <button
                        style={{ ...inputStyle, width: '100%', textAlign: 'left' }}
                        title="Rename — every location using this type is retyped with it"
                        onClick={() => {
                          setRenaming(true);
                          setDraftId(selected);
                          setError(null);
                        }}
                      >
                        {selected}
                      </button>
                    )}
                  </label>
                </div>

                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', marginTop: 8 }}>
                  <label style={{ ...fieldLabel, width: 120 }}>
                    skull capacity
                    <input
                      type="number"
                      min={1}
                      max={9}
                      style={{ ...inputStyle, width: '100%' }}
                      value={def.skullCapacity ?? 3}
                      onChange={(e) => {
                        const n = Math.min(9, Math.max(1, Number(e.target.value) || 3));
                        // destroyOnSkull is derived and documentary — no engine path reads it,
                        // but an export that disagreed with itself would be confusing.
                        patch({ skullCapacity: n, destroyOnSkull: n + 1 });
                      }}
                    />
                  </label>
                  <label
                    style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12 }}
                    title="Heroes start on their kingdom's first building of a hero-start type"
                  >
                    <input
                      type="checkbox"
                      checked={!!def.heroStart}
                      onChange={(e) => patch({ heroStart: e.target.checked || undefined })}
                    />
                    hero start
                  </label>
                  <span style={{ flex: 1 }} />
                  <button style={smallBtn} onClick={() => clone(selected)}>
                    Clone
                  </button>
                  <button style={dangerBtn} onClick={() => setPendingDelete(selected)}>
                    Delete
                  </button>
                </div>

                <div style={{ fontSize: 10, color: 'var(--c-text-muted)', margin: '2px 0 10px' }}>
                  {def.skullCapacity ?? 3} skulls sit on it; the next one razes it.
                </div>

                <div style={section}>
                  <label style={labelStyle}>Reinforce — free</label>
                  <EffectListEditor
                    value={def.free ?? []}
                    onChange={(free) => patch({ free })}
                    deckIds={deckIdsOf(doc)}
                    foeIds={foeIdsOf(doc)}
                  />
                </div>

                <div style={section}>
                  <label style={labelStyle}>Reinforce — enhanced (paid)</label>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <label style={{ ...fieldLabel, width: 110 }}>
                      cost
                      <select
                        style={{ ...inputStyle, width: '100%' }}
                        value={def.enhanced?.cost?.resource ?? 'spirit'}
                        onChange={(e) =>
                          patch({
                            enhanced: {
                              ...def.enhanced,
                              cost: { ...def.enhanced?.cost, resource: e.target.value },
                              effects: def.enhanced?.effects ?? [],
                            },
                          })
                        }
                      >
                        <option value="spirit">spirit</option>
                        <option value="warriors">warriors</option>
                      </select>
                    </label>
                    <label style={{ ...fieldLabel, width: 90 }}>
                      amount
                      <input
                        type="number"
                        min={1}
                        style={{ ...inputStyle, width: '100%' }}
                        value={def.enhanced?.cost?.amount ?? 1}
                        onChange={(e) =>
                          patch({
                            enhanced: {
                              ...def.enhanced,
                              cost: {
                                ...def.enhanced?.cost,
                                amount: Math.max(1, Number(e.target.value) || 1),
                              },
                              effects: def.enhanced?.effects ?? [],
                            },
                          })
                        }
                      />
                    </label>
                  </div>
                  <EffectListEditor
                    value={def.enhanced?.effects ?? []}
                    onChange={(effects) =>
                      patch({
                        enhanced: {
                          cost: def.enhanced?.cost ?? { resource: 'spirit', amount: 1 },
                          effects,
                        },
                      })
                    }
                    deckIds={deckIdsOf(doc)}
                    foeIds={foeIdsOf(doc)}
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--c-danger)', fontSize: 11, marginTop: 8 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <span style={{ fontSize: 10, color: 'var(--c-text-faint)' }}>
            RtDT's own four are {BUILDING_TYPES.join(', ')} — suggestions, not a fixed set.
          </span>
          <span style={{ flex: 1 }} />
          <button style={primaryBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete building type?"
          message={
            <>
              <strong>{buildingLabel(types, pendingDelete)}</strong> is used by{' '}
              {usageOf(doc, boards, pendingDelete)} location(s). They keep the type name, which will
              then resolve to nothing — Reinforce there fails and validation flags it. This cannot
              be undone.
            </>
          }
          onConfirm={() => remove(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

/** Deck/foe ids the effect rows offer — the same derivation the deck builder uses. */
function deckIdsOf(doc: ScenarioDoc | null): string[] {
  const lib = (doc?.library as Record<string, unknown> | undefined) ?? {};
  return Object.keys((lib.decks as Record<string, unknown> | undefined) ?? {});
}
function foeIdsOf(doc: ScenarioDoc | null): string[] {
  const lib = (doc?.library as Record<string, unknown> | undefined) ?? {};
  return Object.keys((lib.foes as Record<string, unknown> | undefined) ?? {});
}

const overlay: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
};
const dialog: CSSProperties = {
  width: 720,
  maxWidth: '94vw',
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 10,
  padding: 16,
  boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
};
const rail: CSSProperties = {
  width: 190,
  flexShrink: 0,
  borderRight: '1px solid var(--c-border)',
  paddingRight: 10,
  overflowY: 'auto',
  maxHeight: 420,
};
const railRow: CSSProperties = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  padding: '5px 6px',
  borderRadius: 5,
  cursor: 'pointer',
};
const railRowSelected: CSSProperties = {
  ...railRow,
  background: 'var(--c-surface-sunken, rgba(255,255,255,0.06))',
};
const railName: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};
const fieldLabel: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  fontSize: 11,
  color: 'var(--c-text-muted)',
};
const section: CSSProperties = {
  borderTop: '1px solid var(--c-border)',
  paddingTop: 8,
  marginTop: 8,
};
