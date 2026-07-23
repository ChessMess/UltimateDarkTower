/**
 * Persistence + portability for the single `GameSession` (FR-04.7, FR-04.8):
 * - localStorage save/load (resume on the same machine)
 * - export to a downloadable .json file / copy to clipboard
 * - import from a File or pasted text
 *
 * All "share" paths go through `serializeSession`/`deserializeSession`, so a file or
 * clipboard payload is exactly the same JSON used for save — hand it to a friend and
 * they import the identical game.
 */
import { deserializeSession, serializeSession } from './serialize';
import type { GameSession } from './types';

export const STORAGE_KEY = 'utdd.gameSession.v1';

export function saveToLocalStorage(session: GameSession): void {
  localStorage.setItem(STORAGE_KEY, serializeSession(session));
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/** A filesystem-friendly file name for an export. */
export function sessionFileName(session: GameSession): string {
  const base = (session.meta.name ?? 'rtdt-game')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/^-+|-+$/g, '');
  const stamp = session.meta.updatedAt.slice(0, 10);
  return `${base || 'rtdt-game'}-${stamp}.json`;
}

/** Trigger a browser download of the session as a .json file. */
export function downloadSession(session: GameSession, fileName = sessionFileName(session)): void {
  const blob = new Blob([serializeSession(session)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Copy the session JSON to the clipboard (for paste-sharing). */
export async function copySessionToClipboard(session: GameSession): Promise<void> {
  await navigator.clipboard.writeText(serializeSession(session));
}

/** Parse pasted JSON text into a session (throws `GameSessionLoadError` on bad input). */
export function parseSessionText(text: string): GameSession {
  return deserializeSession(text);
}

/** Read + parse an uploaded .json file into a session. */
export async function readSessionFile(file: File): Promise<GameSession> {
  const text = await file.text();
  return deserializeSession(text);
}
