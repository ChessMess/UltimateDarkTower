import {
  LIGHT_EFFECTS,
  RING_LIGHT_POSITIONS,
  LEDGE_BASE_LIGHT_POSITIONS,
  TOWER_LAYERS,
  type TowerState,
  type SealIdentifier,
  type TowerLevels,
} from 'ultimatedarktower';
import { TOWER_LIGHT_SEQUENCES } from 'ultimatedarktowerdata';
import type { ITowerDisplay, TowerSide } from '../types';
import { injectStyles } from '../styles';
import { SideButtons } from '../shared/SideButtons';
import { EFFECT_LABELS } from '../effectLabels';
import svgContent from './TowerSide.svg?raw';
import sealContent from './Seal.svg?raw';

const SVG_NS = 'http://www.w3.org/2000/svg';

const LED_BINDINGS = {
  'top-doorway-led': {
    id: 'top-doorway-led',
    layer: TOWER_LAYERS.TOP_RING,
    light: RING_LIGHT_POSITIONS.SOUTH,
  },
  'middle-doorway-led': {
    id: 'middle-doorway-led',
    layer: TOWER_LAYERS.MIDDLE_RING,
    light: RING_LIGHT_POSITIONS.SOUTH,
  },
  'bottom-doorway-led': {
    id: 'bottom-doorway-led',
    layer: TOWER_LAYERS.BOTTOM_RING,
    light: RING_LIGHT_POSITIONS.SOUTH,
  },
  'ledge-left-led': {
    id: 'ledge-left-led',
    layer: TOWER_LAYERS.LEDGE,
    light: LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST,
  },
  'ledge-right-led': {
    id: 'ledge-right-led',
    layer: TOWER_LAYERS.LEDGE,
    light: LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST,
  },
  'base-left-front-led': {
    id: 'base-left-front-led',
    layer: TOWER_LAYERS.BASE1,
    light: LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST,
  },
  'base-right-front-led': {
    id: 'base-right-front-led',
    layer: TOWER_LAYERS.BASE1,
    light: LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST,
  },
  'base-left-back-led': {
    id: 'base-left-back-led',
    layer: TOWER_LAYERS.BASE2,
    light: LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST,
  },
  'base-right-back-led': {
    id: 'base-right-back-led',
    layer: TOWER_LAYERS.BASE2,
    light: LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST,
  },
};

type LedLabel = keyof typeof LED_BINDINGS;
type LightRole = 'center' | 'left' | 'right';

const CENTER_LIGHT_BY_SIDE: Record<TowerSide, number> = {
  north: RING_LIGHT_POSITIONS.NORTH,
  east: RING_LIGHT_POSITIONS.EAST,
  south: RING_LIGHT_POSITIONS.SOUTH,
  west: RING_LIGHT_POSITIONS.WEST,
};

const EDGE_LIGHTS_BY_SIDE: Record<TowerSide, { left: number; right: number }> = {
  north: {
    left: LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST,
    right: LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST,
  },
  east: {
    left: LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST,
    right: LEDGE_BASE_LIGHT_POSITIONS.NORTH_EAST,
  },
  south: {
    left: LEDGE_BASE_LIGHT_POSITIONS.SOUTH_EAST,
    right: LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST,
  },
  west: {
    left: LEDGE_BASE_LIGHT_POSITIONS.NORTH_WEST,
    right: LEDGE_BASE_LIGHT_POSITIONS.SOUTH_WEST,
  },
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
  private sideButtons: SideButtons | null = null;
  private ledNodes: Partial<Record<LedLabel, SVGElement>> = {};
  private sealNodes: Partial<Record<string, SVGElement>> = {};
  private latestBrokenSeals: SealIdentifier[] = [];

  /** Optional callback fired when a user clicks a seal overlay. */
  onSealClick?: (seal: SealIdentifier) => void;

  /** Optional callback fired when the selected side changes (user click or internal auto-select). */
  onSideChange?: (side: TowerSide) => void;

  /**
   * When true (the default), clicking a seal toggles its visibility independently
   * of game state. Set to false to disable the built-in toggle.
   */
  clickToToggleSeals = true;

  private userToggledSeals = new Set<string>();

  constructor(container: HTMLElement) {
    this.container = container;
    injectStyles();
    this.build();
  }

  /**
   * Update the SVG display with a new decoded tower state. Auto-selects
   * the active side on seal-reveal sequences. The `_force` parameter
   * exists for `ITowerDisplay` compatibility; this renderer has no audio
   * path and ignores it.
   */
  applyState(state: TowerState, _force?: boolean): void {
    this.latestState = state;
    if (state.led_sequence === TOWER_LIGHT_SEQUENCES.sealReveal) {
      const side = this.detectSealSide(state);
      if (side) this.selectSide(side);
    }
    this.applyLedState(state);
    if (this.wrapper) this.wrapper.style.display = '';
  }

  /** Update seal visibility — pass the current list of broken seals. */
  applySeals(brokenSeals: SealIdentifier[]): void {
    this.latestBrokenSeals = brokenSeals;
    this.updateSealVisibility();
  }

  /** Hide the side view wrapper (no state to display). */
  showIdle(): void {
    if (this.wrapper) this.wrapper.style.display = 'none';
  }

  /** Remove the rendered SVG from the DOM and reset internal state. */
  dispose(): void {
    if (this.wrapper) {
      this.wrapper.remove();
      this.wrapper = null;
    }
    this.sideButtons = null;
    this.latestState = null;
    this.ledNodes = {};
    this.sealNodes = {};
    this.latestBrokenSeals = [];
    this.userToggledSeals.clear();
  }

  private detectSealSide(state: TowerState): TowerSide | null {
    const SIDE_BY_INDEX: TowerSide[] = ['north', 'east', 'south', 'west'];
    for (let layer = 0; layer <= 2; layer++) {
      for (let pos = 0; pos < 4; pos++) {
        if (state.layer[layer].light[pos].effect !== LIGHT_EFFECTS.off) {
          return SIDE_BY_INDEX[pos];
        }
      }
    }
    return null;
  }

  private updateSealVisibility(): void {
    const externalBroken = new Set(
      this.latestBrokenSeals.filter((s) => s.side === this.currentSide).map((s) => s.level),
    );
    for (const level of ['top', 'middle', 'bottom'] as const) {
      const node = this.sealNodes[level];
      if (!node) continue;
      const toggleKey = `${this.currentSide}-${level}`;
      const broken = externalBroken.has(level) || this.userToggledSeals.has(toggleKey);
      node.setAttribute('data-broken', String(broken));
    }
  }

  private build(): void {
    this.wrapper = document.createElement('div');
    this.wrapper.className = 'tsv-wrapper';

    // Side selector bar
    const selector = document.createElement('div');
    selector.className = 'tsv-side-selector';

    this.sideButtons = new SideButtons((side) => this.selectSide(side));
    this.sideButtons.setActive(this.currentSide);
    for (const btn of this.sideButtons.buttons) selector.appendChild(btn);

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
    this.updateSealVisibility();
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

      nested.addEventListener('click', () => {
        const seal: SealIdentifier = { side: this.currentSide, level: door.name as TowerLevels };
        if (this.clickToToggleSeals) {
          const key = `${this.currentSide}-${door.name}`;
          if (this.userToggledSeals.has(key)) {
            this.userToggledSeals.delete(key);
          } else {
            this.userToggledSeals.add(key);
          }
          this.updateSealVisibility();
        }
        this.onSealClick?.(seal);
      });

      this.sealNodes[door.name] = nested as unknown as SVGElement;
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
      const lightIndex =
        role === 'center' ? centerIndex : role === 'left' ? edgeIndices.left : edgeIndices.right;
      const effectValue =
        state.layer[binding.layer]?.light[lightIndex]?.effect ?? LIGHT_EFFECTS.off;
      const effectLabel = EFFECT_LABELS[effectValue] ?? 'off';
      led.setAttribute('data-effect', effectLabel);
    }
  }

  /** Switch the displayed tower face, re-mapping LEDs and seal overlays to the new side. No-op if already on that side. */
  selectSide(side: TowerSide): void {
    if (side === this.currentSide) return;
    this.currentSide = side;
    this.sideButtons?.setActive(side);
    if (this.latestState) this.applyLedState(this.latestState);
    this.updateSealVisibility();
    this.onSideChange?.(side);
  }
}
