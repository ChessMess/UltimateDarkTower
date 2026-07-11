// A minimal subscribe/notify primitive shared by the state controller and the UI stores. It
// notifies a snapshot of the listener set so a listener may (un)subscribe during an emit.
// Dependency-free and `three`-free; internal — not part of the public API.

/** A subscribe/notify channel over events of type `T`. */
export interface Emitter<T> {
  emit(event: T): void;
  /** Subscribe to events. Returns an unsubscribe function. */
  subscribe(listener: (event: T) => void): () => void;
}

export function createEmitter<T>(): Emitter<T> {
  const listeners = new Set<(event: T) => void>();
  return {
    emit(event) {
      // Iterate a copy so a listener may (un)subscribe during emit.
      for (const listener of [...listeners]) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
