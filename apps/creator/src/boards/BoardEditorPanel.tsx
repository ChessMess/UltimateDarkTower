// BoardEditorPanel — the Board Designer's right-hand editor: identity, art, calibration, the
// locations table, and the validation summary.
//
// Renaming a location remaps its anchors + adjacency keys in the SAME commit, so the board never
// lands in a state its own validation rejects. Graph-node props that referenced the old name are
// deliberately NOT rewritten — L2 surfaces those as dangling refs; the panel hints at it.

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { BUILTIN_BOARD_IMAGE_REF, isBuiltinBoardImageRef } from '@udtc/adapters';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  ANCHOR_SLOTS,
  BUILDING_TYPES,
  KINGDOMS,
  NO_BUILDING,
  TERRAIN_SUGGESTIONS,
  dangerBtn,
  dangerIconBtn,
  inputStyle,
  isCalibrated,
  labelStyle,
  locationsInScope,
  primaryBtn,
  pruneToLocations,
  removeLocationsInScope,
  scopeChoices,
  smallBtn,
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

  const addLocation = (): void => {
    let n = board.locations.length + 1;
    let name = `Location ${n}`;
    const taken = new Set(board.locations.map((l) => l.name));
    while (taken.has(name)) name = `Location ${++n}`;
    onChange({
      ...board,
      locations: [...board.locations, { name, kingdom: 'north', terrain: 'Grasslands' }],
    });
    onSelectLocation(name);
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
          style={inputStyle}
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
            ? ' · built-in Return to Dark Tower art (not stored in this file)'
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
            {ANCHOR_SLOTS.map((slot) => (
              <button
                key={slot}
                style={slot === activeSlot ? primaryBtn : smallBtn}
                onClick={() => onActiveSlot(slot)}
              >
                {slot}
              </button>
            ))}
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={labelStyle}>Locations ({board.locations.length})</label>
          <div style={{ display: 'flex', gap: 6 }}>
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
        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {board.locations.map((loc, i) => (
            <div
              key={i}
              style={{
                ...row,
                outline:
                  loc.name === selectedLocation ? '1px solid var(--c-accent, #38bdf8)' : 'none',
              }}
              onClick={() => onSelectLocation(loc.name)}
            >
              <input
                style={{ ...inputStyle, flex: 2, minWidth: 0 }}
                value={loc.name}
                onChange={(e) => renameLocation(i, e.target.value)}
              />
              <select
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                value={loc.kingdom}
                onChange={(e) => patchLocation(i, { kingdom: e.target.value as Kingdom })}
              >
                {KINGDOMS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
              <input
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                list="udt-terrains"
                value={loc.terrain}
                onChange={(e) => patchLocation(i, { terrain: e.target.value })}
              />
              <select
                style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                value={loc.building ?? ''}
                onChange={(e) =>
                  patchLocation(i, {
                    building: e.target.value ? (e.target.value as BuildingType) : undefined,
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
          ))}
        </div>
        <datalist id="udt-terrains">
          {TERRAIN_SUGGESTIONS.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 6 }}>
          Renaming remaps anchors + adjacency. Graph nodes that referenced the old name are not
          rewritten — the Problems panel will flag them.
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

const row: CSSProperties = {
  display: 'flex',
  gap: 4,
  alignItems: 'center',
  padding: '3px 2px',
  borderRadius: 4,
  cursor: 'pointer',
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
