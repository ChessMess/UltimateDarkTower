/**
 * App shell (PRD-00 FR-00.8): three panes — tower controls, the shared tower+board
 * 3D/2D stage, and the player board — driven entirely through the game store.
 */
import { TowerBoardStage } from '@/lib/TowerBoardStage';
import { TowerPanel } from '@/features/tower/TowerPanel';
import { BoardPalette } from '@/features/board/BoardPalette';
import { BoardInspector } from '@/features/board/BoardInspector';
import { PlayerBoardPane } from '@/features/player-board/PlayerBoardPane';
import { SessionBar } from '@/features/session/SessionBar';
import { TurnTracker } from '@/features/session/TurnTracker';
import './App.css';

export function App() {
  return (
    <div className="app">
      <header className="app-header">
        <div className="app-title">
          <h1>UltimateDarkTowerDigital</h1>
          <span className="tagline">solo base game · tower + board + player boards</span>
        </div>
        <TurnTracker />
        <SessionBar />
      </header>

      <main className="panes">
        <aside className="pane pane-left">
          <TowerPanel />
          <BoardPalette />
          <BoardInspector />
        </aside>

        <div className="pane pane-stage">
          <TowerBoardStage className="stage" />
        </div>

        <aside className="pane pane-right">
          <PlayerBoardPane />
        </aside>
      </main>
    </div>
  );
}
