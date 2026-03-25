import { LIGHT_EFFECTS, type TowerState } from 'ultimatedarktower';
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

const EFFECT_LABELS: Record<number, string> = {
  [LIGHT_EFFECTS.off]: 'off',
  [LIGHT_EFFECTS.on]: 'on',
  [LIGHT_EFFECTS.breathe]: 'breathe',
  [LIGHT_EFFECTS.breatheFast]: 'breathe-fast',
  [LIGHT_EFFECTS.breathe50percent]: 'breathe-50',
  [LIGHT_EFFECTS.flicker]: 'flicker',
};

const LED_BINDINGS = {
  'top-doorway-led': { id: 'top-doorway-led', layer: 0, light: 2 },
  'middle-doorway-led': { id: 'middle-doorway-led', layer: 1, light: 2 },
  'bottom-doorway-led': { id: 'bottom-doorway-led', layer: 2, light: 2 },
  'ledge-left-led': { id: 'ledge-left-led', layer: 3, light: 3 },
  'ledge-right-led': { id: 'ledge-right-led', layer: 3, light: 0 },
  'base-left-front-led': { id: 'base-left-front-led', layer: 4, light: 3 },
  'base-right-front-led': { id: 'base-right-front-led', layer: 4, light: 0 },
  'base-left-back-led': { id: 'base-left-back-led', layer: 5, light: 3 },
  'base-right-back-led': { id: 'base-right-back-led', layer: 5, light: 0 },
} as const;

type LedLabel = keyof typeof LED_BINDINGS;
type LightRole = 'center' | 'left' | 'right';

const CENTER_LIGHT_BY_SIDE: Record<TowerSide, number> = {
  north: 0,
  east: 1,
  south: 2,
  west: 3,
};

const EDGE_LIGHTS_BY_SIDE: Record<TowerSide, { left: number; right: number }> = {
  north: { left: 3, right: 0 },  // NW, NE
  east:  { left: 1, right: 0 },  // SE, NE
  south: { left: 1, right: 2 },  // SE, SW
  west:  { left: 3, right: 2 },  // NW, SW
};

const LED_LIGHT_ROLES: Record<LedLabel, LightRole> = {
  'top-doorway-led': 'center',
  'middle-doorway-led': 'center',
  'bottom-doorway-led': 'center',
  'ledge-left-led': 'left',
  'ledge-right-led': 'right',
  'base-left-front-led': 'left',
  'base-right-front-led': 'right',
  'base-left-back-led': 'left',
  'base-right-back-led': 'right',
};

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
  private latestState: TowerState | null = null;
  private buttons: HTMLButtonElement[] = [];
  private ledNodes: Partial<Record<LedLabel, SVGElement>> = {};

  constructor(container: HTMLElement) {
    this.container = container;
    injectStyles();
    this.build();
  }

  applyState(state: TowerState): void {
    this.latestState = state;
    this.applyLedState(state);
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
    this.latestState = null;
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
      this.cacheLedNodes(towerSvg);
    }

    this.container.appendChild(this.wrapper);
  }

  private injectSeals(towerSvg: SVGSVGElement): void {
    // Parse the seal SVG to extract its inner content and viewBox
    const parser = new DOMParser();
    const sealDoc = parser.parseFromString(sealContent, 'image/svg+xml');
    const sealRoot = sealDoc.documentElement;
    const sealViewBox = sealRoot.getAttribute('viewBox') || '0 0 302 440';
    const lightsLayer = towerSvg.querySelector('#layer1');

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

      if (lightsLayer?.parentNode) {
        lightsLayer.parentNode.insertBefore(nested, lightsLayer);
      } else {
        towerSvg.appendChild(nested);
      }
    }
  }

  private cacheLedNodes(towerSvg: SVGSVGElement): void {
    for (const label of Object.keys(LED_BINDINGS) as LedLabel[]) {
      const binding = LED_BINDINGS[label];
      const led = towerSvg.querySelector(`#${binding.id}`);
      if (!(led instanceof Element)) continue;
      const tag = led.tagName.toLowerCase();
      if (tag !== 'circle' && tag !== 'ellipse') continue;
      led.classList.add('tsv-led');
      led.setAttribute('data-effect', 'off');
      this.ledNodes[label] = led as SVGElement;
    }
  }

  private applyLedState(state: TowerState): void {
    for (const label of Object.keys(LED_BINDINGS) as LedLabel[]) {
      const led = this.ledNodes[label];
      if (!led) continue;
      const binding = LED_BINDINGS[label];
      const role = LED_LIGHT_ROLES[label];
      const centerIndex = CENTER_LIGHT_BY_SIDE[this.currentSide];
      const edgeIndices = EDGE_LIGHTS_BY_SIDE[this.currentSide];
      const lightIndex = role === 'center'
        ? centerIndex
        : role === 'left'
          ? edgeIndices.left
          : edgeIndices.right;
      const effectValue = state.layer[binding.layer]?.light[lightIndex]?.effect ?? LIGHT_EFFECTS.off;
      const effectLabel = EFFECT_LABELS[effectValue] ?? 'off';
      led.setAttribute('data-effect', effectLabel);
    }
  }

  private selectSide(side: TowerSide): void {
    this.currentSide = side;
    for (const btn of this.buttons) {
      btn.dataset.active = String(btn.dataset.side === side);
    }
    if (this.latestState) this.applyLedState(this.latestState);
  }
}
