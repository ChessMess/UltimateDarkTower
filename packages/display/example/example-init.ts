declare global {
  interface Window {
    __udtdExampleReady?: boolean;
  }
}

(() => {
  const banner = document.getElementById('error-banner');

  function showError(message: string) {
    if (!banner) return;
    banner.hidden = false;
    banner.textContent = `Example runtime error: ${message}`;
  }

  window.__udtdExampleReady = false;

  window.addEventListener('error', (event) => {
    const target = event.target;
    if (target instanceof HTMLScriptElement) {
      showError(`Failed to load script: ${target.src || 'inline module script'}`);
      return;
    }
    showError(event.message || 'Unknown runtime error');
  });

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    showError(reason instanceof Error ? reason.message : String(reason));
  });

  setTimeout(() => {
    if (!window.__udtdExampleReady) {
      showError('Example failed to initialize. Open DevTools console for details.');
    }
  }, 1200);
})();

export {};
