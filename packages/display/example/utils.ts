export function showBannerError(banner: HTMLElement | null, prefix: string, err: unknown): void {
  if (!banner) return;
  banner.hidden = false;
  banner.textContent = `${prefix}: ${err instanceof Error ? err.message : String(err)}`;
}

export function bindCopyButton(btn: HTMLButtonElement, getContent: () => string, banner: HTMLElement | null): void {
  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  btn.addEventListener('click', () => {
    navigator.clipboard.writeText(getContent()).then(() => {
      if (resetTimer !== null) clearTimeout(resetTimer);
      btn.textContent = 'Copied!';
      resetTimer = setTimeout(() => {
        btn.textContent = 'Copy JSON';
        resetTimer = null;
      }, 1500);
    }).catch((err: unknown) => showBannerError(banner, 'Copy failed', err));
  });
}
