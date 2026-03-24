import type { TowerState } from 'ultimatedarktower';
import type { ITowerDisplay, TowerSide } from './types';
import { injectStyles } from './styles';
import svgContent from './TowerSide.svg?raw';
import sealContent from './Seal.svg?raw';

const SIDES: TowerSide[] = ['north', 'east', 'south', 'west'];
const SIDE_LABELS: Record<TowerSide, string> = {
  north: 'N',
  east: 'E',
  south: 'S',
  west: 'W',
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Doorway positions within the TowerSide.svg viewBox (0 0 180 374).
 *  All doorways share the same size and left-edge x, derived from the top doorway path. */
const DOORWAY_X = 73.1;
const DOORWAY_W = 37.5;
const DOORWAY_H = 51.5;
const DOORWAYS = [
  { name: 'top', cy: 107.8 },
  { name: 'middle', cy: 175.1 },
  { name: 'bottom', cy: 242.6 },
];

export class TowerSideView implements ITowerDisplay {
  private readonly container: HTMLElement;
  private wrapper: HTMLDivElement | null = null;
  private currentSide: TowerSide = 'north';
  private buttons: HTMLButtonElement[] = [];

  constructor(container: HTMLElement) {
    this.container = container;
    injectStyles();
    this.build();
  }

  applyState(_state: TowerState): void {
    if (this.wrapper) this.wrapper.style.display = '';
  }

  showIdle(): void {
    if (this.wrapper) this.wrapper.style.display = 'none';
  }

  dispose(): void {
    if (this.wrapper) {
      this.wrapper.remove();
      this.wrapper = null;
    }
    this.buttons = [];
  }

  private build(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'tsv-wrapper';

    // Side selector bar
    const selector = document.createElement('div');
    selector.className = 'tsv-side-selector';

    for (const side of SIDES) {
      const btn = document.createElement('button');
      btn.className = 'tsv-side-btn';
      btn.textContent = SIDE_LABELS[side];
      btn.dataset.side = side;
      btn.dataset.active = String(side === this.currentSide);
      btn.addEventListener('click', () => this.selectSide(side));
      selector.appendChild(btn);
      this.buttons.push(btn);
    }

    this.wrapper.appendChild(selector);

    // SVG container
    const svgContainer = document.createElement('div');
    svgContainer.className = 'tsv-svg';
    svgContainer.innerHTML = svgContent;
    this.wrapper.appendChild(svgContainer);

    // Inject seal overlays onto each doorway
    const towerSvg = svgContainer.querySelector('svg');
    if (towerSvg) {
      this.injectSeals(towerSvg);
    }

    this.container.appendChild(this.wrapper);
  }

  private injectSeals(towerSvg: SVGSVGElement): void {
    // Parse the seal SVG to extract its inner content and viewBox
    const parser = new DOMParser();
    const sealDoc = parser.parseFromString(sealContent, 'image/svg+xml');
    const sealRoot = sealDoc.documentElement;
    const sealViewBox = sealRoot.getAttribute('viewBox') || '0 0 302 440';

    for (const door of DOORWAYS) {
      const y = door.cy - DOORWAY_H / 2;

      // Create a nested <svg> element positioned over the doorway
      const nested = document.createElementNS(SVG_NS, 'svg');
      nested.setAttribute('x', String(DOORWAY_X));
      nested.setAttribute('y', String(y));
      nested.setAttribute('width', String(DOORWAY_W));
      nested.setAttribute('height', String(DOORWAY_H));
      nested.setAttribute('viewBox', sealViewBox);
      nested.setAttribute('class', `tsv-seal tsv-seal-${door.name}`);

      // Copy seal content into the nested SVG
      for (const child of Array.from(sealRoot.childNodes)) {
        nested.appendChild(child.cloneNode(true));
      }

      towerSvg.appendChild(nested);
    }
  }

  private selectSide(side: TowerSide): void {
    this.currentSide = side;
    for (const btn of this.buttons) {
      btn.dataset.active = String(btn.dataset.side === side);
    }
  }
}
