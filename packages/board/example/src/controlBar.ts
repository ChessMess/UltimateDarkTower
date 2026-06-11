// A reusable horizontal control bar that matches the 3D view's built-in N/E/S/W
// bar. It reuses the display library's `t3v-controls` / `tower-side-btn` classes
// (injected by TowerRenderView) so it is visually identical and tracks the
// active button the same way the 3D side buttons do (the `data-active` attribute).

export interface ControlBarButton {
  /** Stable key used for active-state tracking. */
  key: string;
  label: string;
  onClick: () => void;
}

export interface ControlBar {
  /** The bar element (the host, now classed as a control bar). */
  readonly el: HTMLElement;
  /** Mark one button active (or none) — mirrors the 3D side buttons. */
  setActive(key: string | null): void;
}

/** Build a 3D-style control bar into `host`, returning a handle to it. */
export function createControlBar(host: HTMLElement, buttons: ControlBarButton[]): ControlBar {
  host.classList.add('t3v-controls');
  const byKey = new Map<string, HTMLButtonElement>();

  for (const { key, label, onClick } of buttons) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tower-side-btn';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    host.appendChild(btn);
    byKey.set(key, btn);
  }

  return {
    el: host,
    setActive(key) {
      for (const [k, btn] of byKey) {
        if (k === key) btn.setAttribute('data-active', 'true');
        else btn.removeAttribute('data-active');
      }
    },
  };
}
