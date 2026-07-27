// Slide the whole right config column (Board Status + JSON) out of view to the
// right, independent of the per-panel collapse in panelCollapseController.ts.
// State persisted across reloads, toggled by the fixed edge tab.
import type { DomElements } from './dom';
import { readLocal, writeLocal } from './utils';

const STORAGE_KEY = 'udtb.configColumn.hidden';

export function initConfigColumnController(els: DomElements): void {
  const btn = document.getElementById('btn-toggle-config');
  if (!btn) return;

  let hidden = readLocal(STORAGE_KEY) === 'true';

  const apply = (): void => {
    els.grid.classList.toggle('config-hidden', hidden);
    btn.textContent = hidden ? '◂' : '▸';
    btn.setAttribute('aria-expanded', String(!hidden));
    btn.title = hidden ? 'Show status & JSON panel' : 'Hide status & JSON panel';
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
