import type { TowerState, TowerSide, SealIdentifier } from 'ultimatedarktower';

export type { TowerSide, SealIdentifier };

/** Identifies which renderer implementation to use. */
export type RendererType = 'readout' | 'side-view';

/** Configuration options for TowerDisplay. */
export interface TowerDisplayOptions {
  /** DOM element to render into. */
  container: HTMLElement;
  /** Which renderer(s) to show. Defaults to ['readout', 'side-view']. */
  renderers?: RendererType | RendererType[];
  /** Called when the user clicks a seal overlay in the side view. */
  onSealClick?: (seal: SealIdentifier) => void;
  /**
   * When true (the default), clicking a seal toggles its visibility independently
   * of game state. Set to false to disable the built-in toggle and rely solely on
   * {@link ITowerDisplay.applySeals} for seal visibility.
   */
  clickToToggleSeals?: boolean;
}

/** Public interface for all display implementations. */
export interface ITowerDisplay {
  /** Update the display with a new decoded tower state. */
  applyState(state: TowerState): void;
  /** Update seal visibility — pass the current list of broken seals. */
  applySeals(brokenSeals: SealIdentifier[]): void;
  /** Reset the display to its idle/waiting state. */
  showIdle(): void;
  /** Remove all rendered DOM content and reset internal state. */
  dispose(): void;
}
