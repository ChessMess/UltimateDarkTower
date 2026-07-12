import { TowerRenderView, TowerStateReadout } from '../src/index';
import type { TowerDisplay, TowerRenderViewOptions, RendererType } from '../src/index';
import type { TowerState, TowerSide } from 'ultimatedarktower';
import type { DomElements } from './dom';
import { toggleSeal, refreshSeals } from './sealController';
import { setLedOverride as recordLedOverride, replayLedOverrides } from './ledOverrideController';
import towerModelUrl from '../src/3d/assets/tower.glb?url';
// The bundled default pack works out of the box — no consumer-side URL map
// needed. `applyAudioConfig({ enabled })` is the one-line toggle.

export type ViewButtonId = 'btn-view-2d' | 'btn-view-3d' | 'btn-view-2d3d';

const viewButtons: Record<ViewButtonId, RendererType | RendererType[]> = {
  'btn-view-2d': 'side-view',
  'btn-view-3d': '3d-view',
  'btn-view-2d3d': ['side-view', '3d-view'],
};

const sceneLights = { hemiIntensity: 0.15, keyIntensity: 0.9, fillIntensity: 0.12 };

declare global {
  interface Window {
    display?: TowerDisplay;
  }
}

let view: TowerRenderView;
let readout: TowerStateReadout;
let lastState: TowerState | null = null;
let lastSide: TowerSide | null = null;
let currentRenderers: RendererType | RendererType[] = '3d-view';
let currentActiveId: ViewButtonId = 'btn-view-3d';
const viewChangeListeners = new Set<() => void>();

function publishDisplay(): void {
  window.display = view.display;
}

export function getDisplay(): TowerDisplay {
  return view.display;
}

export function getReadout(): TowerStateReadout {
  return readout;
}

export function getLastState(): TowerState | null {
  return lastState;
}

export function setLastState(state: TowerState | null): void {
  lastState = state;
}

export function getSceneLights() {
  return sceneLights;
}

export function is3DViewVisible(): boolean {
  if (Array.isArray(currentRenderers)) return currentRenderers.includes('3d-view');
  return currentRenderers === '3d-view';
}

export function onViewChange(cb: () => void): () => void {
  viewChangeListeners.add(cb);
  return () => {
    viewChangeListeners.delete(cb);
  };
}

function fireViewChange(): void {
  for (const cb of viewChangeListeners) {
    try {
      cb();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[rendererController] onViewChange listener threw', err);
    }
  }
}

function buildViewOptions(
  renderers: RendererType | RendererType[],
  els: DomElements,
): TowerRenderViewOptions {
  return {
    container: els.towerContainer,
    renderers,
    modelUrl: towerModelUrl,
    clickToToggleSeals: false, // external source of truth lives in sealController.
    onSealClick: (seal) => toggleSeal(seal, view.display, readout),
    onSideChange: (side) => {
      lastSide = side;
    },
    onCalibrationComplete: (finalState) => {
      // The 3D view already settled on the calibrated state internally; mirror
      // the result to the standalone readout, remember it, and clear the status.
      lastState = finalState;
      readout.applyState(finalState);
      if (els.calibratingMsg) els.calibratingMsg.hidden = true;
      if (els.stateBadge) els.stateBadge.textContent = 'calibrated';
    },
    debug3D: els.debug3dCheckbox?.checked ?? false,
    camera: {
      zoomToCursor: els.chkZoomToCursor?.checked ?? true,
      preserveViewOnSideSelect: els.chkPreserveViewOnSideSelect?.checked ?? false,
    },
    lighting: {
      scene: {
        hemisphere: { intensity: sceneLights.hemiIntensity },
        key: { intensity: sceneLights.keyIntensity },
        fill: { intensity: sceneLights.fillIntensity },
      },
    },
  };
}

function getViewButtonRef(id: ViewButtonId, els: DomElements): HTMLButtonElement | null {
  switch (id) {
    case 'btn-view-2d':
      return els.btnView2d;
    case 'btn-view-3d':
      return els.btnView3d;
    case 'btn-view-2d3d':
      return els.btnView2d3d;
  }
}

function setActiveViewButton(activeId: ViewButtonId, els: DomElements): void {
  for (const id of Object.keys(viewButtons) as ViewButtonId[]) {
    const el = getViewButtonRef(id, els);
    if (el) el.classList.toggle('active', id === activeId);
  }
}

function syncToolbar3DState(_els: DomElements): void {
  const inactive = !is3DViewVisible();
  const panels = document.querySelectorAll<HTMLElement>('[data-3d-only="true"]');
  panels.forEach((p) => p.classList.toggle('three-d-inactive', inactive));
}

// The default sound pack is wired in by Tower3DView's constructor — the
// example only needs to flip `enabled` on user gesture. Call this only from a
// gesture-backed path (e.g. after a view-switch button click), never at init,
// since enabling audio without a user gesture can't unmute the AudioContext.
function syncAudioEnabledFromCheckbox(els: DomElements): void {
  if (els.chkTowerAudio?.checked) {
    view.applyAudioConfig({ enabled: true });
  }
}

export function armTowerAudioFromUserGesture(els: DomElements): void {
  if (!is3DViewVisible() || !els.chkTowerAudio?.checked) return;
  view.applyAudioConfig({ enabled: true });
}

function recreateView(
  renderers: RendererType | RendererType[],
  activeId: ViewButtonId,
  els: DomElements,
): void {
  view.dispose();
  currentRenderers = renderers;
  currentActiveId = activeId;
  view = new TowerRenderView(buildViewOptions(renderers, els));
  publishDisplay();
  setActiveViewButton(activeId, els);
  syncAudioEnabledFromCheckbox(els);
  if (lastState) view.applyState(lastState);
  replayLedOverrides(view.display);
  refreshSeals(view.display, readout);
  if (lastSide) view.selectSide(lastSide);
  syncToolbar3DState(els);
  fireViewChange();
}

/**
 * Rebuild the render view in place using the currently-selected renderers
 * and view button. Used by the pop-out controller after moving #tower
 * between the main document and a popup document.
 */
export function recreateCurrentDisplay(els: DomElements): void {
  recreateView(currentRenderers, currentActiveId, els);
}

export function initRendererController(els: DomElements): void {
  readout = new TowerStateReadout(els.readoutContainer);
  readout.clickToToggleSeals = true;
  readout.onSealClick = (seal) => toggleSeal(seal, view.display, readout);
  readout.clickToToggleLeds = true;
  readout.onLedClick = (layer, light, effect) =>
    recordLedOverride(layer, light, effect, view.display);
  view = new TowerRenderView(buildViewOptions('3d-view', els));
  publishDisplay();
  // Audio is armed on a user gesture (view-switch click / armTowerAudioFromUserGesture),
  // not here — enabling at init can't unmute the AudioContext without a gesture.

  for (const [id, renderers] of Object.entries(viewButtons) as [
    ViewButtonId,
    RendererType | RendererType[],
  ][]) {
    const btn = getViewButtonRef(id, els);
    if (btn) btn.addEventListener('click', () => recreateView(renderers, id, els));
  }

  if (els.debug3dCheckbox) {
    els.debug3dCheckbox.addEventListener('change', () => {
      recreateView(currentRenderers, currentActiveId, els);
    });
  }

  if (els.btnEntrance) {
    els.btnEntrance.addEventListener('click', () => view.playEntrance());
  }

  syncToolbar3DState(els);
}
