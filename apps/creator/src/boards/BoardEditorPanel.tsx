// BoardEditorPanel — the Board Designer's right-hand editor: identity, art, calibration, the
// locations table, and the validation summary.
//
// Renaming a location remaps its anchors + adjacency keys in the SAME commit, so the board never
// lands in a state its own validation rejects. Graph-node props that referenced the old name are
// deliberately NOT rewritten — L2 surfaces those as dangling refs; the panel hints at it.

import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { BUILTIN_BOARD_IMAGE_REF, isBuiltinBoardImageRef } from '@udtc/adapters';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { AnchorGlyphChip } from './AnchorGlyph';
import {
  ANCHOR_SLOTS,
  BUILDING_TYPES,
  KINGDOMS,
  KINGDOM_COLOR,
  NO_BUILDING,
  TERRAIN_SUGGESTIONS,
  dangerBtn,
  dangerIconBtn,
  hasAnchorSlot,
  inputStyle,
  isCalibrated,
  isPlaced,
  labelStyle,
  locationsInScope,
  primaryBtn,
  pruneToLocations,
  removeLocationsInScope,
  scopeChoices,
  smallBtn,
  unplacedLocations,
  validateBoard,
} from './shared';
import type {
  AnchorSlot,
  Board,
  BoardLocation,
  BuildingType,
  Kingdom,
  LocationAnchors,
  LocationScope,
  ScopeFacet,
} from './shared';
import type { BoardEditMode } from './BoardMapCanvas';

export interface BoardEditorPanelProps {
  board: Board;
  isActive: boolean;
  mode: BoardEditMode;
  activeSlot: AnchorSlot;
  selectedLocation: string | null;
  onChange: (next: Board) => void;
  onSelectLocation: (name: string | null) => void;
  onActiveSlot: (slot: AnchorSlot) => void;
  /** Switch the canvas mode — how the panel hands a location off to be placed on the map. */
  onMode: (mode: BoardEditMode) => void;
  onUploadArt: (file: File) => void;
  onToggleActive: () => void;
  onSuggestAdjacency: () => void;
}

export function BoardEditorPanel({
  board,
  isActive,
  mode,
  activeSlot,
  selectedLocation,
  onChange,
  onSelectLocation,
  onActiveSlot,
  onMode,
  onUploadArt,
  onToggleActive,
  onSuggestAdjacency,
}: BoardEditorPanelProps) {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const problems = validateBoard(board);
  const errors = problems.filter((p) => p.level === 'error');
  const warns = problems.filter((p) => p.level === 'warn');
  const calibrated = isCalibrated(board.imageInfo);
  const builtinArt = isBuiltinBoardImageRef(board.imageRef);
  const unplaced = unplacedLocations(board);

  // `addLocation` appends, so the new row is always last — but the list scrolls, and on a
  // 60-location board it lands below the fold where nothing looks like it happened.
  const listRef = useRef<HTMLDivElement | null>(null);
  const scrollToEndRef = useRef(false);
  useEffect(() => {
    if (!scrollToEndRef.current) return;
    scrollToEndRef.current = false;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  });
  // The draft scope while the bulk-remove dialog is open; null = closed.
  const [removeScope, setRemoveScope] = useState<LocationScope | null>(null);

  /**
   * Adopt the built-in RtDT art. `imageInfo` follows the art it describes — the built-in board is
   * square 4096², and a mismatched size would render it stretched. Anchors are normalized `[0,1]`,
   * so they do not move. Any previously uploaded image stays in `library.resources.images`
   * (unreferenced); the Asset Manager lists it as unused for deletion.
   */
  const useBuiltinArt = (): void => {
    onChange({
      ...board,
      imageRef: BUILTIN_BOARD_IMAGE_REF,
      imageInfo: { ...board.imageInfo, width: 4096, height: 4096 },
    });
  };

  const patchLocation = (index: number, patch: Partial<BoardLocation>): void => {
    const locations = board.locations.map((l, i) => (i === index ? { ...l, ...patch } : l));
    onChange({ ...board, locations });
  };

  /** Rename remaps anchors + adjacency keys/values in the same commit. */
  const renameLocation = (index: number, nextName: string): void => {
    const prev = board.locations[index].name;
    if (prev === nextName) return;
    const locations = board.locations.map((l, i) => (i === index ? { ...l, name: nextName } : l));

    const anchors: Record<string, LocationAnchors> = {};
    for (const [k, v] of Object.entries(board.anchors ?? {}))
      anchors[k === prev ? nextName : k] = v;

    const adjacency: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(board.adjacency ?? {})) {
      adjacency[k === prev ? nextName : k] = v.map((n) => (n === prev ? nextName : n));
    }

    onChange({ ...board, locations, anchors, adjacency });
    if (selectedLocation === prev) onSelectLocation(nextName);
  };

  /**
   * Hand a location off to the map: select it, arm a slot, and switch to anchor mode so the very
   * next click lands its point. A location's position IS its anchors — nothing else ties a row to
   * a spot on the board — so every path that wants one placed comes through here.
   */
  const placeLocation = (name: string): void => {
    onSelectLocation(name);
    if (!isPlaced(board, name)) onActiveSlot('hero');
    onMode('anchors');
  };

  /** Adds a row and goes straight to placing it — an unplaced location renders nowhere. */
  const addLocation = (): void => {
    let n = board.locations.length + 1;
    let name = `Location ${n}`;
    const taken = new Set(board.locations.map((l) => l.name));
    while (taken.has(name)) name = `Location ${++n}`;
    onChange({
      ...board,
      locations: [...board.locations, { name, kingdom: 'north', terrain: 'Grasslands' }],
    });
    scrollToEndRef.current = true;
    placeLocation(name);
  };

  /** Remove one row. By INDEX, not name: a transient duplicate name must lose only the row clicked. */
  const removeLocation = (index: number): void => {
    const name = board.locations[index].name;
    const locations = board.locations.filter((_, i) => i !== index);
    onChange(pruneToLocations(board, locations));
    // The name survives if a duplicate row still carries it — only then does it keep its anchors.
    if (selectedLocation === name && !locations.some((l) => l.name === name))
      onSelectLocation(null);
  };

  /** Bulk remove — everything, or one kingdom / terrain / building. */
  const removeInScope = (scope: LocationScope): void => {
    const doomed = new Set(locationsInScope(board, scope).map((l) => l.name));
    onChange(removeLocationsInScope(board, scope));
    if (selectedLocation !== null && doomed.has(selectedLocation)) onSelectLocation(null);
    setRemoveScope(null);
  };

  return (
    <div style={panel}>
      <section style={section}>
        <label style={labelStyle}>Name</label>
        <input
          style={{ ...inputStyle, width: '100%' }}
          value={board.name}
          onChange={(e) => onChange({ ...board, name: e.target.value })}
        />
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 4 }}>
          id: <code>{board.id}</code>
        </div>

        <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
          <button style={isActive ? primaryBtn : smallBtn} onClick={onToggleActive}>
            {isActive ? '✓ Used in game' : 'Use in game'}
          </button>
          <span style={{ fontSize: 11, color: calibrated ? '#4ade80' : 'var(--c-text-muted)' }}>
            {calibrated ? '● 3D-ready' : '○ 2D only'}
          </span>
        </div>
      </section>

      <section style={section}>
        <label style={labelStyle}>Board art</label>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUploadArt(f);
            e.target.value = '';
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button style={smallBtn} onClick={() => fileRef.current?.click()}>
            {board.imageRef ? 'Replace art…' : 'Upload art…'}
          </button>
          {!builtinArt && (
            <button
              style={smallBtn}
              onClick={useBuiltinArt}
              title="Render on the built-in Return to Dark Tower board image (referenced, not stored in this file)"
            >
              Use built-in RtDT art
            </button>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 4 }}>
          {board.imageInfo.width}×{board.imageInfo.height}
          {builtinArt
            ? ' · built-in RtDT art (not stored in this file)'
            : board.imageRef
              ? ''
              : ' · no art yet (renders blank)'}
        </div>
      </section>

      {mode === 'calibrate' && (
        <section style={section}>
          <label style={labelStyle}>Calibration</label>
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 6 }}>
            Fit the circle to the printed board. All four values are needed for the 3D view.
          </div>
          <NumberRow
            label="North heading°"
            value={board.imageInfo.northHeadingDegrees}
            min={0}
            max={359.9}
            onChange={(v) =>
              onChange({ ...board, imageInfo: { ...board.imageInfo, northHeadingDegrees: v } })
            }
          />
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 6 }}>
            centre {fmt(board.imageInfo.centerX)}, {fmt(board.imageInfo.centerY)} · radius{' '}
            {fmt(board.imageInfo.radius)}
          </div>
        </section>
      )}

      {mode === 'anchors' && (
        <section style={section}>
          <label style={labelStyle}>Anchor slot</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {ANCHOR_SLOTS.map((slot) => {
              // The chip is the same glyph the map draws, filled once the selected location
              // carries this slot — so a button and its dots are recognisably the same thing.
              const placed =
                selectedLocation !== null && hasAnchorSlot(board, selectedLocation, slot);
              return (
                <button
                  key={slot}
                  style={{
                    ...(slot === activeSlot ? primaryBtn : smallBtn),
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                  title={
                    selectedLocation === null
                      ? `Place the ${slot} anchor`
                      : placed
                        ? `"${selectedLocation}" has a ${slot} anchor — click the board to move it`
                        : `"${selectedLocation}" has no ${slot} anchor yet`
                  }
                  onClick={() => onActiveSlot(slot)}
                >
                  <AnchorGlyphChip slot={slot} filled={placed} />
                  {slot}
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 6 }}>
            A filled chip means the selected location already has that anchor. On the board the
            shape is the slot and the colour is the kingdom.
          </div>
        </section>
      )}

      {mode === 'adjacency' && (
        <section style={section}>
          <div style={noteBox}>
            <strong>Authoring aid — not enforced during play.</strong> Adjacency is saved with the
            board and available to tools, but v1 does not validate hero movement against it.
          </div>
          <button style={smallBtn} onClick={onSuggestAdjacency}>
            Suggest from proximity
          </button>
        </section>
      )}

      <section
        style={{ ...section, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 6,
            flexShrink: 0,
          }}
        >
          <label style={{ ...labelStyle, whiteSpace: 'nowrap' }}>
            Locations ({board.locations.length})
          </label>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button style={smallBtn} onClick={addLocation}>
              + Add
            </button>
            <button
              style={{ ...dangerBtn, opacity: board.locations.length === 0 ? 0.4 : 1 }}
              disabled={board.locations.length === 0}
              title="Remove locations — all of them, or one kingdom / terrain / building"
              onClick={() => setRemoveScope({ kind: 'all' })}
            >
              Remove…
            </button>
          </div>
        </div>
        {/* Its own line: appended to the label it pushed the count out of the header. */}
        {unplaced.length > 0 && (
          <div style={{ fontSize: 11, color: '#fbbf24', margin: '4px 0 2px' }}>
            {unplaced.length} not on the board yet
          </div>
        )}
        <div ref={listRef} style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {board.locations.map((loc, i) => {
            const selected = loc.name === selectedLocation;
            const placed = isPlaced(board, loc.name);
            return (
              <div key={i} style={selected ? rowSelected : row}>
                <div style={rowHead} onClick={() => onSelectLocation(loc.name)}>
                  <button
                    style={placed ? placedBtn : unplacedBtn}
                    title={
                      placed
                        ? `"${loc.name}" is on the board — click to re-place it`
                        : `"${loc.name}" is not on the board yet — click, then click the spot`
                    }
                    onClick={(e) => {
                      e.stopPropagation();
                      placeLocation(loc.name);
                    }}
                  >
                    {placed ? '◉' : '◎'}
                  </button>
                  <span
                    style={{ ...kingdomDot, background: KINGDOM_COLOR[loc.kingdom] ?? '#94a3b8' }}
                    title={loc.kingdom}
                  />
                  <span style={nameText}>{loc.name}</span>
                  {loc.building && <span style={badge}>{loc.building}</span>}
                  <button
                    style={dangerIconBtn}
                    title="Remove location"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeLocation(i);
                    }}
                  >
                    ×
                  </button>
                </div>

                {/* Only the selected row carries fields. Four inline inputs never fit this panel —
                    they truncated to "Gras"/"Mou" and the building select overran its chevron. */}
                {selected && (
                  <div style={rowBody}>
                    <input
                      style={{ ...inputStyle, width: '100%' }}
                      value={loc.name}
                      aria-label="Location name"
                      onChange={(e) => renameLocation(i, e.target.value)}
                    />
                    <div style={fieldGrid}>
                      <label style={fieldLabel}>
                        kingdom
                        <select
                          style={{ ...inputStyle, width: '100%' }}
                          value={loc.kingdom}
                          onChange={(e) => patchLocation(i, { kingdom: e.target.value as Kingdom })}
                        >
                          {KINGDOMS.map((k) => (
                            <option key={k} value={k}>
                              {k}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={fieldLabel}>
                        terrain
                        <input
                          style={{ ...inputStyle, width: '100%' }}
                          list="udt-terrains"
                          value={loc.terrain}
                          onChange={(e) => patchLocation(i, { terrain: e.target.value })}
                        />
                      </label>
                      <label style={fieldLabel}>
                        building
                        <select
                          style={{ ...inputStyle, width: '100%' }}
                          value={loc.building ?? ''}
                          onChange={(e) =>
                            patchLocation(i, {
                              building: e.target.value
                                ? (e.target.value as BuildingType)
                                : undefined,
                            })
                          }
                        >
                          <option value="">—</option>
                          {BUILDING_TYPES.map((b) => (
                            <option key={b} value={b}>
                              {b}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <datalist id="udt-terrains">
          {TERRAIN_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div style={listFoot}>
          <strong>◎</strong> places a location on the board · <strong>◉</strong> already placed.
          Renaming remaps anchors and adjacency, but not graph nodes — the Problems panel flags
          those.
        </div>
      </section>

      <section style={section}>
        <label style={labelStyle}>
          Validation {errors.length === 0 ? '✓' : `— ${errors.length} error(s)`}
        </label>
        <div style={{ maxHeight: 120, overflowY: 'auto' }}>
          {problems.length === 0 && (
            <div style={{ fontSize: 11, color: '#4ade80' }}>No problems.</div>
          )}
          {errors.map((p, i) => (
            <div key={`e${i}`} style={{ fontSize: 11, color: '#f87171' }}>
              ✕ {p.message}
            </div>
          ))}
          {warns.map((p, i) => (
            <div key={`w${i}`} style={{ fontSize: 11, color: '#fbbf24' }}>
              ⚠ {p.message}
            </div>
          ))}
        </div>
      </section>

      {removeScope !== null && (
        <ConfirmDialog
          title="Remove locations"
          confirmLabel={`Remove ${locationsInScope(board, removeScope).length}`}
          message={<RemoveScopePicker board={board} scope={removeScope} onScope={setRemoveScope} />}
          onConfirm={() => removeInScope(removeScope)}
          onCancel={() => setRemoveScope(null)}
        />
      )}
    </div>
  );
}

const FACETS: Array<{ id: ScopeFacet | 'all'; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'kingdom', label: 'Kingdom' },
  { id: 'terrain', label: 'Terrain' },
  { id: 'building', label: 'Building' },
];

/**
 * The bulk-remove dialog body: pick a facet, then a value. Choices come from `scopeChoices`, which
 * lists only values the board actually has — so every selectable scope removes at least one
 * location and the confirm button can never be a no-op.
 */
function RemoveScopePicker({
  board,
  scope,
  onScope,
}: {
  board: Board;
  scope: LocationScope;
  onScope: (next: LocationScope) => void;
}) {
  const choices = scope.kind === 'all' ? [] : scopeChoices(board, scope.kind);
  const doomed = locationsInScope(board, scope).length;
  const total = board.locations.length;

  /** Switching facet lands on its first available value (every facet has one — see scopeChoices). */
  const pickFacet = (facet: ScopeFacet | 'all'): void => {
    if (facet === 'all') return onScope({ kind: 'all' });
    const first = scopeChoices(board, facet)[0]?.value;
    if (first === undefined) return;
    onScope(
      facet === 'kingdom'
        ? { kind: 'kingdom', value: first as Kingdom }
        : facet === 'terrain'
          ? { kind: 'terrain', value: first }
          : { kind: 'building', value: first as BuildingType | typeof NO_BUILDING },
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {FACETS.map((f) => {
          const empty = f.id !== 'all' && scopeChoices(board, f.id).length === 0;
          return (
            <button
              key={f.id}
              style={{ ...(f.id === scope.kind ? primaryBtn : smallBtn), opacity: empty ? 0.4 : 1 }}
              disabled={empty}
              onClick={() => pickFacet(f.id)}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {scope.kind !== 'all' && (
        <select
          style={{ ...inputStyle, width: '100%' }}
          value={scope.value}
          onChange={(e) => onScope({ kind: scope.kind, value: e.target.value } as LocationScope)}
        >
          {choices.map((c) => (
            <option key={c.value} value={c.value}>
              {c.value} ({c.n})
            </option>
          ))}
        </select>
      )}

      <div>
        Removes <strong>{doomed}</strong> of {total} location{total === 1 ? '' : 's'}
        {doomed === total ? ' — the whole board' : ''}. Their anchors and adjacency edges go with
        them. Graph nodes that referenced these names are <strong>not</strong> rewritten — the
        Problems panel will flag them. There is no undo.
      </div>
    </div>
  );
}

function NumberRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number | undefined;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span style={{ fontSize: 11, flex: 1 }}>{label}</span>
      <input
        style={{ ...inputStyle, width: 80 }}
        type="number"
        min={min}
        max={max}
        step={0.1}
        value={value ?? ''}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (Number.isFinite(v)) onChange(v);
        }}
      />
    </div>
  );
}

const fmt = (v: number | undefined): string => (typeof v === 'number' ? v.toFixed(3) : '—');

const panel: CSSProperties = {
  width: 340,
  flexShrink: 0,
  borderLeft: '1px solid var(--c-border)',
  display: 'flex',
  flexDirection: 'column',
  overflowY: 'auto',
  background: 'var(--c-surface-0)',
};

const section: CSSProperties = {
  padding: 10,
  borderBottom: '1px solid var(--c-border)',
};

// A location is a compact one-line row; only the SELECTED one opens to reveal its fields.
// 60 rows have to stay scannable, and four inline inputs in a 340px panel do not.
const row: CSSProperties = {
  borderRadius: 4,
  marginBottom: 1,
};

const rowSelected: CSSProperties = {
  ...row,
  background: 'var(--c-surface-raised)',
  outline: '1px solid var(--c-accent, #38bdf8)',
  marginBottom: 4,
};

const rowHead: CSSProperties = {
  display: 'flex',
  gap: 6,
  alignItems: 'center',
  padding: '3px 4px',
  cursor: 'pointer',
  minWidth: 0,
};

/** Kingdom as a colour chip — the same colour the map fills this location's anchors with. */
const kingdomDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: '50%',
  flexShrink: 0,
};

const nameText: CSSProperties = {
  flex: 1,
  minWidth: 0,
  fontSize: 12,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const badge: CSSProperties = {
  flexShrink: 0,
  fontSize: 10,
  padding: '1px 5px',
  borderRadius: 3,
  background: 'var(--c-surface-2, rgba(255,255,255,.07))',
  color: 'var(--c-text-muted)',
};

const rowBody: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
  padding: '2px 6px 8px',
};

const fieldGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr 1fr',
  gap: 5,
};

const fieldLabel: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 2,
  minWidth: 0,
  fontSize: 10,
  color: 'var(--c-text-muted)',
};

/** The per-row "put this on the board" button. Filled = placed, hollow + amber = not yet. */
const placedBtn: CSSProperties = {
  padding: '2px 6px',
  border: 'none',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-text-muted)',
  fontSize: 11,
  lineHeight: 1,
  cursor: 'pointer',
};

const unplacedBtn: CSSProperties = { ...placedBtn, color: '#fbbf24' };

/** Sits under the scrolling list — the border is what stops a half-cut row reading as text. */
const listFoot: CSSProperties = {
  fontSize: 10,
  lineHeight: 1.5,
  color: 'var(--c-text-muted)',
  marginTop: 6,
  paddingTop: 6,
  borderTop: '1px solid var(--c-border)',
};

const noteBox: CSSProperties = {
  fontSize: 11,
  lineHeight: 1.45,
  padding: 8,
  marginBottom: 8,
  borderRadius: 4,
  border: '1px solid #fbbf24',
  background: 'rgba(251,191,36,.08)',
  color: 'var(--c-text)',
};
