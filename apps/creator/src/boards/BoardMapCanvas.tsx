// BoardMapCanvas — the board art with its anchors, adjacency graph and circle calibration
// overlaid. Coordinates are normalized [0,1] against the image, matching `$defs/anchorPoint`
// and `BOARD_ANCHORS`, so the annotation is resolution-independent.
//
// Zoom/pan is patterned on DungeonMapCanvas: wheel to zoom at the cursor, drag the background
// to pan. Mode decides what a click does — see `BoardEditMode`.

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AnchorSlot, Board } from './shared';
import { bfsDistance, locationPoint } from './shared';

export type BoardEditMode = 'locations' | 'anchors' | 'adjacency' | 'calibrate';

export interface BoardMapCanvasProps {
  board: Board;
  imageUrl?: string;
  mode: BoardEditMode;
  /** The location being edited (anchor placement targets this one). */
  selectedLocation: string | null;
  /** Which anchor slot `anchors` mode places. */
  activeSlot: AnchorSlot;
  /** Adjacency mode: the first-clicked endpoint, if any. */
  adjacencyFrom: string | null;
  onSelectLocation: (name: string | null) => void;
  onPlaceAnchor: (name: string, slot: AnchorSlot, at: { x: number; y: number }) => void;
  onToggleAdjacency: (a: string, b: string) => void;
  onCalibrate: (patch: { centerX?: number; centerY?: number; radius?: number }) => void;
}

const KINGDOM_COLOR: Record<string, string> = {
  north: '#60a5fa',
  east: '#facc15',
  south: '#4ade80',
  west: '#f87171',
};

export function BoardMapCanvas({
  board,
  imageUrl,
  mode,
  selectedLocation,
  activeSlot,
  adjacencyFrom,
  onSelectLocation,
  onPlaceAnchor,
  onToggleAdjacency,
  onCalibrate,
}: BoardMapCanvasProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panning, setPanning] = useState(false);
  const dragRef = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null);
  const calibDragRef = useRef<'center' | 'radius' | null>(null);

  const { width, height } = board.imageInfo;

  // Reset the view when the board changes, so a new board isn't inherited zoomed in on some
  // spot from the last one. Tracked as render-phase state (the adjust-during-render pattern the
  // deck/dungeon builders use) rather than an effect.
  const [viewedBoardId, setViewedBoardId] = useState(board.id);
  if (viewedBoardId !== board.id) {
    setViewedBoardId(board.id);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  /** Client point → normalized [0,1] image coords. */
  const toNorm = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    // The viewBox maps 1:1 to the rect, so invert rect → viewBox → normalized.
    const vx = ((clientX - rect.left) / rect.width) * (width / zoom) + pan.x;
    const vy = ((clientY - rect.top) / rect.height) * (height / zoom) + pan.y;
    return { x: clamp01(vx / width), y: clamp01(vy / height) };
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = clamp(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 12);
    setZoom(next);
  };

  const handleBackgroundDown = (e: React.MouseEvent) => {
    if (mode === 'calibrate' && e.shiftKey) return;
    dragRef.current = { x: e.clientX, y: e.clientY, pan };
    setPanning(true);
  };

  const handleMove = (e: React.MouseEvent) => {
    if (calibDragRef.current) {
      const p = toNorm(e.clientX, e.clientY);
      if (!p) return;
      if (calibDragRef.current === 'center') onCalibrate({ centerX: p.x, centerY: p.y });
      else {
        const cx = board.imageInfo.centerX ?? 0.5;
        const cy = board.imageInfo.centerY ?? 0.5;
        onCalibrate({ radius: clamp(Math.hypot(p.x - cx, p.y - cy), 0.01, 1) });
      }
      return;
    }
    const drag = dragRef.current;
    if (!drag) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const dx = ((e.clientX - drag.x) / rect.width) * (width / zoom);
    const dy = ((e.clientY - drag.y) / rect.height) * (height / zoom);
    setPan({ x: drag.pan.x - dx, y: drag.pan.y - dy });
  };

  const endDrag = () => {
    dragRef.current = null;
    calibDragRef.current = null;
    setPanning(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (mode !== 'anchors' || !selectedLocation) return;
    const p = toNorm(e.clientX, e.clientY);
    if (p) onPlaceAnchor(selectedLocation, activeSlot, p);
  };

  const info = board.imageInfo;
  const cx = (info.centerX ?? 0.5) * width;
  const cy = (info.centerY ?? 0.5) * height;
  const r = (info.radius ?? 0.5) * Math.min(width, height);
  const dot = Math.max(width, height) / 140;

  return (
    <div style={wrap}>
      <svg
        ref={svgRef}
        viewBox={`${pan.x} ${pan.y} ${width / zoom} ${height / zoom}`}
        preserveAspectRatio="xMidYMid meet"
        style={{ width: '100%', height: '100%', cursor: panning ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleBackgroundDown}
        onMouseMove={handleMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClick={handleClick}
      >
        {imageUrl ? (
          <image href={imageUrl} x={0} y={0} width={width} height={height} />
        ) : (
          <rect x={0} y={0} width={width} height={height} fill="var(--c-surface-2, #1f2937)" />
        )}

        {/* adjacency edges, under the anchors */}
        {mode === 'adjacency' &&
          adjacencyEdges(board).map(([a, b, pa, pb]) => (
            <line
              key={`${a}|${b}`}
              x1={pa.x * width}
              y1={pa.y * height}
              x2={pb.x * width}
              y2={pb.y * height}
              stroke="#38bdf8"
              strokeWidth={dot / 3}
              opacity={0.85}
            />
          ))}

        {/* calibration overlay */}
        {mode === 'calibrate' && (
          <>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke="#fbbf24"
              strokeWidth={dot / 2}
              strokeDasharray={`${dot * 2} ${dot}`}
            />
            <circle
              cx={cx}
              cy={cy}
              r={dot}
              fill="#fbbf24"
              style={{ cursor: 'move' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                calibDragRef.current = 'center';
              }}
            />
            <circle
              cx={cx + r}
              cy={cy}
              r={dot}
              fill="#f97316"
              style={{ cursor: 'ew-resize' }}
              onMouseDown={(e) => {
                e.stopPropagation();
                calibDragRef.current = 'radius';
              }}
            />
            {/* north heading indicator — a spoke from the center */}
            {typeof info.northHeadingDegrees === 'number' && (
              <line
                x1={cx}
                y1={cy}
                x2={cx + r * Math.cos(((info.northHeadingDegrees - 90) * Math.PI) / 180)}
                y2={cy + r * Math.sin(((info.northHeadingDegrees - 90) * Math.PI) / 180)}
                stroke="#fbbf24"
                strokeWidth={dot / 2}
              />
            )}
          </>
        )}

        {/* location anchors */}
        {board.locations.map((loc) => {
          const slots = board.anchors?.[loc.name];
          if (!slots) return null;
          const isSelected = loc.name === selectedLocation;
          const isFrom = loc.name === adjacencyFrom;
          return Object.entries(slots).map(([slot, p]) => {
            if (!p) return null;
            const emphasize = isSelected && (mode !== 'anchors' || slot === activeSlot);
            return (
              <g key={`${loc.name}:${slot}`}>
                <circle
                  cx={p.x * width}
                  cy={p.y * height}
                  r={emphasize || isFrom ? dot * 1.5 : dot}
                  fill={KINGDOM_COLOR[loc.kingdom] ?? '#94a3b8'}
                  stroke={isFrom ? '#38bdf8' : emphasize ? '#fff' : 'rgba(0,0,0,.55)'}
                  strokeWidth={dot / 2.5}
                  opacity={slot === 'hero' || mode === 'anchors' ? 1 : 0.75}
                  style={{ cursor: 'pointer' }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mode === 'adjacency') {
                      if (adjacencyFrom && adjacencyFrom !== loc.name) {
                        onToggleAdjacency(adjacencyFrom, loc.name);
                        onSelectLocation(null);
                      } else {
                        onSelectLocation(loc.name);
                      }
                      return;
                    }
                    onSelectLocation(loc.name);
                  }}
                />
                {emphasize && (
                  <text
                    x={p.x * width}
                    y={p.y * height - dot * 2}
                    textAnchor="middle"
                    fontSize={dot * 2.6}
                    fill="#fff"
                    stroke="rgba(0,0,0,.7)"
                    strokeWidth={dot / 4}
                    paintOrder="stroke"
                    style={{ pointerEvents: 'none' }}
                  >
                    {loc.name}
                  </text>
                )}
              </g>
            );
          });
        })}
      </svg>

      <div style={hint}>
        {mode === 'anchors' && selectedLocation
          ? `Click the map to place "${selectedLocation}" · ${activeSlot}`
          : mode === 'anchors'
            ? 'Pick a location to place its anchors'
            : mode === 'adjacency'
              ? adjacencyFrom
                ? `Linking from "${adjacencyFrom}" — click another location (click it again to unlink)`
                : 'Click two locations to link/unlink them'
              : mode === 'calibrate'
                ? 'Drag the centre dot and the radius handle to fit the board circle'
                : 'Wheel to zoom · drag to pan'}
        {mode === 'adjacency' && adjacencyFrom && (
          <AdjacencyDistanceHint board={board} from={adjacencyFrom} />
        )}
      </div>
    </div>
  );
}

/** Live BFS preview: how far the rest of the board is from the picked endpoint. */
function AdjacencyDistanceHint({ board, from }: { board: Board; from: string }) {
  const reachable = board.locations
    .map((l) => ({ name: l.name, d: bfsDistance(board, from, l.name) }))
    .filter((e) => e.d !== null && e.d > 0);
  const unreachable = board.locations.length - 1 - reachable.length;
  const max = reachable.reduce((m, e) => Math.max(m, e.d as number), 0);
  return (
    <span style={{ marginLeft: 10, opacity: 0.85 }}>
      · reaches {reachable.length} location{reachable.length === 1 ? '' : 's'} (max {max} steps)
      {unreachable > 0 ? `, ${unreachable} unreachable` : ''}
    </span>
  );
}

function adjacencyEdges(
  board: Board,
): Array<[string, string, { x: number; y: number }, { x: number; y: number }]> {
  const out: Array<[string, string, { x: number; y: number }, { x: number; y: number }]> = [];
  const seen = new Set<string>();
  for (const [a, tos] of Object.entries(board.adjacency ?? {})) {
    for (const b of tos) {
      const key = a < b ? `${a}|${b}` : `${b}|${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const pa = locationPoint(board, a);
      const pb = locationPoint(board, b);
      if (pa && pb) out.push([a, b, pa, pb]);
    }
  }
  return out;
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
const clamp01 = (v: number): number => clamp(v, 0, 1);

const wrap: CSSProperties = {
  position: 'relative',
  flex: 1,
  minWidth: 0,
  display: 'flex',
  background: 'var(--c-surface-1)',
  overflow: 'hidden',
};

const hint: CSSProperties = {
  position: 'absolute',
  left: 8,
  bottom: 8,
  padding: '4px 8px',
  borderRadius: 4,
  background: 'rgba(0,0,0,.6)',
  color: '#e5e7eb',
  fontSize: 11,
  pointerEvents: 'none',
};
