/**
 * Tower control panel (PRD-01). UTDD is a software stand-in for the physical tower, so it
 * surfaces only the two actions a player physically performs on the real tower:
 *
 *   • Drop a skull  — the mandatory end-of-turn action; increments the skull-drop count.
 *   • Break a seal  — snap a seal to reveal its glyph (tap again to undo a mistake).
 *
 * Drum rotation, lights, and sounds are driven by the official app, not the player, so they
 * are intentionally absent here; the future bridge (PRD-05) will drive them through the same
 * `TowerStateSource`. Every action flows through the store → source → shared 3D scene.
 */
import { useTowerActions, useTowerState } from '@/lib/hooks';
import type { SealRef } from '@/sources/types';

const SIDES = ['north', 'east', 'south', 'west'] as const;
const LEVELS = ['top', 'middle', 'bottom'] as const;

const sealKey = (level: string, side: string) => `${level}:${side}`;

export function TowerPanel() {
  const { skullDropCount, brokenSeals } = useTowerState();
  const { dropSkull, breakSeal, restoreSeal } = useTowerActions();

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
        Drums, lights &amp; sounds are driven by the official app — they’ll animate here once the
        bridge (PRD-05) is connected.
      </p>
    </section>
  );
}
