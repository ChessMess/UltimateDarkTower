import type { TowerDisplay } from '../src/index';
import type { DomElements } from './dom';
import { refreshCameraConfigBox } from './lightingController';
import { showBannerError } from './utils';

/** Default label for the snapshot button (restored after the "Copied!" flash). */
const SNAPSHOT_LABEL = 'Snapshot view & copy';

/** Round a framing factor to 3 decimals so the copied/applied numbers stay clean. */
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Push the camera's three framing factors (elevation, target height, distance)
 * into the sliders + numeric labels. Called on init, on view change, and after
 * a snapshot so the controls always reflect the live camera.
 */
export function syncCameraTuneControls(getDisplay: () => TowerDisplay, els: DomElements): void {
  const cfg = getDisplay().getCameraConfig();
  if (!cfg) return;

  const targets: [HTMLInputElement | null, HTMLElement | null, number][] = [
    [els.rngElevationFactor, els.lblElevationFactor, cfg.elevationFactor],
    [els.rngTargetHeightFactor, els.lblTargetHeightFactor, cfg.targetHeightFactor],
    [els.rngDistanceFactor, els.lblDistanceFactor, cfg.distanceFactor],
  ];
  for (const [rng, lbl, val] of targets) {
    if (rng) rng.value = String(val);
    if (lbl) lbl.textContent = val.toFixed(2);
  }
}

function bindCameraSlider(
  rng: HTMLInputElement | null,
  lbl: HTMLElement | null,
  apply: (v: number) => void,
  getDisplay: () => TowerDisplay,
  els: DomElements,
): void {
  if (!rng) return;
  rng.addEventListener('input', () => {
    const v = parseFloat(rng.value);
    if (lbl) lbl.textContent = v.toFixed(2);
    apply(v); // applyCameraConfig re-fits the live camera, so the view updates as you drag
    refreshCameraConfigBox(getDisplay, els); // keep the 3D Camera Config JSON box in sync to copy
  });
}

export function initCameraTuneController(getDisplay: () => TowerDisplay, els: DomElements): void {
  bindCameraSlider(els.rngElevationFactor, els.lblElevationFactor,
    v => getDisplay().applyCameraConfig({ elevationFactor: v }), getDisplay, els);
  bindCameraSlider(els.rngTargetHeightFactor, els.lblTargetHeightFactor,
    v => getDisplay().applyCameraConfig({ targetHeightFactor: v }), getDisplay, els);
  bindCameraSlider(els.rngDistanceFactor, els.lblDistanceFactor,
    v => getDisplay().applyCameraConfig({ distanceFactor: v }), getDisplay, els);

  // Read the hand-orbited live camera back into the three factors, apply them
  // (snaps to the north face at the same framing), surface the numbers in the
  // sliders + JSON box, and copy the factors to the clipboard ready to paste
  // into a CameraConfig.
  const btn = els.btnCameraSnapshot;
  if (btn) {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;
    btn.addEventListener('click', () => {
      const live = getDisplay().getLiveCameraFactors();
      if (!live) return;
      const factors = {
        elevationFactor: round3(live.elevationFactor),
        targetHeightFactor: round3(live.targetHeightFactor),
        distanceFactor: round3(live.distanceFactor),
      };
      getDisplay().applyCameraConfig(factors);
      syncCameraTuneControls(getDisplay, els);
      refreshCameraConfigBox(getDisplay, els);

      navigator.clipboard.writeText(JSON.stringify(factors, null, 2)).then(() => {
        if (resetTimer !== null) clearTimeout(resetTimer);
        btn.textContent = 'Copied!';
        resetTimer = setTimeout(() => {
          btn.textContent = SNAPSHOT_LABEL;
          resetTimer = null;
        }, 1500);
      }).catch((err: unknown) => showBannerError(els.banner, 'Copy failed', err));
    });
  }

  syncCameraTuneControls(getDisplay, els);
}
