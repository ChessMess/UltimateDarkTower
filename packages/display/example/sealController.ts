// Example pattern: a module-scoped UltimateDarkTower instance owns broken-seal state so it survives display recreation on view switches.

import { UltimateDarkTower } from 'ultimatedarktower';
import type { SealIdentifier } from 'ultimatedarktower';
import type { TowerDisplay, TowerStateReadout } from '../src/index';

const tower = new UltimateDarkTower();

export function getTower(): UltimateDarkTower {
  return tower;
}

export function toggleSeal(
  seal: SealIdentifier,
  display: TowerDisplay,
  readout: TowerStateReadout,
): void {
  if (tower.isSealBroken(seal)) tower.markSealRestored(seal);
  else tower.markSealBroken(seal);
  refreshSeals(display, readout);
}

export function refreshSeals(display: TowerDisplay, readout: TowerStateReadout): void {
  const broken = tower.getBrokenSeals();
  display.applySeals(broken);
  readout.applySeals(broken);
}

export function removeAllSeals(display: TowerDisplay, readout: TowerStateReadout): void {
  const levels = ['top', 'middle', 'bottom'] as const;
  const sides = ['north', 'east', 'south', 'west'] as const;
  for (const level of levels) {
    for (const side of sides) {
      tower.markSealBroken({ level, side });
    }
  }
  refreshSeals(display, readout);
}

export function resetSeals(display: TowerDisplay, readout: TowerStateReadout): void {
  tower.resetBrokenSeals();
  refreshSeals(display, readout);
}
