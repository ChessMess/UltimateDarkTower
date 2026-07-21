// BoardMapCanvas — the board art with its anchors, adjacency graph and circle calibration
// overlaid. Coordinates are normalized [0,1] against the image, matching `$defs/anchorPoint`
// and `BOARD_ANCHORS`, so the annotation is resolution-independent.
//
// Zoom/pan is patterned on DungeonMapCanvas: wheel to zoom at the cursor, drag the background
// to pan. Mode decides what a click does — see `BoardEditMode`.

import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { AnchorSlot, Board } from './shared';
import {
  KINGDOM_COLOR,
  bfsDistance,
  clientToNormalized,
  locationPoint,
  viewportFit,
} from './shared';
import { AnchorGlyph } from './AnchorGlyph';

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
  // A pan ends in a click on the <svg>, which would otherwise drop an anchor wherever the drag
  // was released. Set once the pointer travels past DRAG_SLOP; consumed (and reset) by handleClick.
  const draggedRef = useRef(false);

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

  /** The SVG's current viewBox — pan is its origin, zoom shrinks its size. */
  const viewBox = { x: pan.x, y: pan.y, w: width / zoom, h: height / zoom };

  /**
   * Keeps the viewBox inside the image, so the board can't be dragged off into the void.
   * At zoom 1 the window is the whole image, so this pins pan to {0,0}.
   */
  const clampPan = (p: { x: number; y: number }, z: number): { x: number; y: number } => ({
    x: clamp(p.x, 0, width - width / z),
    y: clamp(p.y, 0, height - height / z),
  });

  /** Client point → normalized [0,1] image coords, through the meet-fit letterbox. */
  const toNorm = (clientX: number, clientY: number): { x: number; y: number } | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    return clientToNormalized({ x: clientX, y: clientY }, rect, viewBox, board.imageInfo);
  };

  /** Zoom about the cursor: the image point under the pointer stays under the pointer. */
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const next = clamp(zoom * (e.deltaY < 0 ? 1.15 : 1 / 1.15), 1, 12);
    if (next === zoom) return; // already railed at min/max
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // The pads don't move with zoom (the drawn area is zoom-invariant), so they're reused below.
    const { scale, padX, padY } = viewportFit(rect, viewBox.w, viewBox.h);
    const offX = e.clientX - rect.left - padX;
    const offY = e.clientY - rect.top - padY;
    const nextScale = scale * (next / zoom);
    setPan(
      clampPan(
        { x: offX / scale + pan.x - offX / nextScale, y: offY / scale + pan.y - offY / nextScale },
        next,
      ),
    );
    setZoom(next);
  };

  const handleBackgroundDown = (e: React.MouseEvent) => {
    if (mode === 'calibrate' && e.shiftKey) return;
    dragRef.current = { x: e.clientX, y: e.clientY, pan };
    draggedRef.current = false;
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
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > DRAG_SLOP) draggedRef.current = true;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    // One uniform scale on both axes — the board tracks the cursor 1:1.
    const { scale } = viewportFit(rect, viewBox.w, viewBox.h);
    setPan(
      clampPan(
        {
          x: drag.pan.x - (e.clientX - drag.x) / scale,
          y: drag.pan.y - (e.clientY - drag.y) / scale,
        },
        zoom,
      ),
    );
  };

  const endDrag = () => {
    dragRef.current = null;
    calibDragRef.current = null;
    setPanning(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    const dragged = draggedRef.current;
    draggedRef.current = false;
    if (dragged) return; // the tail of a pan, not a placement
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
            const isActiveSlot = slot === activeSlot;
            const emphasize = isSelected && (mode !== 'anchors' || isActiveSlot);
            // In anchors mode the slot you're placing leads; the rest recede so they don't
            // compete with it. Elsewhere every slot keeps its old uniform weight.
            const weight = mode !== 'anchors' ? 1 : isActiveSlot ? 1.35 : 0.8;
            return (
              <g key={`${loc.name}:${slot}`}>
                <AnchorGlyph
                  slot={slot as AnchorSlot}
                  cx={p.x * width}
                  cy={p.y * height}
                  r={(emphasize || isFrom ? dot * 1.5 : dot) * weight}
                  fill={KINGDOM_COLOR[loc.kingdom] ?? '#94a3b8'}
                  stroke={isFrom ? '#38bdf8' : emphasize ? '#fff' : 'rgba(0,0,0,.55)'}
                  strokeWidth={dot / 2.5}
                  opacity={
                    mode === 'anchors' ? (isActiveSlot ? 1 : 0.35) : slot === 'hero' ? 1 : 0.75
                  }
                  // Anchors mode makes the map a pure placement surface: a glyph must not eat the
                  // click, or you could never place a second slot on top of an existing one.
                  // Selection there comes from the list, which the hint tells you.
                  style={{ cursor: 'pointer', pointerEvents: mode === 'anchors' ? 'none' : 'auto' }}
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
        {hintText({ board, mode, selectedLocation, activeSlot, adjacencyFrom })}
        {mode === 'adjacency' && adjacencyFrom && (
          <AdjacencyDistanceHint board={board} from={adjacencyFrom} />
        )}
      </div>
    </div>
  );
}

/**
 * The status line under the canvas — the only place that says what a click will do right now.
 * In `locations` mode it also calls out a selection that has no anchor: that location is data
 * only, invisible here, and the list's ◎ button is what puts it on the board.
 */
function hintText({
  board,
  mode,
  selectedLocation,
  activeSlot,
  adjacencyFrom,
}: Pick<
  BoardMapCanvasProps,
  'board' | 'mode' | 'selectedLocation' | 'activeSlot' | 'adjacencyFrom'
>): string {
  switch (mode) {
    case 'anchors':
      if (!selectedLocation) return 'Pick a location in the list to place its anchors';
      return board.anchors?.[selectedLocation]?.[activeSlot]
        ? `Click the board to move "${selectedLocation}" · ${activeSlot}`
        : `Click the board to place "${selectedLocation}" · ${activeSlot}`;
    case 'adjacency':
      return adjacencyFrom
        ? `Linking from "${adjacencyFrom}" — click another location (click it again to unlink)`
        : 'Click two locations to link/unlink them';
    case 'calibrate':
      return 'Drag the centre dot and the radius handle to fit the board circle';
    case 'locations':
      return selectedLocation && !locationPoint(board, selectedLocation)
        ? `"${selectedLocation}" is not on the board yet — click ◎ beside it to place it`
        : 'Wheel to zoom · drag to pan';
  }
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

/** Pointer travel (px) past which a press counts as a pan rather than a click. */
const DRAG_SLOP = 4;

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

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
