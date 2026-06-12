// Pop the render panel into a separate resizable window. The 2D map reparents as
// plain DOM; the live WebGL 3D view (if any) is disposed and recreated in the new
// document (a GL context can't move across documents). The stage's toolbar stays in
// the main window so the Pop-Out button becomes a Pop-In button. Ported from the
// example's popOutController, but injects the stage's OWN CSS (+ Display's when the
// tower is active) into the popup rather than assuming the host stylesheet defines it.

export interface PopOutHooks {
  /** The render panel (`.bsv-panel`) moved into the popup; the toolbar stays behind. */
  panel: HTMLElement;
  /** The inner 3D tower host (handed to `create3D` when rebuilding in the popup). */
  towerHost: HTMLElement;
  /** The Pop-Out / Pop-In button (its label toggles). */
  toggleButton: HTMLButtonElement;
  /** Rebuild the 3D view into `container` (no-op when the tower is off). */
  create3D(container: HTMLElement): void;
  /** Tear down the current 3D view (no-op when the tower is off). */
  dispose3D(): void;
  /** Suspend/resume any host-side layout that measures the panel's rect. */
  setLayoutSuspended(value: boolean): void;
  /** The stage's own CSS — always injected into the popup. */
  stageCss: string;
  /** Display's chrome CSS, or null when the tower is off (no 3D in the popup). */
  towerCss(): string | null;
  /** Surface a user-facing error (e.g. popup blocked). */
  onError?(message: string): void;
}

const POP_OUT_LABEL = 'Pop Out ⤴';
const POP_IN_LABEL = 'Pop In';

export interface PopOutController {
  toggle(): void;
  isOpen(): boolean;
  /** Force the panel back into the main window (used on dispose). */
  popIn(): void;
  dispose(): void;
}

export function createPopOut(hooks: PopOutHooks): PopOutController {
  let popup: Window | null = null;
  let placeholder: HTMLElement | null = null;
  let pollTimer: number | null = null;
  let beforeUnload: (() => void) | null = null;
  let popupHide: (() => void) | null = null;

  const buildPopupDocument = (win: Window): HTMLElement => {
    const doc = win.document;
    doc.open();
    doc.write('<!doctype html><html><head></head><body></body></html>');
    doc.close();
    doc.title = 'Board — Rendered Output';

    // Clone the host's stylesheet + preconnect links so theme variables / fonts resolve
    // (their .href is absolute, so the popup's about:blank base doesn't break them).
    document
      .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"], link[rel="preconnect"]')
      .forEach((link) => {
        const clone = doc.createElement('link');
        clone.rel = link.rel;
        if (link.href) clone.href = link.href;
        if (link.crossOrigin) clone.crossOrigin = link.crossOrigin;
        doc.head.appendChild(clone);
      });

    // The stage's own CSS (always) + Display's chrome CSS (only when the tower is active).
    const addStyle = (css: string): void => {
      const style = doc.createElement('style');
      style.textContent = css;
      doc.head.appendChild(style);
    };
    addStyle(hooks.stageCss);
    const towerCss = hooks.towerCss();
    if (towerCss) addStyle(towerCss);

    doc.documentElement.style.height = '100%';
    doc.body.style.height = '100%';
    doc.body.style.margin = '0';
    doc.body.style.overflow = 'hidden';

    const wrapper = doc.createElement('div');
    wrapper.className = 'bsv-popout-body';
    doc.body.appendChild(wrapper);
    return wrapper;
  };

  const open = (): void => {
    const win = window.open('', 'bsv-render', 'width=1000,height=1000,resizable=yes,scrollbars=yes');
    if (!win) {
      hooks.onError?.('Pop-out blocked — allow pop-ups for this site and try again.');
      return;
    }
    popup = win;
    const wrapper = buildPopupDocument(win);

    hooks.setLayoutSuspended(true);
    hooks.dispose3D();

    placeholder = document.createElement('div');
    placeholder.className = 'bsv-popout-placeholder';
    placeholder.textContent = 'The board is in the pop-out window.';
    hooks.panel.parentNode?.insertBefore(placeholder, hooks.panel);
    wrapper.appendChild(hooks.panel);

    hooks.create3D(hooks.towerHost);
    win.dispatchEvent(new Event('resize'));

    hooks.toggleButton.textContent = POP_IN_LABEL;

    // Restore as the popup unloads — WHILE its document is still alive — so the panel's
    // 2D map + controls + editing UI keep their event listeners on the way back. (A node
    // moved out only AFTER the window is destroyed loses every listener registered on it,
    // which is why the 2D side went dead after a close.) The 500ms poll stays as a
    // fallback in case `pagehide` doesn't fire; `restore()` is idempotent.
    popupHide = () => restore();
    win.addEventListener('pagehide', popupHide);
    win.addEventListener('beforeunload', popupHide);

    pollTimer = window.setInterval(() => {
      if (popup && popup.closed) restore();
    }, 500);
    beforeUnload = () => {
      if (popup && !popup.closed) popup.close();
    };
    window.addEventListener('beforeunload', beforeUnload);
  };

  const restore = (): void => {
    const win = popup;
    if (!win) return; // already restored (pagehide + poll can both fire — claim it once)
    popup = null;

    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (beforeUnload) {
      window.removeEventListener('beforeunload', beforeUnload);
      beforeUnload = null;
    }
    if (popupHide) {
      try {
        win.removeEventListener('pagehide', popupHide);
        win.removeEventListener('beforeunload', popupHide);
      } catch {
        // the popup window may already be torn down — ignore
      }
      popupHide = null;
    }

    hooks.dispose3D();
    if (placeholder?.parentNode) {
      placeholder.parentNode.replaceChild(hooks.panel, placeholder);
    }
    placeholder = null;
    hooks.create3D(hooks.towerHost);

    hooks.setLayoutSuspended(false);
    window.dispatchEvent(new Event('resize'));
    hooks.toggleButton.textContent = POP_OUT_LABEL;
  };

  hooks.toggleButton.addEventListener('click', () => {
    if (popup && !popup.closed) popup.close(); // the poll calls restore()
    else open();
  });

  return {
    toggle: () => {
      if (popup && !popup.closed) popup.close();
      else open();
    },
    isOpen: () => Boolean(popup && !popup.closed),
    popIn: () => {
      if (popup && !popup.closed) popup.close();
    },
    dispose: () => {
      if (popup && !popup.closed) popup.close();
      if (pollTimer !== null) window.clearInterval(pollTimer);
      if (beforeUnload) window.removeEventListener('beforeunload', beforeUnload);
    },
  };
}
