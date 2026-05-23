import type { TowerDisplay, TowerStateReadout } from '../src/index';
import type { LightingConfig, CameraConfig, AudioConfig } from '../src/3d/types';
import type {
  PhysicsConfig,
  SkullPhysicsHandle,
} from '../src/physics';
import type { TowerState } from 'ultimatedarktower';
import type { DomElements } from './dom';
import { armTowerAudioFromUserGesture, is3DViewVisible, getLastState } from './rendererController';
import { clearLedOverrides } from './ledOverrideController';
import { showBannerError, bindCopyButton } from './utils';

type ConfigType = 'state' | 'lighting' | 'camera' | 'audio' | 'physics';

let activeConfigType: ConfigType = 'state';
let cleanConfigJson = '';

export function getActiveConfigType(): ConfigType {
  return activeConfigType;
}

export function refreshConfigPreview(getDisplay: () => TowerDisplay, els: DomElements): void {
  if (!els.configPreview) return;

  let json = '';

  if (activeConfigType === 'lighting') {
    const config = getDisplay().getLightingConfig();
    json = config ? JSON.stringify(config, null, 2) : '';
  } else if (activeConfigType === 'camera') {
    const config = getDisplay().getCameraConfig();
    json = config ? JSON.stringify(config, null, 2) : '';
  } else if (activeConfigType === 'audio') {
    const config = getDisplay().getAudioConfig();
    json = config ? JSON.stringify(config, null, 2) : '';
  } else if (activeConfigType === 'physics') {
    const h = physicsHandleGetter?.();
    json = h ? JSON.stringify(h.getPhysicsConfig(), null, 2) : '';
  } else {
    const state = getLastState();
    json = state ? JSON.stringify(state, null, 2) : '';
  }

  els.configPreview.value = json;
  cleanConfigJson = json;
  if (els.btnApplyConfig) els.btnApplyConfig.disabled = true;
}

export function setConfigPreviewMessage(text: string, els: DomElements): void {
  if (activeConfigType !== 'state') {
    activeConfigType = 'state';
    if (els.selConfigType) els.selConfigType.value = 'state';
  }
  if (!els.configPreview) return;
  els.configPreview.value = text;
  cleanConfigJson = text;
  if (els.btnApplyConfig) els.btnApplyConfig.disabled = true;
}

export function syncConfigSelectorVisibility(getDisplay: () => TowerDisplay, els: DomElements): void {
  const visible = is3DViewVisible();
  const optLighting = document.getElementById('opt-lighting') as HTMLOptionElement | null;
  const optCamera = document.getElementById('opt-camera') as HTMLOptionElement | null;
  const optAudio = document.getElementById('opt-audio') as HTMLOptionElement | null;
  const optPhysics = document.getElementById('opt-physics') as HTMLOptionElement | null;

  if (optLighting) optLighting.disabled = !visible;
  if (optCamera) optCamera.disabled = !visible;
  if (optAudio) optAudio.disabled = !visible;
  if (optPhysics) optPhysics.disabled = !visible;

  if (!visible && (
    activeConfigType === 'lighting' ||
    activeConfigType === 'camera' ||
    activeConfigType === 'audio' ||
    activeConfigType === 'physics'
  )) {
    activeConfigType = 'state';
    if (els.selConfigType) els.selConfigType.value = 'state';
    refreshConfigPreview(getDisplay, els);
  }
}

let physicsHandleGetter: (() => SkullPhysicsHandle | null) | null = null;
let physicsSyncSliders: ((cfg: import('../src/physics').ResolvedPhysicsConfig) => void) | null = null;
let editorGetDisplay: (() => TowerDisplay) | null = null;
let editorEls: DomElements | null = null;

/**
 * Refresh the JSON preview if the user is currently viewing the physics
 * config. Called by `physicsController` whenever a slider edit mutates the
 * live config, so the textarea stays in lockstep with the canonical state.
 */
export function notifyPhysicsConfigChanged(): void {
  if (activeConfigType !== 'physics') return;
  if (!editorGetDisplay || !editorEls) return;
  if (editorEls.btnApplyConfig && !editorEls.btnApplyConfig.disabled) return;
  refreshConfigPreview(editorGetDisplay, editorEls);
}

export function initConfigEditor(
  getDisplay: () => TowerDisplay,
  getReadout: () => TowerStateReadout,
  setLastState: (s: TowerState | null) => void,
  onStateApplied: (state: TowerState) => void,
  getPhysicsHandle: () => SkullPhysicsHandle | null,
  syncSlidersFromConfig: (cfg: import('../src/physics').ResolvedPhysicsConfig) => void,
  els: DomElements,
): void {
  physicsHandleGetter = getPhysicsHandle;
  physicsSyncSliders = syncSlidersFromConfig;
  editorGetDisplay = getDisplay;
  editorEls = els;

  if (els.selConfigType) {
    els.selConfigType.addEventListener('change', () => {
      activeConfigType = els.selConfigType!.value as ConfigType;
      refreshConfigPreview(getDisplay, els);
    });
  }

  if (els.configPreview) {
    els.configPreview.addEventListener('input', () => {
      if (els.btnApplyConfig) {
        els.btnApplyConfig.disabled = els.configPreview!.value === cleanConfigJson;
      }
    });
  }

  if (els.btnApplyConfig) {
    els.btnApplyConfig.addEventListener('click', () => {
      if (!els.configPreview) return;
      try {
        if (els.banner) els.banner.hidden = true;

        if (activeConfigType === 'lighting') {
          const parsed = JSON.parse(els.configPreview.value) as LightingConfig;
          getDisplay().applyLightingConfig(parsed);
          refreshConfigPreview(getDisplay, els);
        } else if (activeConfigType === 'camera') {
          const parsed = JSON.parse(els.configPreview.value) as CameraConfig;
          getDisplay().applyCameraConfig(parsed);
          refreshConfigPreview(getDisplay, els);
        } else if (activeConfigType === 'audio') {
          const parsed = JSON.parse(els.configPreview.value) as AudioConfig;
          getDisplay().applyAudioConfig(parsed);
          const resolved = getDisplay().getAudioConfig();
          if (resolved && els.chkTowerAudio) els.chkTowerAudio.checked = resolved.enabled;
          refreshConfigPreview(getDisplay, els);
        } else if (activeConfigType === 'physics') {
          const parsed = JSON.parse(els.configPreview.value) as PhysicsConfig;
          const h = physicsHandleGetter?.();
          if (h) {
            h.applyPhysicsConfig(parsed);
            physicsSyncSliders?.(h.getPhysicsConfig());
          }
          refreshConfigPreview(getDisplay, els);
        } else {
          const parsed = JSON.parse(els.configPreview.value) as TowerState;
          armTowerAudioFromUserGesture(els);
          clearLedOverrides(getDisplay(), getReadout());
          getDisplay().applyState(parsed, true);
          getReadout().applyState(parsed);
          setLastState(parsed);
          cleanConfigJson = els.configPreview.value;
          if (els.btnApplyConfig) els.btnApplyConfig.disabled = true;
          onStateApplied(parsed);
        }
      } catch (err) {
        showBannerError(els.banner, 'Invalid JSON', err);
      }
    });
  }

  if (els.btnCopyConfig && els.configPreview) {
    bindCopyButton(els.btnCopyConfig, () => els.configPreview!.value, els.banner);
  }
}
