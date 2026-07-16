// BoardEditorPanel — the Board Designer's right-hand editor: identity, art, calibration, the
// locations table, and the validation summary.
//
// Renaming a location remaps its anchors + adjacency keys in the SAME commit, so the board never
// lands in a state its own validation rejects. Graph-node props that referenced the old name are
// deliberately NOT rewritten — L2 surfaces those as dangling refs; the panel hints at it.

import { useRef } from 'react';
import type { CSSProperties } from 'react';
import {
  ANCHOR_SLOTS,
  BUILDING_TYPES,
  KINGDOMS,
  TERRAIN_SUGGESTIONS,
  dangerIconBtn,
  inputStyle,
  isCalibrated,
  labelStyle,
  primaryBtn,
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

  const removeLocation = (index: number): void => {
    const name = board.locations[index].name;
    const locations = board.locations.filter((_, i) => i !== index);
    const anchors = { ...(board.anchors ?? {}) };
    delete anchors[name];
    const adjacency: Record<string, string[]> = {};
    for (const [k, v] of Object.entries(board.adjacency ?? {})) {
      if (k === name) continue;
      const kept = v.filter((x) => x !== name);
      if (kept.length > 0) adjacency[k] = kept;
    }
    onChange({ ...board, locations, anchors, adjacency });
    if (selectedLocation === name) onSelectLocation(null);
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
        <button style={smallBtn} onClick={() => fileRef.current?.click()}>
          {board.imageRef ? 'Replace art…' : 'Upload art…'}
        </button>
        <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginTop: 4 }}>
          {board.imageInfo.width}×{board.imageInfo.height}
          {board.imageRef ? '' : ' · no art yet (renders blank)'}
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
          <button style={smallBtn} onClick={addLocation}>
            + Add
          </button>
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
