import type { TowerDisplay } from '../src/index';
import type { DomElements } from './dom';
import { refreshCameraConfigBox } from './lightingController';
import { showBannerError } from './utils';

/** Default label for the snapshot button (restored after the "Copied!" flash). */
const SNAPSHOT_LABEL = 'Snapshot view & copy';

/** Round a framing factor to 3 decimals so the copied/applied numbers stay clean. */
const round3 = (n: number): number => Math.round(n * 1000) / 1000;

/**
 * Push the full camera config into the panel controls: the three framing-factor
 * sliders (elevation, target height, distance) plus the zoom-to-cursor and
 * preserve-view toggles. Called on init, on view change, and after a snapshot so
 * the controls always reflect the live camera.
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

  if (els.chkZoomToCursor) els.chkZoomToCursor.checked = cfg.zoomToCursor;
  if (els.chkPreserveViewOnSideSelect)
    els.chkPreserveViewOnSideSelect.checked = cfg.preserveViewOnSideSelect;
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
    apply(v); // preserveView: re-frames the live camera in place, keeping your current angle/zoom
    refreshCameraConfigBox(getDisplay, els); // keep the 3D Camera Config JSON box in sync to copy
  });
}

export function initCameraTuneController(getDisplay: () => TowerDisplay, els: DomElements): void {
  // Sliders tune one factor against the *current* view (preserveView) so dragging
  // one doesn't snap the camera back to the north fit and lose your orbited angle.
  bindCameraSlider(
    els.rngElevationFactor,
    els.lblElevationFactor,
    (v) => getDisplay().applyCameraConfig({ elevationFactor: v }, { preserveView: true }),
    getDisplay,
    els,
  );
  bindCameraSlider(
    els.rngTargetHeightFactor,
    els.lblTargetHeightFactor,
    (v) => getDisplay().applyCameraConfig({ targetHeightFactor: v }, { preserveView: true }),
    getDisplay,
    els,
  );
  bindCameraSlider(
    els.rngDistanceFactor,
    els.lblDistanceFactor,
    (v) => getDisplay().applyCameraConfig({ distanceFactor: v }, { preserveView: true }),
    getDisplay,
    els,
  );

  if (els.chkZoomToCursor) {
    els.chkZoomToCursor.addEventListener('change', () => {
      getDisplay().setZoomToCursor(els.chkZoomToCursor!.checked);
      refreshCameraConfigBox(getDisplay, els);
    });
  }

  if (els.chkPreserveViewOnSideSelect) {
    els.chkPreserveViewOnSideSelect.addEventListener('change', () => {
      getDisplay().setPreserveViewOnSideSelect(els.chkPreserveViewOnSideSelect!.checked);
      refreshCameraConfigBox(getDisplay, els);
    });
  }

  // Read the hand-orbited live camera back into the three framing factors, apply
  // them (snaps to the north face at the same framing), surface the numbers in
  // the sliders + JSON box, then copy the full resolved camera config (factors
  // plus the toggles) to the clipboard ready to paste into a CameraConfig.
  const btn = els.btnCameraSnapshot;
  if (btn) {
    let resetTimer: ReturnType<typeof setTimeout> | null = null;
    btn.addEventListener('click', () => {
      const live = getDisplay().getLiveCameraFactors();
      if (!live) return;
      getDisplay().applyCameraConfig({
        elevationFactor: round3(live.elevationFactor),
        targetHeightFactor: round3(live.targetHeightFactor),
        distanceFactor: round3(live.distanceFactor),
      });
      syncCameraTuneControls(getDisplay, els);
      refreshCameraConfigBox(getDisplay, els);

      const fullConfig = getDisplay().getCameraConfig();
      if (!fullConfig) return;
      navigator.clipboard
        .writeText(JSON.stringify(fullConfig, null, 2))
        .then(() => {
          if (resetTimer !== null) clearTimeout(resetTimer);
          btn.textContent = 'Copied!';
          resetTimer = setTimeout(() => {
            btn.textContent = SNAPSHOT_LABEL;
            resetTimer = null;
          }, 1500);
        })
        .catch((err: unknown) => showBannerError(els.banner, 'Copy failed', err));
    });
  }

  syncCameraTuneControls(getDisplay, els);
}
