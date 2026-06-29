/**
 * New-game setup wizard (PRD-04 FR-04.1–FR-04.3). The official app does setup, so here the
 * player mirrors it by hand: difficulty, player count, the heroes in play + their home
 * kingdoms, the adversary, the three tiered foes, and the main goal. A seed can pre-fill the
 * adversary / foes / difficulty / player count (FR-04.2).
 *
 * The wizard's output *is* `GameConfig`; on confirm it calls `newGame`, which seeds the
 * tower, board (heroes on their home Citadels), and a player board per hero (FR-04.3).
 */
import { useMemo, useState } from 'react';
import { HEROES, FOES, ADVERSARY_ROSTER } from '@/lib/udtData';
import { useGameStore } from '@/state/gameStore';
import {
  applySeedToConfig,
  createDefaultConfig,
  SeedError,
  type GameConfig,
  type Kingdom,
} from '@/session';

const KINGDOMS: Kingdom[] = ['north', 'east', 'south', 'west'];
const BASE_HEROES = HEROES.filter((h) => h.source === 'base');
const FOES_L2 = FOES.filter((f) => f.level === 2);
const FOES_L3 = FOES.filter((f) => f.level === 3);
const FOES_L4 = FOES.filter((f) => f.level === 4);

/** A sensible pre-filled config so the player can start fast and adjust. */
function initialConfig(): GameConfig {
  return {
    ...createDefaultConfig(),
    playerCount: 1,
    heroes: [{ heroId: BASE_HEROES[0]?.id ?? '', homeKingdom: 'north' }],
    adversary: ADVERSARY_ROSTER[0]?.id ?? null,
    foes: {
      level2: FOES_L2[0]?.id ?? null,
      level3: FOES_L3[0]?.id ?? null,
      level4: FOES_L4[0]?.id ?? null,
    },
    mainGoal: '',
  };
}

/** Grow/shrink the heroes list to `count`, defaulting new rows to the next hero + kingdom. */
function resizeHeroes(heroes: GameConfig['heroes'], count: number): GameConfig['heroes'] {
  const next = heroes.slice(0, count);
  for (let i = heroes.length; i < count; i++) {
    next.push({
      heroId: BASE_HEROES[i % BASE_HEROES.length]?.id ?? '',
      homeKingdom: KINGDOMS[i % 4],
    });
  }
  return next;
}

export function NewGameWizard({ onClose }: { onClose: () => void }) {
  const newGame = useGameStore((s) => s.newGame);
  const [name, setName] = useState('');
  const [config, setConfig] = useState<GameConfig>(initialConfig);
  const [seed, setSeed] = useState('');
  const [seedMsg, setSeedMsg] = useState('');

  const heroNameById = useMemo(() => new Map(HEROES.map((h) => [h.id, h.name])), []);

  const setPlayerCount = (n: number) =>
    setConfig((c) => ({ ...c, playerCount: n, heroes: resizeHeroes(c.heroes, n) }));

  const setHero = (i: number, patch: Partial<GameConfig['heroes'][number]>) =>
    setConfig((c) => ({
      ...c,
      heroes: c.heroes.map((h, idx) => (idx === i ? { ...h, ...patch } : h)),
    }));

  const applySeed = () => {
    try {
      setConfig((c) => {
        const merged = applySeedToConfig(c, seed);
        return { ...merged, heroes: resizeHeroes(c.heroes, merged.playerCount) };
      });
      setSeedMsg('Seed applied — adversary, foes, difficulty & player count filled in.');
    } catch (err) {
      setSeedMsg(err instanceof SeedError ? err.message : 'Could not read that seed.');
    }
  };

  // Validation: every row has a hero, no duplicate heroes, adversary + all three foes chosen.
  const heroIds = config.heroes.map((h) => h.heroId);
  const hasEmptyHero = heroIds.some((id) => !id);
  const hasDupeHero = new Set(heroIds).size !== heroIds.length;
  const foesComplete = config.foes.level2 && config.foes.level3 && config.foes.level4;
  const error = hasEmptyHero
    ? 'Pick a hero for every player.'
    : hasDupeHero
      ? 'Each hero can only be played once.'
      : !config.adversary
        ? 'Choose an adversary.'
        : !foesComplete
          ? 'Choose all three foes (levels 2, 3, 4).'
          : '';

  const start = () => {
    if (error) return;
    newGame(config, name.trim() || undefined);
    onClose();
  };

  return (
    <div className="wizard-backdrop" role="dialog" aria-modal="true" aria-label="New game setup">
      <div className="wizard">
        <header className="wizard-head">
          <h2>New solo game</h2>
          <button className="wizard-x" onClick={onClose} aria-label="Cancel">
            ✕
          </button>
        </header>
        <p className="muted">
          Enter the setup the official app gave you. Base game only (no expansions).
        </p>

        <div className="wizard-body">
          <label>
            Game name (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tuesday campaign"
            />
          </label>

          <h3>Seed (optional)</h3>
          <div className="wizard-seed">
            <input
              value={seed}
              onChange={(e) => setSeed(e.target.value)}
              placeholder="XXXX-XXXX-XXXX"
              spellCheck={false}
            />
            <button onClick={applySeed} disabled={!seed.trim()}>
              Apply seed
            </button>
          </div>
          {seedMsg && <p className="muted wizard-seedmsg">{seedMsg}</p>}

          <h3>Game</h3>
          <div className="wizard-grid2">
            <label>
              Difficulty
              <select
                value={config.difficulty}
                onChange={(e) =>
                  setConfig((c) => ({
                    ...c,
                    difficulty: e.target.value as GameConfig['difficulty'],
                  }))
                }
              >
                <option value="Heroic">Heroic</option>
                <option value="Gritty">Gritty</option>
              </select>
            </label>
            <label>
              Players
              <select
                value={config.playerCount}
                onChange={(e) => setPlayerCount(Number(e.target.value))}
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3>Heroes</h3>
          {config.heroes.map((h, i) => (
            <div className="wizard-hero" key={i}>
              <label>
                Hero {i + 1}
                <select value={h.heroId} onChange={(e) => setHero(i, { heroId: e.target.value })}>
                  {BASE_HEROES.map((hero) => (
                    <option key={hero.id} value={hero.id}>
                      {hero.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Home kingdom
                <select
                  value={h.homeKingdom}
                  onChange={(e) => setHero(i, { homeKingdom: e.target.value as Kingdom })}
                >
                  {KINGDOMS.map((k) => (
                    <option key={k} value={k}>
                      {k}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}

          <h3>Adversary &amp; foes</h3>
          <label>
            Adversary (level 5)
            <select
              value={config.adversary ?? ''}
              onChange={(e) => setConfig((c) => ({ ...c, adversary: e.target.value || null }))}
            >
              {ADVERSARY_ROSTER.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <div className="wizard-grid3">
            <label>
              Level 2 foe
              <select
                value={config.foes.level2 ?? ''}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, foes: { ...c.foes, level2: e.target.value || null } }))
                }
              >
                {FOES_L2.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Level 3 foe
              <select
                value={config.foes.level3 ?? ''}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, foes: { ...c.foes, level3: e.target.value || null } }))
                }
              >
                {FOES_L3.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Level 4 foe
              <select
                value={config.foes.level4 ?? ''}
                onChange={(e) =>
                  setConfig((c) => ({ ...c, foes: { ...c.foes, level4: e.target.value || null } }))
                }
              >
                {FOES_L4.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3>Main goal</h3>
          <label>
            <span className="muted">
              Free text — the base-game main goals aren&apos;t in the libraries.
            </span>
            <input
              value={config.mainGoal}
              onChange={(e) => setConfig((c) => ({ ...c, mainGoal: e.target.value }))}
              placeholder="e.g. Recover the lost relics"
            />
          </label>

          {/* avoid an unused-var lint and give a friendly summary line */}
          <p className="muted">
            {config.heroes.map((h) => heroNameById.get(h.heroId) ?? h.heroId).join(', ')} vs{' '}
            {ADVERSARY_ROSTER.find((a) => a.id === config.adversary)?.name ?? '—'}
          </p>
        </div>

        <footer className="wizard-actions">
          {error && <span className="wizard-error">{error}</span>}
          <span className="wizard-spacer" />
          <button onClick={onClose}>Cancel</button>
          <button className="wizard-start" onClick={start} disabled={Boolean(error)}>
            Start game
          </button>
        </footer>
      </div>
    </div>
  );
}
