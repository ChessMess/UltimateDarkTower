/**
 * Player-driven BoardStateSource for the MVP. Adapts UDT Board's BoardStateController
 * (owned by the BoardStageView) to the BoardStateSource interface, so the rest of the
 * app never touches the controller directly. PRD-05's BridgeSource will apply
 * app-driven board commands through the same controller the same way.
 */
import type {
  BoardKingdom,
  BoardState,
  BoardStateController,
  FoeStatus,
} from 'ultimatedarktowerboard';
import { buildingAt, buildingTokenId, skullTokenId } from 'ultimatedarktowerboard';
import type { BoardStateSource, Unsubscribe } from './types';

/** A building is destroyed when its skull stack reaches this (base game: the 4th skull). */
export const SKULLS_TO_DESTROY = 4;

export class ManualBoardSource implements BoardStateSource {
  private readonly listeners = new Set<(state: BoardState) => void>();
  private readonly unsubController: Unsubscribe;

  constructor(private readonly controller: BoardStateController) {
    this.unsubController = controller.subscribe((event) => {
      if (event.type === 'change') this.emit();
    });
  }

  getState(): BoardState {
    return this.controller.getState();
  }

  subscribe(listener: (state: BoardState) => void): Unsubscribe {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  placeFoe(foeId: string, foe: string, location: string, status?: FoeStatus): void {
    this.controller.spawnFoe(foeId, foe, location, status);
  }

  removeFoe(foeId: string): void {
    this.controller.removeFoe(foeId);
  }

  setFoeStatus(foeId: string, status: FoeStatus): void {
    this.controller.setFoeStatus(foeId, status);
  }

  placeHero(heroId: string, location: string, owner?: BoardKingdom): void {
    this.controller.placeHero(heroId, location, owner);
  }

  removeHero(heroId: string): void {
    this.controller.removeHero(heroId);
  }

  setAdversary(id: string, location?: string): void {
    this.controller.selectAdversary(id);
    if (location) this.controller.placeAdversary(location);
  }

  clearAdversary(): void {
    this.controller.clearAdversary();
  }

  moveToken(id: string, location: string): void {
    this.controller.moveToken(id, location);
  }

  addSkull(location: string, n = 1): void {
    this.controller.addSkull(location, n);
    this.reconcileDestroyed(location);
  }

  removeSkull(location: string, n = 1): void {
    this.controller.removeSkull(location, n);
    this.reconcileDestroyed(location);
  }

  setSpaceMarker(location: string, marker: string, on: boolean): void {
    this.controller.setSpaceMarker(location, marker, on);
  }

  /**
   * Keep a building's `destroyed` flag in sync with its skull count — the base game destroys
   * a building at its 4th skull. The board library is a dumb container (it never auto-destroys),
   * so UTDD applies this rule here; removing skulls below the threshold restores it (undo).
   */
  private reconcileDestroyed(location: string): void {
    const state = this.controller.getState();
    if (!state.tokens[buildingTokenId(location)]) return; // not a building space — nothing to destroy
    const building = buildingAt(state, location);
    const skulls = state.tokens[skullTokenId(location)]?.n ?? 0;
    const shouldBeDestroyed = skulls >= SKULLS_TO_DESTROY;
    if (shouldBeDestroyed && !building.destroyed) this.controller.destroyBuilding(location);
    else if (!shouldBeDestroyed && building.destroyed) this.controller.restoreBuilding(location);
  }

  load(state: BoardState): void {
    // applyState is the controller's wholesale commit path; it emits `change`,
    // which our subscription forwards to listeners.
    this.controller.applyState(structuredClone(state));
  }

  dispose(): void {
    this.unsubController();
    this.listeners.clear();
  }

  private emit(): void {
    const state = this.getState();
    for (const l of this.listeners) l(state);
  }
}
