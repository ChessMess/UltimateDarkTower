/**
 * Tower control panel (PRD-01). UTDD is a software stand-in for the physical tower, so it
 * surfaces only the two actions a player physically performs on the real tower:
 *
 *   • Drop a skull  — the mandatory end-of-turn action; increments the skull-drop count.
 *   • Break a seal  — snap a seal to reveal its glyph (tap again to undo a mistake).
 *
 * Drum rotation, lights, and sounds are driven by the official app, not the player, so they
 * are intentionally absent here; the bridge (PRD-05, see `BridgePanel`) drives them through
 * the same `TowerStateSource`. Every action flows through the store → source → shared 3D scene.
 */
import { useCollectMode, useTowerActions, useTowerState } from '@/lib/hooks';
import type { SealRef } from '@/sources/types';

const SIDES = ['north', 'east', 'south', 'west'] as const;
const LEVELS = ['top', 'middle', 'bottom'] as const;
const COLLECT_MODES = [
  { value: 'auto', label: 'Auto' },
  { value: 'click', label: 'Click' },
  { value: 'off', label: 'Off' },
] as const;

const sealKey = (level: string, side: string) => `${level}:${side}`;

export function TowerPanel() {
  const { skullDropCount, brokenSeals } = useTowerState();
  const { dropSkull, breakSeal, restoreSeal } = useTowerActions();
  const { mode, setMode } = useCollectMode();

  const broken = new Set(brokenSeals.map((s) => sealKey(s.level, s.side)));
  const toggleSeal = (seal: SealRef) =>
    broken.has(sealKey(seal.level, seal.side)) ? restoreSeal(seal) : breakSeal(seal);

  return (
    <section className="panel">
      <h2>Tower</h2>

      <div className="stat">
        <span className="stat-label">Skulls dropped</span>
        <span className="stat-value">{skullDropCount}</span>
      </div>
      <button className="tower-drop" onClick={dropSkull}>
        Drop skull
      </button>

      <h3>Collecting fallen skulls</h3>
      <p className="muted">
        Auto sweeps them off the board floor; Click collects one at a time; Off leaves them for the
        assign dialog's pool stepper.
      </p>
      <div className="collect-mode-grid">
        {COLLECT_MODES.map((m) => (
          <button
            key={m.value}
            className={`seal-btn${mode === m.value ? ' is-broken' : ''}`}
            aria-pressed={mode === m.value}
            onClick={() => setMode(m.value)}
          >
            {m.label}
          </button>
        ))}
      </div>

      <h3>Seals ({brokenSeals.length} broken)</h3>
      <p className="muted">Tap a seal to break it and reveal its glyph. Tap again to undo.</p>
      <div className="seal-grid">
        {LEVELS.map((level) =>
          SIDES.map((side) => {
            const isBroken = broken.has(sealKey(level, side));
            return (
              <button
                key={`${level}-${side}`}
                className={`seal-btn${isBroken ? ' is-broken' : ''}`}
                title={`${level} ${side}${isBroken ? ' — broken' : ''}`}
                aria-pressed={isBroken}
                onClick={() => toggleSeal({ level, side })}
              >
                {level[0].toUpperCase()}
                {side[0].toUpperCase()}
              </button>
            );
          }),
        )}
      </div>

      <p className="muted tower-note">
        Drums, lights &amp; sounds are driven by the official app. Connect it below to have them
        animate here; otherwise mirror the app by hand.
      </p>
    </section>
  );
}
