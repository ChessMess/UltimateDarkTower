import type { TowerDisplay } from '../src/index';
import type { ResolvedLightingConfig } from '../src/3d/types';
import type { DomElements } from './dom';
import { getSceneLights, is3DViewVisible } from './rendererController';
import { getActiveConfigType, refreshConfigPreview } from './configEditor';

function syncSceneLightControls(lighting: ResolvedLightingConfig, els: DomElements): void {
  if (!lighting || !lighting.scene) return;

  const hemi = lighting.scene.hemisphere.intensity;
  const key = lighting.scene.key.intensity;
  const fill = lighting.scene.fill.intensity;
  const exposure = lighting.scene.exposure;
  const [keyX, keyY, keyZ] = lighting.scene.key.position;

  const sceneLights = getSceneLights();
  sceneLights.hemiIntensity = hemi;
  sceneLights.keyIntensity = key;
  sceneLights.fillIntensity = fill;

  const bloom = lighting.scene.bloom;
  const boardSize = lighting.groundDisc.radiusFactor;
  const boardBrightness = lighting.boardDisc.brightness;
  const syncTargets: [HTMLInputElement | null, HTMLElement | null, number, number][] = [
    [els.rngHemi, els.lblHemi, hemi, 2], [els.rngKey, els.lblKey, key, 2],
    [els.rngFill, els.lblFill, fill, 2],
    [els.rngExposure, els.lblExposure, exposure, 2],
    [els.rngKeyX, els.lblKeyX, keyX, 1], [els.rngKeyY, els.lblKeyY, keyY, 1],
    [els.rngKeyZ, els.lblKeyZ, keyZ, 1],
    [els.rngBloomStrength, els.lblBloomStrength, bloom.strength, 2],
    [els.rngBloomRadius, els.lblBloomRadius, bloom.radius, 2],
    [els.rngBloomThreshold, els.lblBloomThreshold, bloom.threshold, 2],
    [els.rngUndersideLight, els.lblUndersideLight, lighting.groundDisc.undersideLightIntensity, 2],
    [els.rngBoardSize, els.lblBoardSize, boardSize, 1],
    [els.rngBoardBrightness, els.lblBoardBrightness, boardBrightness, 2],
    [els.rngBoardThickness, els.lblBoardThickness, lighting.boardDisc.thicknessFactor, 3],
  ];
  for (const [rng, lbl, val, dec] of syncTargets) {
    if (rng) rng.value = String(val);
    if (lbl) lbl.textContent = val.toFixed(dec);
  }
}

export function refreshLightingConfigBox(getDisplay: () => TowerDisplay, els: DomElements): void {
  const lighting = getDisplay().getLightingConfig();
  if (!lighting) return;
  syncSceneLightControls(lighting, els);
  if (getActiveConfigType() === 'lighting') {
    refreshConfigPreview(getDisplay, els);
  }
}

function bindLightSlider(
  rng: HTMLInputElement | null,
  lbl: HTMLElement | null,
  apply: (v: number) => void,
  getDisplay: () => TowerDisplay,
  els: DomElements,
  decimals = 2,
): void {
  if (!rng) return;
  rng.addEventListener('input', () => {
    const v = parseFloat(rng.value);
    if (lbl) lbl.textContent = v.toFixed(decimals);
    apply(v);
    if (is3DViewVisible() && getActiveConfigType() === 'lighting') {
      refreshConfigPreview(getDisplay, els);
    }
  });
}

export function refreshCameraConfigBox(getDisplay: () => TowerDisplay, els: DomElements): void {
  if (getActiveConfigType() === 'camera') {
    refreshConfigPreview(getDisplay, els);
  }
}

export function initLightingController(getDisplay: () => TowerDisplay, els: DomElements): void {
  const sceneLights = getSceneLights();

  bindLightSlider(els.rngHemi, els.lblHemi, v => {
    sceneLights.hemiIntensity = v;
    getDisplay().setSceneLights({ hemi: v });
  }, getDisplay, els);

  bindLightSlider(els.rngKey, els.lblKey, v => {
    sceneLights.keyIntensity = v;
    getDisplay().setSceneLights({ key: v });
  }, getDisplay, els);

  bindLightSlider(els.rngFill, els.lblFill, v => {
    sceneLights.fillIntensity = v;
    getDisplay().setSceneLights({ fill: v });
  }, getDisplay, els);

  bindLightSlider(els.rngExposure, els.lblExposure, v => getDisplay().setSceneLights({ exposure: v }), getDisplay, els);
  bindLightSlider(els.rngKeyX, els.lblKeyX, v => getDisplay().setSceneLights({ keyX: v }), getDisplay, els, 1);
  bindLightSlider(els.rngKeyY, els.lblKeyY, v => getDisplay().setSceneLights({ keyY: v }), getDisplay, els, 1);
  bindLightSlider(els.rngKeyZ, els.lblKeyZ, v => getDisplay().setSceneLights({ keyZ: v }), getDisplay, els, 1);

  bindLightSlider(els.rngBloomStrength, els.lblBloomStrength, v => {
    getDisplay().applyLightingConfig({ scene: { bloom: { strength: v } } });
  }, getDisplay, els);

  bindLightSlider(els.rngBloomRadius, els.lblBloomRadius, v => {
    getDisplay().applyLightingConfig({ scene: { bloom: { radius: v } } });
  }, getDisplay, els);

  bindLightSlider(els.rngBloomThreshold, els.lblBloomThreshold, v => {
    getDisplay().applyLightingConfig({ scene: { bloom: { threshold: v } } });
  }, getDisplay, els);

  bindLightSlider(els.rngUndersideLight, els.lblUndersideLight, v => {
    getDisplay().applyLightingConfig({ groundDisc: { undersideLightIntensity: v } });
  }, getDisplay, els);

  bindLightSlider(els.rngBoardSize, els.lblBoardSize, v => {
    getDisplay().applyLightingConfig({ groundDisc: { radiusFactor: v } });
  }, getDisplay, els, 1);

  bindLightSlider(els.rngBoardBrightness, els.lblBoardBrightness, v => {
    getDisplay().applyLightingConfig({ boardDisc: { brightness: v } });
  }, getDisplay, els);

  bindLightSlider(els.rngBoardThickness, els.lblBoardThickness, v => {
    getDisplay().applyLightingConfig({ boardDisc: { thicknessFactor: v } });
  }, getDisplay, els, 3);

  if (els.chkBoardBottomCap) {
    els.chkBoardBottomCap.addEventListener('change', () => {
      getDisplay().applyLightingConfig({ boardDisc: { bottomCap: els.chkBoardBottomCap!.checked } });
    });
  }

  if (els.btnBoardEdgeWood) {
    els.btnBoardEdgeWood.addEventListener('click', () => {
      getDisplay().applyLightingConfig({ boardDisc: { edgeColor: 0x5c3318 } });
    });
  }

  if (els.btnBoardEdgeNeoprene) {
    els.btnBoardEdgeNeoprene.addEventListener('click', () => {
      getDisplay().applyLightingConfig({ boardDisc: { edgeColor: 0x0e0e0e } });
    });
  }

  if (els.chkGroundDisc) {
    els.chkGroundDisc.addEventListener('change', () => {
      getDisplay().setGroundDiscVisible(els.chkGroundDisc!.checked);
      if (is3DViewVisible()) refreshLightingConfigBox(getDisplay, els);
    });
  }

  if (els.chkBoardDisc) {
    els.chkBoardDisc.addEventListener('change', () => {
      getDisplay().setBoardDiscEnabled(els.chkBoardDisc!.checked);
    });
  }

  if (els.inpSkyboxUrl) {
    els.inpSkyboxUrl.addEventListener('change', () => {
      getDisplay().setSkyboxUrl(els.inpSkyboxUrl!.value || null);
    });
  }

  // Toggling this is the user gesture that lets the AudioContext leave the
  // suspended state — autoplay policy means we cannot enable audio until the
  // user opts in by clicking something. The single `enabled` flag covers both
  // tower-sample and drum-rotation playback (master toggle).
  if (els.chkTowerAudio) {
    els.chkTowerAudio.addEventListener('change', () => {
      getDisplay().applyAudioConfig({ enabled: els.chkTowerAudio!.checked });
    });
  }

  if (els.chkZoomToCursor) {
    els.chkZoomToCursor.addEventListener('change', () => {
      getDisplay().setZoomToCursor(els.chkZoomToCursor!.checked);
    });
  }

  if (els.chkPreserveViewOnSideSelect) {
    els.chkPreserveViewOnSideSelect.addEventListener('change', () => {
      getDisplay().setPreserveViewOnSideSelect(els.chkPreserveViewOnSideSelect!.checked);
    });
  }
}
