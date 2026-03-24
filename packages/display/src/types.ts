import type { TowerState, TowerSide } from 'ultimatedarktower';

export type { TowerSide };

/** Identifies which renderer implementation to use. */
export type RendererType = 'readout' | 'side-view';

/** Configuration options for TowerDisplay. */
export interface TowerDisplayOptions {
  /** DOM element to render into. */
  container: HTMLElement;
  /** Which renderer(s) to show. Defaults to ['readout'] for backwards compat. */
  renderers?: RendererType | RendererType[];
}

/** Public interface for all display implementations. */
export interface ITowerDisplay {
  /** Update the display with a new decoded tower state. */
  applyState(state: TowerState): void;
  /** Reset the display to its idle/waiting state. */
  showIdle(): void;
  /** Remove all rendered DOM content and reset internal state. */
  dispose(): void;
}
