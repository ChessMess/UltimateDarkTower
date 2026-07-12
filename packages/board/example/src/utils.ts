export function showBannerError(banner: HTMLElement | null, prefix: string, err: unknown): void {
  if (!banner) return;
  banner.hidden = false;
  banner.textContent = `${prefix}: ${err instanceof Error ? err.message : String(err)}`;
}

/** Copy-to-clipboard wired to a button, with a transient "Copied!" label. */
export function bindCopyButton(
  btn: HTMLButtonElement,
  getContent: () => string,
  banner: HTMLElement | null,
): void {
  const label = btn.textContent ?? 'Copy';
  let resetTimer: ReturnType<typeof setTimeout> | null = null;
  btn.addEventListener('click', () => {
    navigator.clipboard
      .writeText(getContent())
      .then(() => {
        if (resetTimer !== null) clearTimeout(resetTimer);
        btn.textContent = 'Copied!';
        resetTimer = setTimeout(() => {
          btn.textContent = label;
          resetTimer = null;
        }, 1500);
      })
      .catch((err: unknown) => showBannerError(banner, 'Copy failed', err));
  });
}

/** localStorage read that never throws (private-mode / quota safe). */
export function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** localStorage write that never throws. */
export function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore quota / private-mode errors
  }
}

/** Prefix every persisted key shares; clearing them all = a first-time page load. */
export const STORAGE_PREFIX = 'udtb.';

/** Remove every persisted app key so the next load starts from defaults. */
export function clearStoredState(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    // ignore private-mode / quota errors
  }
}
