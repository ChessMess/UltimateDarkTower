import type { TowerState } from 'ultimatedarktower';
import type { TowerDisplayOptions, ITowerDisplay } from './types';
import { TowerStateReadout } from './TowerStateReadout';

/**
 * TowerDisplay renders decoded tower state into a DOM container.
 *
 * @example
 * ```ts
 * const display = new TowerDisplay({
 *   container: document.getElementById('tower')!,
 * });
 * display.applyState(state);
 * ```
 */
export class TowerDisplay implements ITowerDisplay {
  private readonly impl: TowerStateReadout;

  constructor(options: TowerDisplayOptions) {
    this.impl = new TowerStateReadout(options.container);
  }

  /** Update the display with a new decoded tower state. */
  applyState(state: TowerState): void {
    this.impl.applyState(state);
  }

  /** Reset the display to its idle/waiting state. */
  showIdle(): void {
    this.impl.showIdle();
  }

  /** Remove all rendered DOM content and reset internal state. */
  dispose(): void {
    this.impl.dispose();
  }
}
