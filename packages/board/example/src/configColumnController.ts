// Slide the whole right config column (Board Status + JSON) out of view to the
// right, independent of the per-panel collapse in panelCollapseController.ts.
// State persisted across reloads. The toggle button is created here and docked
// into the stage's own toolbar (.bsv-toolbar-right, next to Pop Out) so it costs
// no dedicated page chrome and inherits that toolbar's styling for free.
import type { DomElements } from './dom';
import { readLocal, writeLocal } from './utils';

const STORAGE_KEY = 'udtb.configColumn.hidden';

export function initConfigColumnController(els: DomElements): void {
  const toolbarRight = els.boardStage.querySelector<HTMLElement>('.bsv-toolbar-right');
  if (!toolbarRight) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bsv-action';
  toolbarRight.appendChild(btn);

  let hidden = readLocal(STORAGE_KEY) === 'true';

  const apply = (): void => {
    els.grid.classList.toggle('config-hidden', hidden);
    btn.textContent = hidden ? 'Show JSON' : 'Hide Status';
    btn.title = hidden ? 'Show the status & JSON panel' : 'Hide the status & JSON panel';
  };

  const set = (next: boolean): void => {
    hidden = next;
    writeLocal(STORAGE_KEY, String(next));
    apply();
    // The hero column widens/narrows when the config column slides — re-clamp the stage.
    window.dispatchEvent(new Event('resize'));
  };

  btn.addEventListener('click', () => set(!hidden));

  apply();
}
