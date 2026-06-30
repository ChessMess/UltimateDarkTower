import { LoadPanel, RelayPanel, GamePanel } from './ui';

export default function App() {
  return (
    <div
      style={{
        display: 'flex',
        height: '100dvh',
        fontFamily: 'system-ui, sans-serif',
        background: '#F1F5F9',
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
          borderRight: '1px solid #E2E8F0',
          background: '#F8FAFC',
        }}
      >
        <header style={{ marginBottom: 4 }}>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1E293B' }}>
            UDT Player
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#94A3B8' }}>
            Live table runtime
          </p>
        </header>
        <LoadPanel />
        <RelayPanel />
      </aside>

      {/* Main — game panel */}
      <main style={{ flex: 1, padding: 16, overflowY: 'auto' }}>
        <GamePanel />
      </main>
    </div>
  );
}
