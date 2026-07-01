import { LoadPanel, RelayPanel, GamePanel } from './ui';
import { ThemeToggle } from '@udtc/theme';
import { usePlayerStore } from './store';

export default function App() {
  const scenario = usePlayerStore((s) => s.scenario) as {
    meta?: { title?: string; scenarioVersion?: string };
  } | null;
  const meta = scenario?.meta;

  return (
    <div className="player-layout">
      {/* Top bar — title, scenario meta, switch + theme controls */}
      <div className="player-topbar">
        <span className="title">UltimateDarkTower Player</span>
        {meta?.title && (
          <>
            <span className="subtitle">|</span>
            <span className="subtitle">{meta.title}</span>
            {meta.scenarioVersion && <span className="subtitle">v{meta.scenarioVersion}</span>}
          </>
        )}
        <span style={{ flex: 1 }} />
        <a className="switch-link" href="../creator/">
          Creator →
        </a>
        <ThemeToggle />
      </div>

      {/* Content row — load/relay sidebar + game panel */}
      <div className="player-body">
        <aside className="player-sidebar">
          <LoadPanel />
          <RelayPanel />
        </aside>
        <main className="player-main">
          <GamePanel />
        </main>
      </div>
    </div>
  );
}
