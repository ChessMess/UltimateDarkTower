import type { TowerSide } from '../types';
import { SIDES, SIDE_LABELS } from '../3d/constants';

/** Builds a row of N/E/S/W buttons (one per side) and tracks which side is currently active. */
export class SideButtons {
  readonly buttons: HTMLButtonElement[] = [];

  constructor(onClick: (side: TowerSide) => void) {
    for (const side of SIDES) {
      const btn = document.createElement('button');
      btn.className = 'tower-side-btn';
      btn.textContent = SIDE_LABELS[side];
      btn.dataset.side = side;
      btn.dataset.active = 'false';
      btn.addEventListener('click', () => onClick(side));
      this.buttons.push(btn);
    }
  }

  /** Mark the matching side button active (via `data-active`) and clear the others. Pass null to clear all. */
  setActive(side: TowerSide | null): void {
    for (const btn of this.buttons) {
      btn.dataset.active = String(btn.dataset.side === side);
    }
  }
}
