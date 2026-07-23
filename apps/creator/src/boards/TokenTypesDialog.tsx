// TokenTypesDialog — the editor for `library.tokenTypes`, the scenario's token-type registry.
//
// Schema 0.5.0 opened board spots into `{id, at, accepts}`, where `accepts` names either a
// reserved built-in type (hero/foe/adversary/building/skull/monument/marker/quest) or a
// `library.tokenTypes` key — this dialog is where an author defines the latter. Modelled directly
// on `BuildingTypesDialog.tsx` (same registry-editor shape: a rail of ids, the selected type's
// fields, rename/clone/delete with a usage-aware delete guard) but the fields themselves mirror
// `$defs/tokenType`, not a building's Reinforce effects.
//
// Reached from the Board Designer's toolbar `Token types…` button, and a spot's `Define a new
// token type…` link, which opens this straight into a new type.

import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { slugify } from '../utils/scaffold';
import {
  ID_RE,
  RESERVED_TOKEN_TYPES,
  dangerBtn,
  inputStyle,
  labelStyle,
  primaryBtn,
  smallBtn,
} from './shared';
import type { Board, TokenTypeDef } from './shared';

/** A new type's starting shape — a plain board token, removable by default. */
const newDef = (name: string): TokenTypeDef => ({
  id: '',
  name,
  kind: 'boardToken',
  placement: 'space',
  removable: true,
});

/** How many spots (across every board) accept each type — the delete guard's usage count. */
function usageTally(boards: Record<string, Board>): Map<string, number> {
  const tally = new Map<string, number>();
  for (const board of Object.values(boards)) {
    for (const spots of Object.values(board.spots ?? {})) {
      for (const spot of spots) {
        for (const accept of spot.accepts) {
          const key = accept.trim().toLowerCase();
          if (key) tally.set(key, (tally.get(key) ?? 0) + 1);
        }
      }
    }
  }
  return tally;
}

export interface TokenTypesDialogProps {
  /** Every authored board — the usage counts and the delete guard read all of them. */
  boards: Record<string, Board>;
  types: Record<string, TokenTypeDef>;
  onCommit: (types: Record<string, TokenTypeDef>) => void;
  /** Renames the registry key AND retypes every board spot's `accepts` entry, in one commit. */
  onRename: (from: string, to: string) => void;
  /**
   * When non-null the dialog opens on a fresh type, its name field seeded with this string (a
   * spot's `Define a new token type…` passes `''`). `null`/absent opens on the existing registry.
   */
  createWith?: string | null;
  onClose: () => void;
  /** Discards every edit made since the dialog opened, via the caller restoring its pre-open doc
   *  snapshot in one commit — mirrors `BuildingTypesDialog`'s Cancel. */
  onCancel: () => void;
}

export function TokenTypesDialog({
  boards,
  types,
  onCommit,
  onRename,
  createWith,
  onClose,
  onCancel,
}: TokenTypesDialogProps) {
  const ids = Object.keys(types);
  const opensOnNewType = createWith != null;
  const [selected, setSelected] = useState<string | null>(opensOnNewType ? null : (ids[0] ?? null));
  const [draftId, setDraftId] = useState(createWith ?? '');
  const [creating, setCreating] = useState(opensOnNewType);
  const [renaming, setRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const usage = useMemo(() => usageTally(boards), [boards]);
  const usesOf = (id: string): number => usage.get(id.toLowerCase()) ?? 0;
  // Computed inside the component, not at module scope: RESERVED_TOKEN_TYPES is itself a
  // top-level const in shared.ts sourced from getUDTReferenceLayer(), and reading it eagerly
  // from another module's top level races module-initialization order (blank-page crash on a
  // cold load). Every other reader of it in this codebase is inside a function body for the
  // same reason.
  const reservedLower = useMemo(
    () => new Set(RESERVED_TOKEN_TYPES.map((t) => t.toLowerCase())),
    [],
  );

  const def = selected ? types[selected] : undefined;

  /** Ids are `$defs/id` — the same value goes in a spot's `accepts`, so L1 rejects anything else. */
  const validateId = (raw: string, allowCurrent?: string): string | null => {
    const id = raw.trim();
    if (!id) return 'an id is required';
    if (!ID_RE.test(id)) return `"${id}" must be kebab/snake case (a-z, 0-9, - or _)`;
    if (id !== allowCurrent && id in types) return `"${id}" already exists`;
    // A reserved id (hero/foe/adversary/…) needs no registry entry and always resolves to the
    // built-in kind on the board — a same-named custom entry would just be silently ignored
    // wherever the board matters, which is confusing rather than useful.
    if (reservedLower.has(id.toLowerCase())) return `"${id}" is a reserved built-in type`;
    return null;
  };

  const patch = (next: Partial<TokenTypeDef>): void => {
    if (!selected || !def) return;
    onCommit({ ...types, [selected]: { ...def, ...next } });
  };

  const commitNew = (): void => {
    // Slugified rather than rejected: an author typing "Bear Trap" means `bear-trap`, and
    // silently failing L1 at export is the trap this dialog exists to close.
    const id = slugify(draftId);
    const problem = validateId(id);
    if (problem) return setError(problem);
    onCommit({ ...types, [id]: { ...newDef(draftId.trim()), id } });
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
    onCommit({
      ...types,
      [copy]: { ...types[id], id: copy, name: `${types[id]?.name ?? id} copy` },
    });
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
          <strong style={{ fontSize: 14 }}>Token types</strong>
          <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
            scenario-wide — shared by every board
          </span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 10 }}>
          A board spot's <strong>accepts</strong> list names either a built-in type (hero, foe,
          adversary, building, skull, monument, marker, quest) or one of your own, defined here.
        </div>

        <div style={{ display: 'flex', gap: 12, minHeight: 260 }}>
          {/* ---- the registry ---- */}
          <div style={rail}>
            {ids.length === 0 && !creating && (
              <div style={{ fontSize: 11, color: 'var(--c-text-faint)', padding: 6 }}>
                No token types yet.
              </div>
            )}
            {ids.map((id) => {
              const uses = usesOf(id);
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
                    <div style={railName}>{types[id]?.name?.trim() || id}</div>
                    <div style={{ fontSize: 10, color: 'var(--c-text-muted)' }}>
                      {id} · {uses} use{uses === 1 ? '' : 's'}
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
                  placeholder="bear-trap"
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

          {/* ---- the selected type's fields ---- */}
          <div
            style={{ flex: 1, minWidth: 0, overflowY: 'auto', maxHeight: 380, paddingRight: 10 }}
          >
            {!def && (
              <div style={{ fontSize: 12, color: 'var(--c-text-faint)', padding: 8 }}>
                Select a token type, or add one.
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
                        title="Rename — every spot accepting this type is retyped with it, on every board"
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

                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <label style={{ ...fieldLabel, flex: 1 }}>
                    placement
                    <select
                      style={{ ...inputStyle, width: '100%' }}
                      value={def.placement}
                      onChange={(e) =>
                        patch({ placement: e.target.value as TokenTypeDef['placement'] })
                      }
                    >
                      <option value="space">space (a board spot)</option>
                      <option value="edge">edge (between locations)</option>
                      <option value="heroBoard">heroBoard (a hero's own board)</option>
                    </select>
                  </label>
                  <label
                    style={{
                      display: 'flex',
                      gap: 6,
                      alignItems: 'center',
                      fontSize: 12,
                      marginTop: 16,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={def.removable}
                      onChange={(e) => patch({ removable: e.target.checked })}
                    />
                    removable
                  </label>
                </div>

                <div style={{ fontSize: 10, color: 'var(--c-text-muted)', margin: '4px 0 10px' }}>
                  Only <code>space</code>-placement types show up in a board spot's accepts picker.
                </div>

                <div style={section}>
                  <label style={labelStyle}>
                    Appearance (presentational — no engine rule reads these)
                  </label>
                  <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                    <label style={{ ...fieldLabel, flex: 1 }}>
                      colour
                      <input
                        type="text"
                        placeholder="#7f1d1d"
                        style={{ ...inputStyle, width: '100%' }}
                        value={def.color ?? ''}
                        onChange={(e) => patch({ color: e.target.value || undefined })}
                      />
                    </label>
                    <label style={{ ...fieldLabel, width: 100 }}>
                      fan capacity
                      <input
                        type="number"
                        min={1}
                        max={9}
                        style={{ ...inputStyle, width: '100%' }}
                        value={def.capacity ?? ''}
                        placeholder="auto"
                        onChange={(e) => {
                          const raw = e.target.value;
                          patch({
                            capacity: raw ? Math.min(9, Math.max(1, Number(raw) || 1)) : undefined,
                          });
                        }}
                      />
                    </label>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--c-text-muted)', marginTop: 4 }}>
                    A board renderer draws up to this many stacked before fanning stops — a display
                    detail, never a rule. Art (<code>artRef</code>) is set from the Art Forge.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button style={smallBtn} onClick={() => clone(selected)}>
                    Clone
                  </button>
                  <button style={dangerBtn} onClick={() => setPendingDelete(selected)}>
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {error && (
          <div style={{ color: 'var(--c-danger)', fontSize: 11, marginTop: 8 }}>{error}</div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 10 }}>
          <span style={{ flex: 1 }} />
          <button style={smallBtn} onClick={onCancel}>
            Cancel
          </button>
          <button style={primaryBtn} onClick={onClose}>
            Done
          </button>
        </div>
      </div>

      {pendingDelete && (
        <ConfirmDialog
          title="Delete token type?"
          message={
            usesOf(pendingDelete) === 0 ? (
              <>
                <strong>{types[pendingDelete]?.name?.trim() || pendingDelete}</strong> is not
                accepted by any spot. This cannot be undone.
              </>
            ) : (
              <>
                <strong>{types[pendingDelete]?.name?.trim() || pendingDelete}</strong> is accepted
                by {usesOf(pendingDelete)} spot{usesOf(pendingDelete) === 1 ? '' : 's'}. They keep
                the type name, which will then resolve to nothing — validation flags it as a warning
                and export-time L2 as an error. This cannot be undone.
              </>
            )
          }
          onConfirm={() => remove(pendingDelete)}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
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
  width: 640,
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
  maxHeight: 380,
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
