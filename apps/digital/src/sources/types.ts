/**
 * The keystone abstraction (see docs/prd/_overview.md).
 *
 * Every feature reads/writes tower & board state through these interfaces — never
 * directly from a `UltimateDarkTower` BLE instance or the official app. The MVP ships
 * `ManualSource` implementations (player-driven). PRD-05 will add a `BridgeSource`
 * (official app via a Node FakeTower) and PRD-06 a `NetworkSource` (multiplayer),
 * both swappable with no UI changes.
 */
import type { TowerState } from 'ultimatedarktower';
import type { BoardKingdom, BoardState, FoeStatus } from 'ultimatedarktowerboard';

export type Unsubscribe = () => void;

/** A seal/glyph opening identified by drum level and cardinal side. */
export interface SealRef {
  level: 'top' | 'middle' | 'bottom';
  side: 'north' | 'east' | 'south' | 'west';
}

/** Owns the current TowerState and the player's "physical" tower actions. */
export interface TowerStateSource {
  getState(): TowerState;
  subscribe(listener: (state: TowerState) => void): Unsubscribe;

  /** Cumulative skull-drop count (modeled on TowerState.beam.count). */
  getSkullDropCount(): number;
  /** Drop a skull into the tower (end-of-turn action). */
  dropSkull(): void;

  getBrokenSeals(): SealRef[];
  breakSeal(seal: SealRef): void;
  restoreSeal(seal: SealRef): void;

  /** Rotate a drum (0=top,1=middle,2=bottom) to a cardinal position (0=N,1=E,2=S,3=W). */
  rotateDrum(drumIndex: 0 | 1 | 2, position: 0 | 1 | 2 | 3): void;

  /** Replace the full tower state (hydration from a loaded GameSession). */
  load(state: TowerState, brokenSeals: SealRef[]): void;

  dispose(): void;
}

/** Owns the current BoardState and token placement. Thin adapter over the UDT board controller. */
export interface BoardStateSource {
  getState(): BoardState;
  subscribe(listener: (state: BoardState) => void): Unsubscribe;

  // foes (levels 2–4): place / status / remove
  placeFoe(foeId: string, foe: string, location: string, status?: FoeStatus): void;
  removeFoe(foeId: string): void;
  setFoeStatus(foeId: string, status: FoeStatus): void;

  // heroes (up to 4): place (with optional owning kingdom) / remove
  placeHero(heroId: string, location: string, owner?: BoardKingdom): void;
  removeHero(heroId: string): void;

  // adversary (level 5): select + place at a location / clear
  setAdversary(id: string, location?: string): void;
  clearAdversary(): void;

  /** Move any placed token (hero / foe / adversary) to a location, resolving its kind by id. */
  moveToken(id: string, location: string): void;

  // skulls on buildings: a building is destroyed at SKULLS_TO_DESTROY, restored below it
  addSkull(location: string, n?: number): void;
  removeSkull(location: string, n?: number): void;

  /** Toggle a per-space marker (wasteland / power-skull / quest / …) on a location. */
  setSpaceMarker(location: string, marker: string, on: boolean): void;

  /** Replace the full board state (hydration from a loaded GameSession). */
  load(state: BoardState): void;

  dispose(): void;
}
