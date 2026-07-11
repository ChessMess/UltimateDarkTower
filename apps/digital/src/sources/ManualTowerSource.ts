/**
 * Player-driven TowerStateSource for the MVP. Holds a TowerState in memory and
 * mutates it in response to the player's tower actions. No BLE / official app.
 * PRD-05 replaces this with a BridgeSource without changing any UI.
 */
import { createDefaultTowerState, type TowerState } from 'ultimatedarktower';
import type { SealRef, TowerStateSource, Unsubscribe } from './types';

const sealKey = (s: SealRef): string => `${s.level}:${s.side}`;

export class ManualTowerSource implements TowerStateSource {
  private state: TowerState;
  private readonly listeners = new Set<(state: TowerState) => void>();
  private readonly brokenSeals = new Map<string, SealRef>();

  constructor() {
    this.state = createDefaultTowerState();
    // No hardware to calibrate in MVP — present as calibrated so the UI behaves.
    this.state.drum.forEach((d) => {
      d.calibrated = true;
    });
  }

  getState(): TowerState {
    return this.state;
  }

  subscribe(listener: (state: TowerState) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  getSkullDropCount(): number {
    return this.state.beam.count;
  }

  dropSkull(): void {
    this.state.beam.count += 1;
    this.emit();
  }

  getBrokenSeals(): SealRef[] {
    return [...this.brokenSeals.values()];
  }

  breakSeal(seal: SealRef): void {
    this.brokenSeals.set(sealKey(seal), seal);
    this.emit();
  }

  restoreSeal(seal: SealRef): void {
    this.brokenSeals.delete(sealKey(seal));
    this.emit();
  }

  rotateDrum(drumIndex: 0 | 1 | 2, position: 0 | 1 | 2 | 3): void {
    this.state.drum[drumIndex].position = position;
    this.emit();
  }

  load(state: TowerState, brokenSeals: SealRef[]): void {
    this.state = structuredClone(state);
    this.brokenSeals.clear();
    for (const s of brokenSeals) this.brokenSeals.set(sealKey(s), { ...s });
    this.emit();
  }

  dispose(): void {
    this.listeners.clear();
    this.brokenSeals.clear();
  }

  private emit(): void {
    for (const l of this.listeners) l(this.state);
  }
}
