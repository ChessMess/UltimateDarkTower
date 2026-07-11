import type { TowerState, SealIdentifier } from 'ultimatedarktower';

export interface TowerStateControllerOptions {
  /** When false, toggleSeal is a no-op. Mirrors clickToToggleSeals. Default: true. */
  togglesEnabled?: boolean;
}

const sealKey = (seal: SealIdentifier): string => `${seal.side}:${seal.level}`;

/**
 * Pure state controller — holds tower state and user overrides, returns resolved
 * values for renderers. No DOM dependency; safe to instantiate in any environment.
 */
export class TowerStateController {
  private readonly togglesEnabled: boolean;
  private latestState: TowerState | null = null;
  private userToggledSeals: Map<string, SealIdentifier> = new Map();
  private externalBrokenSeals: SealIdentifier[] = [];
  private userOverriddenLeds: Map<string, number> = new Map();

  constructor(options?: TowerStateControllerOptions) {
    this.togglesEnabled = options?.togglesEnabled ?? true;
  }

  /**
   * Store the incoming state, merge any active LED overrides, and return the
   * resolved state that renderers should display.
   */
  applyState(state: TowerState): TowerState {
    this.latestState = state;
    return this.resolveState(state);
  }

  /**
   * Store the current external broken-seal list and return the resolved
   * (merged with user toggles) seal list that renderers should display.
   */
  applySeals(brokenSeals: SealIdentifier[]): SealIdentifier[] {
    this.externalBrokenSeals = brokenSeals;
    return this.resolveSeals();
  }

  /**
   * Toggle a seal's user-override state (only when togglesEnabled) and return
   * the resolved seal list. Toggling a seal already in externalBrokenSeals does
   * not duplicate it — the resolved list is always deduplicated by seal key.
   */
  toggleSeal(seal: SealIdentifier): SealIdentifier[] {
    if (this.togglesEnabled) {
      const key = sealKey(seal);
      if (this.userToggledSeals.has(key)) {
        this.userToggledSeals.delete(key);
      } else {
        this.userToggledSeals.set(key, seal);
      }
    }
    return this.resolveSeals();
  }

  /**
   * Record a per-LED effect override and return the resolved state. Returns
   * null if no state has been applied yet (override is stored for later use).
   */
  setLedOverride(layer: number, light: number, effect: number): TowerState | null {
    this.userOverriddenLeds.set(`${layer}:${light}`, effect);
    return this.latestState ? this.resolveState(this.latestState) : null;
  }

  /** Clear all stored LED overrides. The stored state and seal toggles are untouched. */
  clearLedOverrides(): void {
    this.userOverriddenLeds.clear();
  }

  /** Get the latest applied state with LED overrides merged in. Returns null when no state has been applied yet. */
  getResolvedState(): TowerState | null {
    return this.latestState ? this.resolveState(this.latestState) : null;
  }

  /** Get the deduplicated union of externally-broken seals and user-toggled seals. */
  getResolvedSeals(): SealIdentifier[] {
    return this.resolveSeals();
  }

  /** Clear the stored state, all user toggles, and all LED overrides. */
  reset(): void {
    this.latestState = null;
    this.userToggledSeals.clear();
    this.externalBrokenSeals = [];
    this.userOverriddenLeds.clear();
  }

  private resolveState(state: TowerState): TowerState {
    if (this.userOverriddenLeds.size === 0) return state;
    return {
      ...state,
      layer: state.layer.map((layer, li) => ({
        ...layer,
        light: layer.light.map((light, ji) => {
          const override = this.userOverriddenLeds.get(`${li}:${ji}`);
          return override !== undefined ? { ...light, effect: override } : light;
        }) as typeof layer.light,
      })) as typeof state.layer,
    };
  }

  private resolveSeals(): SealIdentifier[] {
    const merged = new Map<string, SealIdentifier>();
    for (const s of this.externalBrokenSeals) merged.set(sealKey(s), s);
    for (const [key, seal] of this.userToggledSeals) {
      if (!merged.has(key)) merged.set(key, seal);
    }
    return Array.from(merged.values());
  }
}
