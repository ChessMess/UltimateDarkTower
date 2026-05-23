import { TOWER_DISPLAY_CSS } from '../src/index';
import type { DomElements } from './dom';
import { setLayoutSuspended } from './layoutManager';
import { recreateCurrentDisplay } from './rendererController';

interface OriginalSlot {
  el: HTMLElement;
  parent: Node;
  nextSibling: Node | null;
  placeholder: HTMLElement;
}

let popup: Window | null = null;
let slots: OriginalSlot[] = [];
let pollTimer: number | null = null;
let beforeUnloadHandler: (() => void) | null = null;

function showBanner(els: DomElements, message: string): void {
  if (!els.banner) return;
  els.banner.hidden = false;
  els.banner.textContent = message;
}

function makePlaceholder(label: string): HTMLElement {
  const ph = document.createElement('div');
  ph.className = 'popout-placeholder';
  ph.textContent = label;
  return ph;
}

function buildPopupDocument(win: Window): HTMLElement {
  const doc = win.document;
  doc.open();
  doc.write('<!doctype html><html><head></head><body></body></html>');
  doc.close();

  doc.title = 'UltimateDarkTowerDisplay — Rendered Output';

  const head = doc.head;
  // Clone stylesheet + preconnect links, resolving relative hrefs to absolute
  // so the popup's about:blank base URL doesn't break them.
  const sourceLinks = document.querySelectorAll<HTMLLinkElement>(
    'link[rel="stylesheet"], link[rel="preconnect"]',
  );
  sourceLinks.forEach((link) => {
    const clone = doc.createElement('link');
    clone.rel = link.rel;
    if (link.href) clone.href = link.href;
    if (link.crossOrigin) clone.crossOrigin = link.crossOrigin;
    head.appendChild(clone);
  });

  // Inject the tower-display library CSS directly — its injectStyles() is
  // guarded by a module-level flag and has already injected into the main
  // document, so it will no-op on the recreate.
  const libStyle = doc.createElement('style');
  libStyle.textContent = TOWER_DISPLAY_CSS;
  head.appendChild(libStyle);

  doc.documentElement.style.height = '100%';
  doc.body.style.height = '100%';
  doc.body.style.width = '100%';
  doc.body.style.maxWidth = 'none';
  doc.body.style.margin = '0';
  doc.body.style.padding = '0';
  doc.body.style.overflow = 'hidden';
  const wrapper = doc.createElement('div');
  wrapper.className = 'popout-body';
  doc.body.appendChild(wrapper);
  return wrapper;
}

function transplant(el: HTMLElement, placeholderLabel: string, target: HTMLElement): void {
  const placeholder = makePlaceholder(placeholderLabel);
  const parent = el.parentNode;
  if (!parent) return;
  const nextSibling = el.nextSibling;
  parent.insertBefore(placeholder, el);
  target.appendChild(el);
  slots.push({ el, parent, nextSibling, placeholder });
}

function restore(els: DomElements): void {
  if (pollTimer !== null) {
    window.clearInterval(pollTimer);
    pollTimer = null;
  }
  if (beforeUnloadHandler) {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    beforeUnloadHandler = null;
  }

  for (const slot of slots) {
    if (slot.placeholder.parentNode) {
      slot.placeholder.parentNode.replaceChild(slot.el, slot.placeholder);
    } else {
      slot.parent.insertBefore(slot.el, slot.nextSibling);
    }
  }
  slots = [];

  setLayoutSuspended(false);
  recreateCurrentDisplay(els);
  window.dispatchEvent(new Event('resize'));

  if (els.btnPopOut) els.btnPopOut.textContent = 'Pop Out';
  popup = null;
}

function openPopOut(els: DomElements): void {
  if (popup && !popup.closed) {
    popup.focus();
    return;
  }

  // Recover from a closed-but-not-yet-restored state (user clicked Pop Out
  // again before the 500 ms poll caught the close).
  if (slots.length > 0) restore(els);

  const win = window.open(
    '',
    'udtd-render',
    'width=960,height=960,resizable=yes,scrollbars=yes',
  );
  if (!win) {
    showBanner(els, 'Pop-out blocked — allow pop-ups for this site and try again.');
    return;
  }
  popup = win;

  const wrapper = buildPopupDocument(win);

  if (els.renderedPanel) {
    // Clear the inline height the layout manager set against the main page;
    // popup CSS sizes the panel against the popup viewport instead.
    els.renderedPanel.style.height = '';
    transplant(els.renderedPanel, 'Rendered Output is in the pop-out window.', wrapper);
  }

  setLayoutSuspended(true);
  recreateCurrentDisplay(els);

  pollTimer = window.setInterval(() => {
    if (popup && popup.closed) restore(els);
  }, 500);

  beforeUnloadHandler = () => {
    if (popup && !popup.closed) popup.close();
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  if (els.btnPopOut) els.btnPopOut.textContent = 'Pop In';
}

export function initPopOutController(els: DomElements): void {
  if (!els.btnPopOut) return;
  els.btnPopOut.addEventListener('click', () => {
    if (popup && !popup.closed) {
      // Closing the popup triggers restore() via the poll.
      popup.close();
    } else {
      openPopOut(els);
    }
  });
}
