import { LoadPanel, RelayPanel, GamePanel } from './ui';
import { ThemeToggle } from '@udtc/theme';

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        fontFamily: 'system-ui, sans-serif',
        background: 'var(--c-bg)',
        color: 'var(--c-text)',
        overflow: 'hidden',
      }}
    >
      {/* Left sidebar — load + relay */}
      <aside
        style={{
          width: 260,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          padding: 16,
          overflowY: 'auto',
          borderRight: '1px solid var(--c-border)',
          background: 'var(--c-surface)',
        }}
      >
        <header style={{ marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--c-text)' }}>
              UDT Player
            </h1>
            <ThemeToggle />
          </div>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: 'var(--c-text-faint)' }}>
            Live table runtime
          </p>
          <a
            href="../creator/"
            style={{
              display: 'inline-block',
              marginTop: 8,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--c-text)',
              textDecoration: 'none',
              padding: '4px 10px',
              border: '1px solid var(--c-border-strong)',
              borderRadius: 6,
            }}
          >
            Creator →
          </a>
        </header>
        <LoadPanel />
        <RelayPanel />
      </aside>

      {/* Main — game panel */}
      <main style={{ flex: 1, padding: 16, overflowY: 'auto', background: 'var(--c-bg)' }}>
        <GamePanel />
      </main>
    </div>
  );
}
