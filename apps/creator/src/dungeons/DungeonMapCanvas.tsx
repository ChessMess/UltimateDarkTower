// DungeonMapCanvas — the interactive map grid. Renders the masterBitmap under a cols×rows grid.
// Click an empty cell to add a room; click a room to select it; click the handle on a shared edge
// between two adjacent rooms to toggle wall/door (written reciprocally to both rooms). Entrance ⭐ and
// target 🎯 badges mark those rooms.
//
// Three modes (mutually exclusive toolbar toggles):
//   • Edit    — place rooms / toggle doors (default).
//   • Align   — the map image gets 8 grab handles + a drag body so you can move/scale it under the
//               fixed grid until the drawn rooms sit on the lattice; writes dungeon.bitmapRect
//               (grid-cell units, schema 0.4.5). "Reset" restores the grid-filling default.
//   • Preview — masks the map and reveals rooms as you click them, simulating play-time fog.

import { useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react';
import {
  DIRS,
  DELTA,
  OPPOSITE,
  bitmapRectOf,
  roomAtCell,
  type BitmapRect,
  type Dir,
  type Dungeon,
  type DungeonRoom,
} from './shared';

const DEFAULT_CELL = 84; // fallback before the container has been measured
const MIN_CELL = 48; // floor so the grid stays legible on tiny/large dungeons
const MAX_CELL = 160; // ceiling so a 2-room dungeon doesn't blow up on a big screen
const MARGIN = 40; // breathing room between the grid and the surrounding panel, in px
const MIN_CELLS = 0.4; // smallest the map rect may shrink to, in grid cells
const round3 = (n: number) => Math.round(n * 1000) / 1000;

type Handle = 'move' | 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';
// unit anchor (0..1) of each resize handle within the image rect, plus its cursor
const HANDLES: { h: Exclude<Handle, 'move'>; ux: number; uy: number; cursor: string }[] = [
  { h: 'nw', ux: 0, uy: 0, cursor: 'nwse-resize' },
  { h: 'n', ux: 0.5, uy: 0, cursor: 'ns-resize' },
  { h: 'ne', ux: 1, uy: 0, cursor: 'nesw-resize' },
  { h: 'e', ux: 1, uy: 0.5, cursor: 'ew-resize' },
  { h: 'se', ux: 1, uy: 1, cursor: 'nwse-resize' },
  { h: 's', ux: 0.5, uy: 1, cursor: 'ns-resize' },
  { h: 'sw', ux: 0, uy: 1, cursor: 'nesw-resize' },
  { h: 'w', ux: 0, uy: 0.5, cursor: 'ew-resize' },
];

/** Apply a drag (dx,dy in grid cells) to a rect for the given handle, clamping to MIN_CELLS. */
function applyRect(r: BitmapRect, h: Handle, dx: number, dy: number): BitmapRect {
  let { x, y, w, h: hh } = r;
  if (h === 'move') {
    x = r.x + dx;
    y = r.y + dy;
  } else {
    if (h.includes('e')) w = r.w + dx;
    if (h.includes('w')) {
      w = r.w - dx;
      x = r.x + dx;
    }
    if (h.includes('s')) hh = r.h + dy;
    if (h.includes('n')) {
      hh = r.h - dy;
      y = r.y + dy;
    }
    if (w < MIN_CELLS) {
      if (h.includes('w')) x = r.x + r.w - MIN_CELLS; // keep the opposite (east) edge anchored
      w = MIN_CELLS;
    }
    if (hh < MIN_CELLS) {
      if (h.includes('n')) y = r.y + r.h - MIN_CELLS;
      hh = MIN_CELLS;
    }
  }
  return { x: round3(x), y: round3(y), w: round3(w), h: round3(hh) };
}

export interface DungeonMapCanvasProps {
  dungeon: Dungeon;
  imageUrl?: string;
  selectedRoomId: string | null;
  onSelectRoom: (id: string | null) => void;
  onChange: (next: Dungeon) => void;
}

export function DungeonMapCanvas({
  dungeon,
  imageUrl,
  selectedRoomId,
  onSelectRoom,
  onChange,
}: DungeonMapCanvasProps) {
  const { cols, rows } = dungeon.grid;
  const [mode, setMode] = useState<'edit' | 'align' | 'preview'>('edit');
  const align = mode === 'align';
  const preview = mode === 'preview';
  const entranceId = useMemo(() => dungeon.rooms.find((r) => r.isEntrance)?.id, [dungeon.rooms]);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const rect = bitmapRectOf(dungeon);

  // Grow the grid to fill the available panel space (measured via ResizeObserver) instead of a
  // fixed pixel-per-cell size, clamped so tiny dungeons don't balloon and huge ones stay legible.
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setContainerSize({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const CELL = useMemo(() => {
    if (containerSize.w <= 0 || containerSize.h <= 0) return DEFAULT_CELL;
    const fit = Math.min(containerSize.w / cols, containerSize.h / rows);
    return Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(fit)));
  }, [containerSize, cols, rows]);

  const startPreview = () => {
    setRevealed(new Set(entranceId ? [entranceId] : []));
    setMode('preview');
  };

  const uniqueRoomId = (base: string): string => {
    let id = base;
    let i = 2;
    while (dungeon.rooms.some((r) => r.id === id)) id = `${base}-${i++}`;
    return id;
  };

  const addRoom = (col: number, row: number) => {
    const room: DungeonRoom = {
      id: uniqueRoomId(`room-${col}-${row}`),
      cell: { col, row },
      exits: { N: 'wall', E: 'wall', S: 'wall', W: 'wall' },
      isEntrance: dungeon.rooms.length === 0,
    };
    onChange({ ...dungeon, rooms: [...dungeon.rooms, room] });
    onSelectRoom(room.id);
  };

  const toggleDoor = (room: DungeonRoom, dir: Dir) => {
    const nc = room.cell.col + DELTA[dir].dc;
    const nr = room.cell.row + DELTA[dir].dr;
    const neighbor = roomAtCell(dungeon, nc, nr);
    if (!neighbor) return;
    const next = room.exits[dir] === 'door' ? 'wall' : 'door';
    const rooms = dungeon.rooms.map((r) => {
      if (r.id === room.id) return { ...r, exits: { ...r.exits, [dir]: next } };
      if (r.id === neighbor.id) return { ...r, exits: { ...r.exits, [OPPOSITE[dir]]: next } };
      return r;
    });
    onChange({ ...dungeon, rooms });
  };

  const revealFrom = (room: DungeonRoom) => {
    if (!revealed.has(room.id)) return;
    const next = new Set(revealed);
    for (const dir of DIRS) {
      if (room.exits[dir] !== 'door') continue;
      const nb = roomAtCell(dungeon, room.cell.col + DELTA[dir].dc, room.cell.row + DELTA[dir].dr);
      if (nb) next.add(nb.id);
    }
    setRevealed(next);
  };

  // Start dragging a handle: track pointer deltas (px → cells) on window until pointerup. Captures
  // the rect at drag-start so each move recomputes from the origin (no compounding rounding).
  const beginDrag = (h: Handle) => (e: ReactPointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const start = bitmapRectOf(dungeon);
    const sx = e.clientX;
    const sy = e.clientY;
    const onMove = (ev: PointerEvent) => {
      onChange({
        ...dungeon,
        bitmapRect: applyRect(start, h, (ev.clientX - sx) / CELL, (ev.clientY - sy) / CELL),
      });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const resetRect = () => {
    const next = { ...dungeon };
    delete next.bitmapRect;
    onChange(next);
  };

  const imgL = rect.x * CELL;
  const imgT = rect.y * CELL;
  const imgW = rect.w * CELL;
  const imgH = rect.h * CELL;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0, flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {imageUrl && (
          <button
            style={align ? toggleActive : toggleBtn}
            onClick={() => setMode(align ? 'edit' : 'align')}
          >
            {align ? '◉ Align image (on)' : '⤢ Align image'}
          </button>
        )}
        <button
          style={preview ? toggleActive : toggleBtn}
          onClick={() => (preview ? setMode('edit') : startPreview())}
        >
          {preview ? '◉ Preview reveal (on)' : '○ Preview reveal'}
        </button>
        {align && (
          <>
            <button style={toggleBtn} onClick={resetRect} disabled={!dungeon.bitmapRect}>
              Reset to grid
            </button>
            <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
              Drag the image or its handles to line the map up with the grid.
            </span>
          </>
        )}
        {preview && (
          <span style={{ fontSize: 11, color: 'var(--c-text-muted)' }}>
            Click a lit room to reveal its neighbors.
          </span>
        )}
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: MARGIN,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: cols * CELL,
            height: rows * CELL,
            background: '#0b0b10',
            borderRadius: 6,
            flex: '0 0 auto',
            overflow: align ? 'visible' : 'hidden',
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="dungeon map"
              draggable={false}
              onPointerDown={align ? beginDrag('move') : undefined}
              style={{
                position: 'absolute',
                left: imgL,
                top: imgT,
                width: imgW,
                height: imgH,
                objectFit: 'fill',
                borderRadius: align ? 0 : 6,
                pointerEvents: align ? 'auto' : 'none',
                cursor: align ? 'move' : 'default',
                opacity: align ? 0.92 : 1,
                outline: align ? '2px dashed #c4b5fd' : 'none',
                userSelect: 'none',
              }}
            />
          )}

          {/* cells */}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              const room = roomAtCell(dungeon, c, r);
              const lit = align || !preview || (room ? revealed.has(room.id) : false);
              const selected = room && room.id === selectedRoomId;
              return (
                <div
                  key={`${c}-${r}`}
                  onClick={() => {
                    if (align) return;
                    if (preview) {
                      if (room) revealFrom(room);
                      return;
                    }
                    if (room) onSelectRoom(room.id);
                    else addRoom(c, r);
                  }}
                  style={{
                    position: 'absolute',
                    left: c * CELL,
                    top: r * CELL,
                    width: CELL,
                    height: CELL,
                    boxSizing: 'border-box',
                    cursor: align ? 'default' : 'pointer',
                    pointerEvents: align ? 'none' : 'auto',
                    border: room
                      ? `2px solid ${selected ? '#c4b5fd' : 'rgba(124,58,237,0.9)'}`
                      : `1px dashed rgba(148,163,184,${align ? 0.6 : 0.35})`,
                    borderRadius: 4,
                    background: room
                      ? selected
                        ? 'rgba(124,58,237,0.22)'
                        : 'rgba(124,58,237,0.06)'
                      : 'transparent',
                    // preview fog: darken every non-lit cell
                    boxShadow: !lit ? 'inset 0 0 0 999px rgba(6,6,12,0.92)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textAlign: 'center',
                  }}
                >
                  {room && lit && (
                    <div style={{ pointerEvents: 'none' }}>
                      <div style={{ fontSize: 14 }}>
                        {room.isEntrance ? '⭐' : ''}
                        {room.isTarget ? '🎯' : ''}
                      </div>
                      <div style={{ ...roomLabel, maxWidth: CELL - 8 }}>{room.name || room.id}</div>
                    </div>
                  )}
                </div>
              );
            }),
          )}

          {/* door/wall edge handles (edit mode only): one per E and S shared edge between two rooms */}
          {!preview &&
            !align &&
            dungeon.rooms.map((room) =>
              (['E', 'S'] as const).map((dir) => {
                const nc = room.cell.col + DELTA[dir].dc;
                const nr = room.cell.row + DELTA[dir].dr;
                const neighbor = roomAtCell(dungeon, nc, nr);
                if (!neighbor) return null;
                const isDoor = room.exits[dir] === 'door';
                const left =
                  dir === 'E' ? (room.cell.col + 1) * CELL - 9 : room.cell.col * CELL + CELL / 2 - 9;
                const top =
                  dir === 'S' ? (room.cell.row + 1) * CELL - 9 : room.cell.row * CELL + CELL / 2 - 9;
                return (
                  <button
                    key={`${room.id}-${dir}`}
                    title={isDoor ? 'Door (click to wall off)' : 'Wall (click to open a door)'}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleDoor(room, dir);
                    }}
                    style={{
                      position: 'absolute',
                      left,
                      top,
                      width: 18,
                      height: 18,
                      borderRadius: 4,
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: 11,
                      lineHeight: '18px',
                      padding: 0,
                      background: isDoor ? '#22c55e' : '#475569',
                      color: '#fff',
                      zIndex: 5,
                    }}
                  >
                    {isDoor ? '⛶' : '▮'}
                  </button>
                );
              }),
            )}

          {/* image resize handles (align mode only) */}
          {align &&
            imageUrl &&
            HANDLES.map(({ h, ux, uy, cursor }) => (
              <div
                key={h}
                onPointerDown={beginDrag(h)}
                style={{
                  position: 'absolute',
                  left: imgL + ux * imgW - 6,
                  top: imgT + uy * imgH - 6,
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: '#c4b5fd',
                  border: '1px solid #4c1d95',
                  cursor,
                  touchAction: 'none',
                  zIndex: 10,
                }}
              />
            ))}
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--c-text-faint)' }}>
        {align
          ? 'Move/scale the map so its rooms sit on the grid cells · “Reset to grid” snaps it back to fill.'
          : 'Click an empty cell to add a room · green ⛶ = door, gray ▮ = wall (click to toggle)'}
      </div>
    </div>
  );
}

const roomLabel: CSSProperties = {
  fontSize: 9,
  color: '#e9e5ff',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
};
const toggleBtn: CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 12,
  cursor: 'pointer',
};
const toggleActive: CSSProperties = { ...toggleBtn, background: 'var(--c-primary)', color: 'var(--c-primary-fg)', borderColor: 'transparent' };
