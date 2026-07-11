// detectRooms — "Detect rooms from image" heuristic. Draws the map to a canvas, treats the corner
// color as background (the official maps_*.png are black), and calls a grid cell a room when its
// center region is mostly non-background. A door is inferred where the shared edge between two
// adjacent rooms is crossed by non-background pixels (the corridor art).
//
// This is a DRAFT, not a solver (plan finding #6): the official maps are irregular (variable room
// sizes, winding corridors) and won't always map cleanly onto a rectangular grid. The author refines
// the result in the map editor. Browser-only (canvas); the Creator runs in a browser.

import { DIRS, DELTA, OPPOSITE, type Dir, type DungeonRoom, type RoomExits } from './shared';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('failed to load image'));
    img.src = src;
  });
}

/** sum of per-channel abs difference from the background color (0..765) */
function bgDistance(data: Uint8ClampedArray, i: number, bg: [number, number, number]): number {
  return Math.abs(data[i] - bg[0]) + Math.abs(data[i + 1] - bg[1]) + Math.abs(data[i + 2] - bg[2]);
}

const BG_THRESHOLD = 60; // per-pixel channel-sum distance beyond which a pixel is "content"

export async function detectRooms(
  dataUrl: string,
  cols: number,
  rows: number,
): Promise<DungeonRoom[]> {
  const img = await loadImage(dataUrl);
  const W = img.naturalWidth || img.width;
  const H = img.naturalHeight || img.height;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, W, H);

  const at = (x: number, y: number) => (Math.floor(y) * W + Math.floor(x)) * 4;
  // background = average of the four corners
  const corners = [at(1, 1), at(W - 2, 1), at(1, H - 2), at(W - 2, H - 2)];
  const bg: [number, number, number] = [
    Math.round(corners.reduce((a, i) => a + data[i], 0) / 4),
    Math.round(corners.reduce((a, i) => a + data[i + 1], 0) / 4),
    Math.round(corners.reduce((a, i) => a + data[i + 2], 0) / 4),
  ];

  const cw = W / cols;
  const ch = H / rows;

  // fraction of content pixels sampled on a coarse grid within [x0,x1]×[y0,y1]
  const contentFraction = (x0: number, y0: number, x1: number, y1: number): number => {
    let total = 0;
    let content = 0;
    const stepX = Math.max(1, (x1 - x0) / 12);
    const stepY = Math.max(1, (y1 - y0) / 12);
    for (let y = y0; y < y1; y += stepY) {
      for (let x = x0; x < x1; x += stepX) {
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        total += 1;
        if (bgDistance(data, at(x, y), bg) > BG_THRESHOLD) content += 1;
      }
    }
    return total === 0 ? 0 : content / total;
  };

  // Pass 1: which cells are rooms (center 50% box mostly content)
  const isRoom: boolean[][] = [];
  for (let r = 0; r < rows; r++) {
    isRoom[r] = [];
    for (let c = 0; c < cols; c++) {
      const x0 = (c + 0.25) * cw;
      const x1 = (c + 0.75) * cw;
      const y0 = (r + 0.25) * ch;
      const y1 = (r + 0.75) * ch;
      isRoom[r][c] = contentFraction(x0, y0, x1, y1) > 0.25;
    }
  }

  // Pass 2: doors between adjacent rooms where the shared edge band is crossed by content.
  const doorBetween = (c: number, r: number, dir: Dir): boolean => {
    const nc = c + DELTA[dir].dc;
    const nr = r + DELTA[dir].dr;
    if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) return false;
    if (!isRoom[nr][nc]) return false;
    if (dir === 'E' || dir === 'W') {
      const edgeX = (dir === 'E' ? c + 1 : c) * cw;
      return contentFraction(edgeX - cw * 0.06, (r + 0.35) * ch, edgeX + cw * 0.06, (r + 0.65) * ch) > 0.3;
    }
    const edgeY = (dir === 'S' ? r + 1 : r) * ch;
    return contentFraction((c + 0.35) * cw, edgeY - ch * 0.06, (c + 0.65) * cw, edgeY + ch * 0.06) > 0.3;
  };

  const rooms: DungeonRoom[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (!isRoom[r][c]) continue;
      const exits: RoomExits = {};
      for (const dir of DIRS) {
        exits[dir] = doorBetween(c, r, dir) ? 'door' : 'wall';
      }
      rooms.push({ id: `room-${c}-${r}`, cell: { col: c, row: r }, exits });
    }
  }

  // Reconcile reciprocity: a door is only real if the neighbor agrees (both bands crossed).
  for (const room of rooms) {
    for (const dir of DIRS) {
      if (room.exits[dir] !== 'door') continue;
      const nc = room.cell.col + DELTA[dir].dc;
      const nr = room.cell.row + DELTA[dir].dr;
      const neighbor = rooms.find((x) => x.cell.col === nc && x.cell.row === nr);
      if (!neighbor || neighbor.exits[OPPOSITE[dir]] !== 'door') room.exits[dir] = 'wall';
    }
  }

  // Seed entrance/target so the result is L3-shaped; the author reassigns.
  if (rooms.length > 0) {
    rooms[0].isEntrance = true;
    rooms[rooms.length - 1].isTarget = true;
  }
  return rooms;
}
