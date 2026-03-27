import { TowerDisplay } from 'ultimatedarktowerdisplay';

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

let audioClearTimer: ReturnType<typeof setTimeout> | undefined;

const VOLUME_LABELS: Record<number, string> = { 0: 'Loud', 1: 'Medium', 2: 'Quiet', 3: 'Mute' };

const showAudioNotification = (name: string, loop: boolean, volume: number) => {
  const volLabel = VOLUME_LABELS[volume] ?? String(volume);
  audioNotification.textContent = `\u25B6 ${name}  (loop: ${loop ? 'on' : 'off'}, vol: ${volLabel})`;
  audioNotification.style.display = 'block';
  if (audioClearTimer !== undefined) clearTimeout(audioClearTimer);
  audioClearTimer = setTimeout(() => {
    audioNotification.style.display = 'none';
    audioClearTimer = undefined;
  }, 4000);
};

const setStatus = (message: string, isError = false) => {
  status.textContent = message;
  status.style.borderColor = isError ? '#7f1d1d' : '#3a3a3a';
  status.style.background = isError ? '#2b1414' : '#202020';
  status.style.color = isError ? '#fca5a5' : '#cfcfcf';
};

let display: TowerDisplay | null = null;

const initializeDisplay = () => {
  try {
    display = new TowerDisplay({ container: root });
    display.showIdle();
    setStatus('Popup ready. Waiting for tower state from the controller.');
    window.opener?.postMessage({ type: 'emulatorReady' }, '*');
  } catch (error) {
    const message = error instanceof Error ? error.stack ?? error.message : String(error);
    setStatus(`Failed to initialize emulator display.\n\n${message}`, true);
  }
};

window.addEventListener('error', (event: ErrorEvent) => {
  setStatus(`Popup error: ${event.message || 'Unknown error'}`, true);
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
  const message = event.reason instanceof Error ? event.reason.stack ?? event.reason.message : String(event.reason);
  setStatus(`Unhandled popup error: ${message}`, true);
});

window.addEventListener('message', (event: MessageEvent) => {
  const { type, state } = event.data as { type: string; state?: unknown };

  if (type === 'applyState' && state) {
    if (!display) {
      setStatus('State arrived before the display initialized.', true);
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      display.applyState(state as any);
      setStatus('Rendering live tower state.');
    } catch (error) {
      const message = error instanceof Error ? error.stack ?? error.message : String(error);
      setStatus(`Failed to render tower state.\n\n${message}`, true);
    }
  } else if (type === 'showIdle') {
    display?.showIdle();
    setStatus('Waiting for tower state from the controller.');
  } else if (type === 'playAudio') {
    const { name, loop, volume } = event.data as { name: string; loop: boolean; volume: number };
    showAudioNotification(name, loop, volume);
  }
});

initializeDisplay();
