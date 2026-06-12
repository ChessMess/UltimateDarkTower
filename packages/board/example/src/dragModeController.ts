// Spin / Pan toggle for the 2D map's mouse drag, stacked under the N/E/S/W bar and
// matching its look (createControlBar). 'rotate' (Spin) is the default; the choice
// is persisted under the shared `udtb.` prefix so Reset Board clears it too.
import type { BoardRenderView, DragMode } from '../../src/index';
import { createControlBar } from './controlBar';
import type { DomElements } from './dom';
import { readLocal, writeLocal } from './utils';

const STORAGE_KEY = 'udtb.dragMode';
const VALID: ReadonlySet<string> = new Set<DragMode>(['rotate', 'pan']);

export function initDragModeController(els: DomElements, view: BoardRenderView): void {
  let current: DragMode = 'rotate';
  const stored = readLocal(STORAGE_KEY);
  if (stored && VALID.has(stored)) current = stored as DragMode;

  const apply = (mode: DragMode): void => {
    current = mode;
    view.setDragMode(mode);
    bar.setActive(mode);
    writeLocal(STORAGE_KEY, mode);
  };

  const bar = createControlBar(els.mapDragMode, [
    { key: 'rotate', label: 'Spin', onClick: () => apply('rotate') },
    { key: 'pan', label: 'Pan', onClick: () => apply('pan') },
  ]);

  apply(current);
}
