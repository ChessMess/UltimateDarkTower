import { TowerRenderView } from '../../../display/src/index';
import towerModelUrl from '../../../display/src/3d/assets/tower.glb';
// Use the cycle-free barrel (not src/index) — the emulator bundle must not pull
// in UltimateDarkTower.ts, which re-creates the circular dependency that breaks
// the Display package's module-level constant init. See build-examples.js.
import { TOWER_COMMANDS, createDefaultTowerState } from '../../src/udtDisplayExports';

const root = document.getElementById('tower-display-root');

if (!root) {
  throw new Error('Tower emulator root element not found');
}

const status = document.createElement('div');
status.style.marginBottom = '1rem';
status.style.padding = '0.75rem 1rem';
status.style.border = '1px solid #3a3a3a';
status.style.background = '#202020';
status.style.color = '#cfcfcf';
status.style.borderRadius = '8px';
status.style.whiteSpace = 'pre-wrap';
root.appendChild(status);

const audioNotification = document.createElement('div');
audioNotification.style.marginBottom = '1rem';
audioNotification.style.padding = '0.75rem 1rem';
audioNotification.style.border = '1px solid #1a3a1a';
audioNotification.style.background = '#141f14';
audioNotification.style.color = '#86efac';
audioNotification.style.borderRadius = '8px';
audioNotification.style.display = 'none';
root.appendChild(audioNotification);

const audioEnableButton = document.createElement('button');
audioEnableButton.type = 'button';
audioEnableButton.textContent = '🔊 Click to enable audio playback';
audioEnableButton.style.marginBottom = '1rem';
audioEnableButton.style.padding = '0.75rem 1rem';
audioEnableButton.style.border = '1px solid #3a3a5a';
audioEnableButton.style.background = '#1a1a2e';
audioEnableButton.style.color = '#cfd0ff';
audioEnableButton.style.borderRadius = '8px';
audioEnableButton.style.font = 'inherit';
audioEnableButton.style.cursor = 'pointer';
audioEnableButton.style.width = '100%';
audioEnableButton.style.textAlign = 'left';
root.appendChild(audioEnableButton);
audioEnableButton.addEventListener('click', async () => {
  // Probe-fetch a known sample so we surface fetch/CORS failures (the most
  // common cause being the popup loaded over file:// instead of http://) to
  // the visible status banner. The display package's TowerSampleAudio logs
  // these to console.error only — invisible to the user.
  const probeUrl = new URL('./assets/Tower_Idle_01.ogg', import.meta.url).href;
  try {
    const res = await fetch(probeUrl);
    if (!res.ok) {
      setStatus(
        `Audio assets not reachable (HTTP ${res.status} for ${probeUrl}).\nServe the page over http:// (e.g. \`npx http-server dist\`) instead of file://.`,
        true,
      );
      return;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(
      `Audio assets not reachable: ${message}\nProbe URL: ${probeUrl}\nIf this is a file:// URL, browsers block fetch() — serve the page over http:// (e.g. \`npx http-server dist\`).`,
      true,
    );
    return;
  }

  try {
    display?.applyAudioConfig({ enabled: true });
    audioEnableButton.remove();
    setStatus('Audio enabled. Rendering live tower state.');
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    setStatus(`Failed to enable audio.\n\n${message}`, true);
  }
});

let audioClearTimer: ReturnType<typeof setTimeout> | undefined;
let statusClearTimer: ReturnType<typeof setTimeout> | undefined;

const VOLUME_LABELS: Record<number, string> = { 0: 'Loud', 1: 'Medium', 2: 'Quiet', 3: 'Mute' };

const showAudioNotification = (name: string, loop: boolean, volume: number) => {
  const volLabel = VOLUME_LABELS[volume] ?? String(volume);
  audioNotification.textContent = `▶ ${name}  (loop: ${loop ? 'on' : 'off'}, vol: ${volLabel})`;
  audioNotification.style.display = 'block';
  if (audioClearTimer !== undefined) clearTimeout(audioClearTimer);
  audioClearTimer = setTimeout(() => {
    audioNotification.style.display = 'none';
    audioClearTimer = undefined;
  }, 4000);
};

const setStatus = (message: string, isError = false, persist = isError) => {
  if (statusClearTimer !== undefined) {
    clearTimeout(statusClearTimer);
    statusClearTimer = undefined;
  }
  status.style.display = '';
  status.textContent = message;
  status.style.borderColor = isError ? '#7f1d1d' : '#3a3a3a';
  status.style.background = isError ? '#2b1414' : '#202020';
  status.style.color = isError ? '#fca5a5' : '#cfcfcf';
  if (!persist) {
    statusClearTimer = setTimeout(() => {
      status.style.display = 'none';
      statusClearTimer = undefined;
    }, 4000);
  }
};

let display: TowerRenderView | null = null;

// Most recent state the controller mirrored to us; used as the baseline the
// calibration command rides in on.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let lastState: any = null;
// True while the display is running its own calibration sweep. The controller
// mirrors the calibrated state back once the adapter replies; we skip applying
// any interim mirrored states during the sweep so they don't snap all drums to
// home at once and cut the staged top→middle→bottom sweep short.
let popupCalibrating = false;

const initializeDisplay = () => {
  try {
    display = new TowerRenderView({
      container: root,
      renderers: '3d-view',
      modelUrl: towerModelUrl,
      title: 'Tower Emulator',
      // Cleared when the display's own calibration sequence settles, which
      // re-opens the normal state-mirror path. Also tell the controller the
      // visual sweep has actually finished so its TowerEmulatorAdapter emits
      // the calibrated TOWER_STATE reply now — keeping the controller's
      // calibration-complete in sync with the popup instead of a fixed timer.
      onCalibrationComplete: () => {
        popupCalibrating = false;
        window.opener?.postMessage({ type: 'calibrationComplete' }, '*');
      },
      // Match the real tower's firmware behavior: when the user fires a
      // light-override command via `Tower.lightOverrides(N)`, the firmware
      // plays both the LED sequence AND its bound sound sample. Enabling
      // bindSequenceToSample makes the display's playSequence(N) also fire
      // the bound sample (via playSampleOneShot internally).
      audio: { bindSequenceToSample: true },
      onLoadError: (details) => {
        setStatus(`3D model failed to load.\n\n${String(details)}`, true);
      },
    });
    display.showIdle();
    setStatus('Popup ready. Waiting for tower state from the controller.', false, true);
    window.opener?.postMessage({ type: 'emulatorReady' }, '*');
  } catch (error) {
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    setStatus(`Failed to initialize emulator display.\n\n${message}`, true);
  }
};

window.addEventListener('error', (event: ErrorEvent) => {
  setStatus(`Popup error: ${event.message || 'Unknown error'}`, true);
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const message =
    event.reason instanceof Error
      ? (event.reason.stack ?? event.reason.message)
      : String(event.reason);
  setStatus(`Unhandled popup error: ${message}`, true);
});

window.addEventListener('beforeunload', () => {
  window.opener?.postMessage({ type: 'emulatorClosed' }, '*');
});

window.addEventListener('message', (event: MessageEvent) => {
  const { type, state } = event.data as { type: string; state?: unknown };

  if (type === 'applyState' && state) {
    if (!display) {
      setStatus('State arrived before the display initialized.', true);
      return;
    }

    lastState = state;
    // While our own calibration sweep is animating, ignore mirrored states —
    // the emulator's interim calibrated-state would otherwise snap all drums to
    // home at once and short-circuit the staged top→middle→bottom sweep.
    if (popupCalibrating) {
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      display.applyState(state as any);
      setStatus('Rendering live tower state.');
    } catch (error) {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
      setStatus(`Failed to render tower state.\n\n${message}`, true);
    }
  } else if (type === 'calibrate') {
    // Stamp the calibration command onto the current/baseline state so the
    // display runs its visual sweep + audio (matching the Display example). The
    // sequence settles to the calibrated state and fires onCalibrationComplete.
    popupCalibrating = true;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    display?.applyState({
      ...(lastState ?? createDefaultTowerState()),
      command: TOWER_COMMANDS.calibration,
    } as any);
    setStatus('Calibrating…', false, true);
  } else if (type === 'showIdle') {
    display?.showIdle();
    setStatus('Waiting for tower state from the controller.', false, true);
  } else if (type === 'playAudio') {
    const { name, loop, volume, sample } = event.data as {
      name: string;
      loop: boolean;
      volume: number;
      sample: number;
    };
    showAudioNotification(name, loop, volume);
    // Drive audio via the display's new one-shot API (UltimateDarkTowerDisplay
    // 0.6.0+). The framework strips audio from state, so this is the only path
    // that actually reaches the display's audio engine for emulator playback.
    display?.playSample(sample, { loop, volume });
  } else if (type === 'playSequence') {
    const { sequenceId } = event.data as { sequenceId: number };
    // Drive LED sequences via the display's new transient API
    // (UltimateDarkTowerDisplay 0.7.0+). The framework strips led_sequence
    // from state — same fire-and-forget shape as audio — so this side-channel
    // is the only path that reaches the SequenceAnimator for emulator playback.
    display?.playSequence(sequenceId);
  } else if (type === 'applySeals') {
    const { seals } = event.data as { seals: unknown[] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    display?.applySeals(seals as any);
  }
});

initializeDisplay();
