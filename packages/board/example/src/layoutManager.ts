// Pins the render stage to the available viewport height so the 2D/3D views
// scale DOWN with the window instead of growing. An explicit pixel height gives
// the 3D canvas a definite box to size against (percentage heights collapse).
import type { DomElements } from './dom';

let suspended = false;

function constrain(els: DomElements): void {
  if (suspended) return;
  const rect = els.renderedPanel.getBoundingClientRect();
  const top = rect.top + window.scrollY;
  const gridPadBottom = parseFloat(getComputedStyle(els.grid).paddingBottom) || 0;
  const available = window.innerHeight - top - gridPadBottom;
  els.renderedPanel.style.height = `${Math.max(240, available)}px`;
}

export function initLayoutManager(els: DomElements): void {
  const run = (): void => constrain(els);
  window.addEventListener('resize', run);

  // The panel's top moves when the header / instructions / sidebar reflow.
  const observer = new ResizeObserver(run);
  observer.observe(els.sidebar);
  observer.observe(els.instructions);

  constrain(els);
}

/**
 * Suspend the height clamp while #rendered-panel lives in a pop-out window — its
 * bounding rect would be popup-relative and corrupt the main page's math.
 */
export function setLayoutSuspended(value: boolean): void {
  suspended = value;
}
