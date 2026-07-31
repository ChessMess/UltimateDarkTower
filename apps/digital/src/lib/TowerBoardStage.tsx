/**
 * React wrapper around UDT Board's imperative `BoardStageView` (PRD-00 FR-00.6).
 *
 * The view owns its own canvas + render loop; React just owns *where* it mounts.
 * We create it once on mount, register a ManualBoardSource (built over the stage's
 * controller) into the game store, and dispose on unmount. It is intentionally NOT
 * recreated on re-render.
 *
 * It also drives the tower side of the shared 3D scene (PRD-01): the store's
 * `TowerStateSource` is pushed into the stage's `TowerRenderView` so drum positions and
 * broken-seal glyphs are reflected in 3D. The board plugin and the tower share one scene.
 */
import { useEffect, useRef } from 'react';
import { BoardStageView } from 'ultimatedarktowerboard/stage';
import type { TowerState } from 'ultimatedarktower';
import type { Tower3DView } from 'ultimatedarktowerdisplay';
import type { PhysicsConfig, SkullPhysicsHandle } from 'ultimatedarktowerdisplay/physics';
import { ManualBoardSource } from '@/sources/ManualBoardSource';
import { useGameStore } from '@/state/gameStore';
import { syncSkulls } from './skullSync';

const BASE = import.meta.env.BASE_URL; // ends with '/'

const PHYSICS_CONFIG = {
  skull: { modelUrl: `${BASE}assets/tokens/markers/skull.glb`, colliderShape: 'hull' },
} as const satisfies PhysicsConfig;

export interface TowerBoardStageProps {
  /** Called once the stage instance exists (e.g. to drive the tower view in PRD-01). */
  onReady?: (stage: BoardStageView) => void;
  className?: string;
}

export function TowerBoardStage({ onReady, className }: TowerBoardStageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<BoardStageView | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const towerSource = useGameStore.getState().towerSource;

    // Skull physics is attached lazily, keyed on whichever `Tower3DView` is
    // currently live. Pop Out / Pop In rebuilds the 3D view behind the scenes
    // (see BoardStageView's create3D/dispose3D), which detaches any
    // previously-attached scene plugin — so this re-attaches by view identity
    // on the next tower paint rather than attaching once and going stale.
    let physics: SkullPhysicsHandle | null = null;
    let physicsView: Tower3DView | null = null;
    let prevSkulls = 0;
    let attaching = false;

    const ensurePhysics = async (): Promise<void> => {
      const view = stageRef.current?.tower3D?.view3D ?? null;
      if (!view) {
        physics?.dispose();
        physics = null;
        physicsView = null;
        return;
      }
      if (view === physicsView || attaching) return;
      attaching = true;
      try {
        // Dynamic: a static import would pull Display + the physics module into
        // the main bundle and defeat the lazy 3D chunk BoardStageView exists to
        // preserve. (Rapier itself is dynamic-imported inside PhysicsManager
        // .init() either way.)
        const { attachSkullPhysics } = await import('ultimatedarktowerdisplay/physics');
        const live = stageRef.current?.tower3D?.view3D ?? null; // may have changed mid-await
        if (!live) return;
        physics?.dispose();
        physics = attachSkullPhysics(live, PHYSICS_CONFIG);
        physicsView = live;
        prevSkulls = 0; // fresh scene — replay every skull dropped so far
        prevSkulls = syncSkulls(physics, prevSkulls, towerSource.getSkullDropCount());
      } finally {
        attaching = false;
      }
    };

    const stage = new BoardStageView({
      container,
      assetBaseUrl: `${BASE}assets/tokens/`,
      boardImageUrl: `${BASE}assets/board.png`,
      modelUrl: `${BASE}assets/tower.glb`,
      editingUI: false,
      // The 3D tower loads lazily; once it's on, paint the current state into it.
      onTowerToggle: (enabled) => {
        if (enabled) {
          const view = stageRef.current?.tower3D;
          view?.applyState(towerSource.getState(), true);
          view?.applySeals(towerSource.getBrokenSeals());
        }
        void ensurePhysics();
      },
    });
    stageRef.current = stage;

    /** Push the current tower state + broken seals into the 3D tower (if it's mounted). */
    const paintTower = (state: TowerState) => {
      const view = stage.tower3D; // TowerRenderView | null (null until the lazy 3D loads)
      if (!view) return;
      view.applyState(state);
      view.applySeals(towerSource.getBrokenSeals());

      void ensurePhysics(); // no-op once bound to this view; self-heals after a pop-out
      if (physics && physicsView === view.view3D) {
        prevSkulls = syncSkulls(physics, prevSkulls, towerSource.getSkullDropCount());
      }
    };

    const boardSource = new ManualBoardSource(stage.controller);
    useGameStore.getState().registerBoard(boardSource, stage.selection, stage.locationPick);

    // Reflect every tower mutation (skull drop, seal break/restore, load) in 3D.
    const towerUnsub = towerSource.subscribe(paintTower);

    onReady?.(stage);

    return () => {
      towerUnsub();
      useGameStore.getState().unregisterBoard();
      physics?.dispose();
      stage.dispose();
      stageRef.current = null;
    };
    // Mount once; intentionally no deps on onReady to avoid recreating the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
