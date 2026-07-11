// The JSON panel: copy the current board state out, or paste one in and Apply.
// Uses the library's saveState/loadState round-trip against the shared controller.
import { loadState, saveState } from '../../src/index';
import type { BoardRenderView } from '../../src/index';
import type { DomElements } from './dom';
import { bindCopyButton, showBannerError } from './utils';

export interface JsonController {
  /** Re-sync the textarea to the current state (no-op while the user is mid-edit). */
  refreshPreview(): void;
  /** Force the textarea back to the current state, discarding edits + any error. */
  forceRefresh(): void;
}

export function initJsonController(els: DomElements, view: BoardRenderView): JsonController {
  const pretty = (): string =>
    JSON.stringify(JSON.parse(saveState(view.controller.getState())), null, 2);

  let clean = pretty();
  els.configPreview.value = clean;

  const setClean = (): void => {
    clean = pretty();
    els.configPreview.value = clean;
    els.btnApplyConfig.disabled = true;
  };

  els.configPreview.addEventListener('input', () => {
    els.btnApplyConfig.disabled = els.configPreview.value === clean;
  });

  bindCopyButton(els.btnCopyConfig, () => els.configPreview.value, els.banner);

  els.btnApplyConfig.addEventListener('click', () => {
    try {
      els.banner.hidden = true;
      view.controller.applyState(loadState(els.configPreview.value));
      setClean(); // adopt the applied state as the new clean baseline
    } catch (err) {
      showBannerError(els.banner, 'Invalid board state', err);
    }
  });

  return {
    refreshPreview(): void {
      // Don't clobber unsaved edits — only re-sync when the textarea is clean.
      if (els.configPreview.value !== clean) return;
      setClean();
    },
    forceRefresh(): void {
      els.banner.hidden = true;
      setClean();
    },
  };
}
