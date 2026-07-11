// Per-instance localStorage for the stage, namespaced by a prefix so two stages
// on one page never collide. Reads/writes never throw (private-mode / quota safe).

export interface StageStorage {
  readonly prefix: string;
  read(key: string): string | null;
  write(key: string, value: string): void;
  /** Remove every key this storage owns (those under `prefix.`). */
  clear(): void;
}

export function createStageStorage(prefix: string): StageStorage {
  const full = (key: string): string => `${prefix}.${key}`;
  return {
    prefix,
    read(key) {
      try {
        return localStorage.getItem(full(key));
      } catch {
        return null;
      }
    },
    write(key, value) {
      try {
        localStorage.setItem(full(key), value);
      } catch {
        // ignore quota / private-mode errors
      }
    },
    clear() {
      try {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k?.startsWith(`${prefix}.`)) keys.push(k);
        }
        for (const k of keys) localStorage.removeItem(k);
      } catch {
        // ignore
      }
    },
  };
}

/** A storage that persists nothing (used when `persist: false`). */
export function noopStorage(): StageStorage {
  return { prefix: '', read: () => null, write: () => undefined, clear: () => undefined };
}
