// Pop the render stage into a separate resizable window. The 2D map reparents as
// plain DOM, but the live WebGL 3D view is disposed and recreated in the new
// document (moving a GL context across documents is unreliable). Adapted from
// the sibling UltimateDarkTowerDisplay app.
import { TOWER_DISPLAY_CSS } from 'ultimatedarktowerdisplay';
import type { DomElements } from './dom';
import { setLayoutSuspended } from './layoutManager';

export interface PopOutHooks {
  /** Build the 3D view into the given container (re-seeded from current state). */
  create3D: (container: HTMLElement) => void;
  /** Tear down the current 3D view, leaving its container empty. */
  dispose3D: () => void;
}

const POP_OUT_LABEL = 'Pop Out ⤴';
const POP_IN_LABEL = 'Pop In';

export function initPopOutController(els: DomElements, hooks: PopOutHooks): void {
  let popup: Window | null = null;
  let placeholder: HTMLElement | null = null;
  let pollTimer: number | null = null;
  let beforeUnload: (() => void) | null = null;

  const showBanner = (message: string): void => {
    els.banner.hidden = false;
    els.banner.textContent = message;
  };

  const buildPopupDocument = (win: Window): HTMLElement => {
    const doc = win.document;
    doc.open();
    doc.write('<!doctype html><html><head></head><body></body></html>');
    doc.close();
    doc.title = 'UltimateDarkTowerBoard — Rendered Output';

    // Clone stylesheet + preconnect links (their .href resolves absolute, so the
    // popup's about:blank base URL doesn't break them).
    document
      .querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"], link[rel="preconnect"]')
      .forEach((link) => {
        const clone = doc.createElement('link');
        clone.rel = link.rel;
        if (link.href) clone.href = link.href;
        if (link.crossOrigin) clone.crossOrigin = link.crossOrigin;
        doc.head.appendChild(clone);
      });

    // The display library's chrome CSS is injected here for the popup document.
    const libStyle = doc.createElement('style');
    libStyle.textContent = TOWER_DISPLAY_CSS;
    doc.head.appendChild(libStyle);

    doc.documentElement.style.height = '100%';
    doc.body.style.height = '100%';
    doc.body.style.margin = '0';
    doc.body.style.overflow = 'hidden';

    const wrapper = doc.createElement('div');
    wrapper.className = 'popout-body';
    doc.body.appendChild(wrapper);
    return wrapper;
  };

  const open = (): void => {
    const win = window.open('', 'udtb-render', 'width=1000,height=1000,resizable=yes,scrollbars=yes');
    if (!win) {
      showBanner('Pop-out blocked — allow pop-ups for this site and try again.');
      return;
    }
    popup = win;
    const wrapper = buildPopupDocument(win);

    setLayoutSuspended(true);
    hooks.dispose3D();

    // Drop the layout manager's inline height; popup CSS sizes the panel instead.
    els.renderedPanel.style.height = '';
    placeholder = document.createElement('div');
    placeholder.className = 'popout-placeholder';
    placeholder.textContent = 'The board is in the pop-out window.';
    els.renderedPanel.parentNode?.insertBefore(placeholder, els.renderedPanel);
    wrapper.appendChild(els.renderedPanel);

    hooks.create3D(els.scene3d);
    win.addEventListener('resize', () => win.dispatchEvent(new Event('resize')), { once: true });

    els.btnPopOut.textContent = POP_IN_LABEL;
    pollTimer = window.setInterval(() => {
      if (popup && popup.closed) restore();
    }, 500);
    beforeUnload = () => {
      if (popup && !popup.closed) popup.close();
    };
    window.addEventListener('beforeunload', beforeUnload);
  };

  const restore = (): void => {
    if (pollTimer !== null) {
      window.clearInterval(pollTimer);
      pollTimer = null;
    }
    if (beforeUnload) {
      window.removeEventListener('beforeunload', beforeUnload);
      beforeUnload = null;
    }

    hooks.dispose3D();
    if (placeholder?.parentNode) {
      placeholder.parentNode.replaceChild(els.renderedPanel, placeholder);
    }
    placeholder = null;
    hooks.create3D(els.scene3d);

    setLayoutSuspended(false);
    window.dispatchEvent(new Event('resize'));
    els.btnPopOut.textContent = POP_OUT_LABEL;
    popup = null;
  };

  els.btnPopOut.addEventListener('click', () => {
    if (popup && !popup.closed) {
      popup.close(); // the poll calls restore()
    } else {
      open();
    }
  });
}
