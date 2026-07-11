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
import { ManualBoardSource } from '@/sources/ManualBoardSource';
import { useGameStore } from '@/state/gameStore';

const BASE = import.meta.env.BASE_URL; // ends with '/'

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

    const stage = new BoardStageView({
      container,
      assetBaseUrl: `${BASE}assets/tokens/`,
      boardImageUrl: `${BASE}assets/board.png`,
      modelUrl: `${BASE}assets/tower.glb`,
      editingUI: false,
      // The 3D tower loads lazily; once it's on, paint the current state into it.
      onTowerToggle: (enabled) => {
        if (!enabled) return;
        const view = stageRef.current?.tower3D;
        view?.applyState(towerSource.getState(), true);
        view?.applySeals(towerSource.getBrokenSeals());
      },
    });
    stageRef.current = stage;

    /** Push the current tower state + broken seals into the 3D tower (if it's mounted). */
    const paintTower = (state: TowerState) => {
      const view = stage.tower3D; // TowerRenderView | null (null until the lazy 3D loads)
      if (!view) return;
      view.applyState(state);
      view.applySeals(towerSource.getBrokenSeals());
    };

    const boardSource = new ManualBoardSource(stage.controller);
    useGameStore.getState().registerBoard(boardSource, stage.selection, stage.locationPick);

    // Reflect every tower mutation (skull drop, seal break/restore, load) in 3D.
    const towerUnsub = towerSource.subscribe(paintTower);

    onReady?.(stage);

    return () => {
      towerUnsub();
      useGameStore.getState().unregisterBoard();
      stage.dispose();
      stageRef.current = null;
    };
    // Mount once; intentionally no deps on onReady to avoid recreating the scene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} className={className} />;
}
