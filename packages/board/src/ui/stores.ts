// Shared observables that decouple the renderers (which PRODUCE selections + location
// picks) from the editing UI (which CONSUMES them). One source of truth each, plain
// subscribe/notify, no dependencies. Part of the `.` entry — MUST stay `three`-free
// and Display-free (the CI grep enforces it).
import type { TokenSelection } from '../renderers/assetPaths';
import type { LocationName } from '../state/boardState';

/** A single active-selection slot the inspector reads and the renderers/palette write. */
export interface SelectionStore {
  get(): TokenSelection | null;
  set(selection: TokenSelection | null): void;
  /** Subscribe to selection changes. Returns an unsubscribe function. */
  subscribe(listener: (selection: TokenSelection | null) => void): () => void;
}

/** What the palette is waiting to place; drives the renderers' armed space-pick affordance. */
export interface PendingPlacement {
  kind: TokenSelection['kind'];
  /** Human label for the confirm prompt, e.g. `Frost Trolls (foe)`. */
  label: string;
  /** Which spaces are valid targets — `buildings` for skulls/monuments, `all` otherwise. */
  targets: 'all' | 'buildings';
}

/** Emitted by a {@link LocationPickStore}. */
export type LocationPickEvent =
  | { type: 'armed'; pending: PendingPlacement }
  | { type: 'disarmed' }
  | { type: 'picked'; location: LocationName };

/**
 * Coordinates the click-a-space-then-confirm add flow. The palette `arm`s a pending
 * placement; the renderers (when armed) `pick` the clicked location; the palette
 * completes the placement on Confirm and `disarm`s. The dropdown path drives `pick`
 * directly, so the flow works with no renderer wired.
 */
export interface LocationPickStore {
  arm(request: PendingPlacement): void;
  disarm(): void;
  isArmed(): boolean;
  getPending(): PendingPlacement | null;
  pick(location: LocationName): void;
  /** Subscribe to arm/disarm/pick events. Returns an unsubscribe function. */
  subscribe(listener: (event: LocationPickEvent) => void): () => void;
}

export function createSelectionStore(): SelectionStore {
  let current: TokenSelection | null = null;
  const listeners = new Set<(selection: TokenSelection | null) => void>();
  return {
    get: () => current,
    set(selection) {
      current = selection;
      // Iterate a copy so a listener may (un)subscribe during emit.
      for (const listener of [...listeners]) listener(current);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export function createLocationPickStore(): LocationPickStore {
  let pending: PendingPlacement | null = null;
  const listeners = new Set<(event: LocationPickEvent) => void>();
  const emit = (event: LocationPickEvent): void => {
    for (const listener of [...listeners]) listener(event);
  };
  return {
    arm(request) {
      pending = request;
      emit({ type: 'armed', pending: request });
    },
    disarm() {
      if (!pending) return;
      pending = null;
      emit({ type: 'disarmed' });
    },
    isArmed: () => pending !== null,
    getPending: () => pending,
    pick(location) {
      // A pick is only meaningful while armed; ignore stray picks.
      if (!pending) return;
      emit({ type: 'picked', location });
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
