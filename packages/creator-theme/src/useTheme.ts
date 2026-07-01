import { useSyncExternalStore } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'udtc-theme';

function readStored(): ThemeMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (v === 'light' || v === 'dark') return v;
  } catch {
    // SSR / private browsing
  }
  return 'system';
}

function applyMode(mode: ThemeMode): void {
  const root = document.documentElement;
  if (mode === 'light') root.setAttribute('data-theme', 'light');
  else if (mode === 'dark') root.setAttribute('data-theme', 'dark');
  else root.removeAttribute('data-theme');
}

// Tiny external store — shared between all useTheme() callers in the same tab.
let _mode: ThemeMode = readStored();
const _listeners = new Set<() => void>();

function subscribe(cb: () => void): () => void {
  _listeners.add(cb);
  return () => _listeners.delete(cb);
}

function getSnapshot(): ThemeMode {
  return _mode;
}

export function setTheme(mode: ThemeMode): void {
  _mode = mode;
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // ignore
  }
  applyMode(mode);
  _listeners.forEach((cb) => cb());
}

export function useTheme(): [ThemeMode, (m: ThemeMode) => void] {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return [mode, setTheme];
}

// Apply persisted preference synchronously on first import (before React renders).
// This mirrors the inline script in index.html for the non-JS fallback path.
applyMode(_mode);
