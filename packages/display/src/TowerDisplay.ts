import type { TowerState } from 'ultimatedarktower';
import type { TowerDisplayOptions, ITowerDisplay, RendererType } from './types';
import { TowerStateReadout } from './TowerStateReadout';
import { TowerSideView } from './TowerSideView';

function normalizeRenderers(input?: RendererType | RendererType[]): RendererType[] {
  if (!input) return ['readout', 'side-view'];
  return Array.isArray(input) ? input : [input];
}

function createRenderer(type: RendererType, container: HTMLElement): ITowerDisplay {
  switch (type) {
    case 'readout':
      return new TowerStateReadout(container);
    case 'side-view':
      return new TowerSideView(container);
    default:
      throw new Error(`Unknown renderer type: ${type}`);
  }
}

/**
 * TowerDisplay renders decoded tower state into a DOM container.
 *
 * @example
 * ```ts
 * const display = new TowerDisplay({
 *   container: document.getElementById('tower')!,
 *   renderers: ['readout', 'side-view'],
 * });
 * display.applyState(state);
 * ```
 */
export class TowerDisplay implements ITowerDisplay {
  private readonly renderers: ITowerDisplay[] = [];
  private readonly root: HTMLDivElement;

  constructor(options: TowerDisplayOptions) {
    const types = normalizeRenderers(options.renderers);

    this.root = document.createElement('div');
    this.root.className = types.length > 1 ? 'td-layout td-multi' : 'td-layout';
    options.container.appendChild(this.root);

    for (const type of types) {
      const slot = document.createElement('div');
      slot.className = `td-slot td-slot-${type}`;
      this.root.appendChild(slot);
      this.renderers.push(createRenderer(type, slot));
    }
  }

  /** Update the display with a new decoded tower state. */
  applyState(state: TowerState): void {
    for (const r of this.renderers) r.applyState(state);
  }

  /** Reset the display to its idle/waiting state. */
  showIdle(): void {
    for (const r of this.renderers) r.showIdle();
  }

  /** Remove all rendered DOM content and reset internal state. */
  dispose(): void {
    for (const r of this.renderers) r.dispose();
    this.renderers.length = 0;
    this.root.remove();
  }
}
