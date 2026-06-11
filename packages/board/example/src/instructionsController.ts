// Collapse / reveal the help strip to give the view more vertical space. State
// persisted; mirrored by the "Show help text" checkbox in Settings.
import type { DomElements } from './dom';
import { readLocal, writeLocal } from './utils';

const STORAGE_KEY = 'udtb.instructions.collapsed';

export function initInstructionsController(els: DomElements): void {
  let collapsed = readLocal(STORAGE_KEY) === 'true';

  const apply = (): void => {
    els.instructions.classList.toggle('is-collapsed', collapsed);
    els.btnInstructionsToggle.textContent = collapsed ? 'Show Help' : 'Hide Help';
    els.btnInstructionsToggle.setAttribute('aria-expanded', String(!collapsed));
  };

  const set = (next: boolean): void => {
    collapsed = next;
    writeLocal(STORAGE_KEY, String(next));
    apply();
    // The panel's top shifts when the strip collapses — re-clamp the stage.
    window.dispatchEvent(new Event('resize'));
  };

  els.btnInstructionsToggle.addEventListener('click', () => set(!collapsed));

  apply();
}
