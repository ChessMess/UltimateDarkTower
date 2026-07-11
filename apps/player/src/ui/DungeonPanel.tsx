// DungeonPanel — masked-map dungeon play (schema 0.4.4). Rendered whenever the engine is inside a
// dungeon (engineState.clock.dungeon). Shows the masterBitmap under a cols×rows grid with every
// unrevealed cell fogged (the official-app feel — only visited rooms unmask), a room card for the
// current room (name / display text / art), and the move + improve prompts. The reveal set lives in
// the player store (revealedRooms), appended from board.mutate revealRoom directives and persisted,
// so leaving and resuming restores the fog.

import type { CSSProperties } from 'react';
import { handleInput } from '../game';
import { usePlayerStore } from '../store';

type PRoom = {
  id: string;
  name?: string;
  cell?: { col: number; row: number };
  exits?: Record<string, string>;
  displayText?: string;
  artRef?: string;
  isEntrance?: boolean;
  isTarget?: boolean;
  improveOnce?: { effects?: unknown[] };
};
type PDungeon = {
  id: string;
  name?: string;
  grid?: { cols: number; rows: number };
  masterBitmap?: string;
  // schema 0.4.5 — map placement rect in grid-cell units (absent = fills the grid)
  bitmapRect?: { x: number; y: number; w: number; h: number };
  rooms?: PRoom[];
};
type PScenario = {
  library?: {
    dungeons?: Record<string, PDungeon>;
    resources?: { images?: Record<string, string> };
  };
};
type EngineShape = {
  clock?: { dungeon?: { dungeonId: string; currentRoom: string | null } | null; activeHero?: string };
  heroes?: Record<string, { advantages?: number }>;
};

const DIRS = ['N', 'E', 'S', 'W'] as const;
const DIR_LABEL: Record<string, string> = { N: '↑ North', E: '→ East', S: '↓ South', W: '← West' };
const CELL = 66;

export function DungeonPanel() {
  const engineState = usePlayerStore((s) => s.engineState) as EngineShape | null;
  const scenario = usePlayerStore((s) => s.scenario) as PScenario | null;
  const revealedRooms = usePlayerStore((s) => s.revealedRooms);
  const awaiting = usePlayerStore((s) => s.awaiting);

  const dc = engineState?.clock?.dungeon;
  if (!dc) return null;

  const dungeon = scenario?.library?.dungeons?.[dc.dungeonId];
  const rooms = dungeon?.rooms ?? [];
  const cols = dungeon?.grid?.cols ?? 1;
  const rows = dungeon?.grid?.rows ?? 1;
  const imageUrl = dungeon?.masterBitmap
    ? scenario?.library?.resources?.images?.[dungeon.masterBitmap]
    : undefined;
  // Map placement rect (schema 0.4.5); absent = fills the grid. Same math as the Creator canvas so
  // the author's alignment carries through to play-time fog.
  const rect = dungeon?.bitmapRect ?? { x: 0, y: 0, w: cols, h: rows };

  const revealed = new Set(revealedRooms[dc.dungeonId] ?? []);
  if (dc.currentRoom) revealed.add(dc.currentRoom); // the current room is always visible
  const currentRoom = rooms.find((r) => r.id === dc.currentRoom);
  const roomAt = (c: number, r: number) => rooms.find((rm) => rm.cell?.col === c && rm.cell?.row === r);

  const advantages = engineState?.heroes?.[engineState.clock?.activeHero ?? '']?.advantages ?? 0;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 8 }}>
        🗺️ {dungeon?.name || dc.dungeonId}
      </div>

      {/* masked map */}
      <div style={{ overflow: 'auto', marginBottom: 12 }}>
        <div
          style={{
            position: 'relative',
            width: cols * CELL,
            height: rows * CELL,
            background: '#0b0b10',
            borderRadius: 8,
            overflow: 'hidden',
            flex: '0 0 auto',
          }}
        >
          {imageUrl && (
            <img
              src={imageUrl}
              alt="dungeon map"
              style={{
                position: 'absolute',
                left: rect.x * CELL,
                top: rect.y * CELL,
                width: rect.w * CELL,
                height: rect.h * CELL,
                objectFit: 'fill',
                borderRadius: 8,
                pointerEvents: 'none',
              }}
            />
          )}
          {Array.from({ length: rows }).map((_, r) =>
            Array.from({ length: cols }).map((__, c) => {
              const room = roomAt(c, r);
              const isRevealed = !!room && revealed.has(room.id);
              const isCurrent = !!room && room.id === dc.currentRoom;
              return (
                <div
                  key={`${c}-${r}`}
                  style={{
                    position: 'absolute',
                    left: c * CELL,
                    top: r * CELL,
                    width: CELL,
                    height: CELL,
                    boxSizing: 'border-box',
                    // fog everything that isn't a revealed room
                    background: isRevealed ? 'transparent' : 'rgba(6,6,12,0.96)',
                    border: isCurrent
                      ? '2px solid #fbbf24'
                      : isRevealed
                        ? '1px solid rgba(196,181,253,0.6)'
                        : 'none',
                    borderRadius: 4,
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                  }}
                >
                  {isRevealed && (
                    <span style={cellLabel}>
                      {room.isTarget ? '🎯 ' : ''}
                      {room.name || room.id}
                    </span>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* current room card */}
      {currentRoom && (
        <div style={roomCard}>
          {currentRoom.artRef && scenario?.library?.resources?.images?.[currentRoom.artRef] && (
            <img
              src={scenario.library.resources.images[currentRoom.artRef]}
              alt=""
              style={{ width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 6, marginBottom: 8 }}
            />
          )}
          <div style={{ fontWeight: 700, fontSize: 13 }}>
            {currentRoom.isEntrance ? '⭐ ' : ''}
            {currentRoom.isTarget ? '🎯 ' : ''}
            {currentRoom.name || currentRoom.id}
          </div>
          {currentRoom.displayText && (
            <div style={{ fontSize: 12, color: 'var(--c-text-2)', marginTop: 4 }}>
              {currentRoom.displayText}
            </div>
          )}
        </div>
      )}

      {/* prompts */}
      {awaiting?.id === 'dungeonRoomAdvantage' && (
        <ImprovePrompt advantages={advantages} improveCount={currentRoom?.improveOnce?.effects?.length ?? 0} />
      )}
      {awaiting?.id === 'dungeonMove' && <MovePrompt room={currentRoom} />}
    </div>
  );
}

function ImprovePrompt({ advantages, improveCount }: { advantages: number; improveCount: number }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={label}>
        Spend 1 Advantage to improve this room? (once per room) — you have {advantages}
        {improveCount > 0 ? ` · improves ${improveCount} effect${improveCount === 1 ? '' : 's'}` : ''}
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button
          style={{ ...btn, background: 'var(--c-success)', color: '#fff', borderColor: 'var(--c-success)' }}
          disabled={advantages < 1}
          onClick={() => handleInput({ requestId: 'dungeonRoomAdvantage', value: { improve: true }, kind: 'decision' })}
        >
          Improve
        </button>
        <button
          style={btn}
          onClick={() => handleInput({ requestId: 'dungeonRoomAdvantage', value: { improve: false }, kind: 'decision' })}
        >
          Skip
        </button>
      </div>
    </div>
  );
}

function MovePrompt({ room }: { room?: PRoom }) {
  const doors = DIRS.filter((d) => room?.exits?.[d] === 'door');
  return (
    <div>
      <div style={label}>Move through a door or leave:</div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {doors.map((d) => (
          <button
            key={d}
            style={btn}
            onClick={() => handleInput({ requestId: 'dungeonMove', value: { direction: d }, kind: 'decision' })}
          >
            {DIR_LABEL[d]}
          </button>
        ))}
        <button
          style={{ ...btn, color: 'var(--c-danger)' }}
          onClick={() => handleInput({ requestId: 'dungeonMove', value: { leave: true }, kind: 'decision' })}
        >
          Leave dungeon
        </button>
      </div>
    </div>
  );
}

const cellLabel: CSSProperties = {
  fontSize: 8,
  color: '#f3f0ff',
  textAlign: 'center',
  padding: '1px 2px',
  maxWidth: CELL - 4,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  textShadow: '0 1px 2px rgba(0,0,0,0.9)',
};
const roomCard: CSSProperties = {
  background: 'var(--c-surface)',
  border: '1px solid var(--c-border)',
  borderRadius: 8,
  padding: 12,
  marginBottom: 12,
};
const label: CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: 'var(--c-text-muted)',
  marginBottom: 6,
};
const btn: CSSProperties = {
  padding: '6px 12px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 6,
  background: 'var(--c-surface)',
  color: 'var(--c-text)',
  fontSize: 13,
  cursor: 'pointer',
};
