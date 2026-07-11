// Example pattern: a module-scoped LED override store so per-LED effect
// overrides survive display recreation on view switches (mirrors sealController).

import type { TowerDisplay, TowerStateReadout } from '../src/index';

const overrides = new Map<string, number>();

const key = (layer: number, light: number): string => `${layer}:${light}`;

export function setLedOverride(
  layer: number,
  light: number,
  effect: number,
  display: TowerDisplay,
): void {
  overrides.set(key(layer, light), effect);
  display.setLedOverride(layer, light, effect);
}

export function replayLedOverrides(display: TowerDisplay): void {
  for (const [k, effect] of overrides) {
    const [layerStr, lightStr] = k.split(':');
    display.setLedOverride(Number(layerStr), Number(lightStr), effect);
  }
}

export function clearLedOverrides(
  display: TowerDisplay,
  readout: TowerStateReadout,
): void {
  overrides.clear();
  display.clearLedOverrides();
  readout.clearLedOverrides();
}
