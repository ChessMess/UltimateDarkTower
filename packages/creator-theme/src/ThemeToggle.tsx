import { useTheme, type ThemeMode } from './useTheme';

const MODES: { value: ThemeMode; label: string }[] = [
  { value: 'system', label: 'Auto' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ThemeToggle() {
  const [mode, set] = useTheme();

  return (
    <div
      role="group"
      aria-label="Color theme"
      style={{
        display: 'inline-flex',
        border: '1px solid var(--c-border-strong)',
        borderRadius: 6,
        overflow: 'hidden',
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {MODES.map((m) => (
        <button
          key={m.value}
          onClick={() => set(m.value)}
          aria-pressed={mode === m.value}
          style={{
            padding: '3px 9px',
            border: 'none',
            borderRight: m.value !== 'dark' ? '1px solid var(--c-border-strong)' : 'none',
            cursor: 'pointer',
            background: mode === m.value ? 'var(--c-primary)' : 'transparent',
            color: mode === m.value ? 'var(--c-primary-fg)' : 'var(--c-topbar-muted)',
            transition: 'background 0.1s, color 0.1s',
          }}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
