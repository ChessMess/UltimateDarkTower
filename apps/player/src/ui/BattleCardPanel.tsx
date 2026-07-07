// BattleCardPanel — the interactive card-ladder battle screen (schema 0.4.2). Renders exclusively
// from the engine's BattlePromptPayload (store.battlePrompt) + the current awaiting request, so it
// never reads engine internals. Shows the foe deck as face-down backs, reveals cards one at a time,
// lets the player spend Advantages to climb a card's improvement ladder, then resolve it.

import { handleInput } from '../game';
import { usePlayerStore } from '../store';
import type { BattlePromptCard } from '../types';

export function BattleCardPanel() {
  const awaiting = usePlayerStore((s) => s.awaiting);
  const phase = usePlayerStore((s) => s.phase);
  const battle = usePlayerStore((s) => s.battlePrompt);
  if (phase !== 'playing' || !battle) return null;
  if (awaiting?.id !== 'battleCard' && awaiting?.id !== 'battleHeroTarget') return null;

  const heroPick = awaiting.id === 'battleHeroTarget' && battle.heroChoice;

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={headerRow}>
        <span style={awaitLabel}>
          {battle.isAdversary ? 'Adversary battle' : 'Battle'} — {battle.foeId}
        </span>
        <span style={counterStyle}>
          Advantages Spent: {battle.advantagesSpent} / {battle.advantagesMax}
        </span>
      </div>

      <div style={{ fontSize: 11, color: 'var(--c-text-muted)', marginBottom: 8 }}>
        Pick {battle.handSize} card{battle.handSize === 1 ? '' : 's'} from the deck of{' '}
        {battle.deckSize}. Resolve each before revealing the next.
      </div>

      {/* the drawn hand: face-down backs until revealed, then the ladder card */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        {battle.cards.map((c, i) => (
          <BattleCardView
            key={i}
            card={c}
            active={i === battle.revealedCount - 1 && !c.resolved}
            canReveal={battle.canReveal && !heroPick}
            canImprove={battle.canImprove && i === battle.revealedCount - 1 && !heroPick}
          />
        ))}
        {/* remaining face-down backs from the wider deck, for the "pick from a deck" feel */}
        {Array.from({ length: Math.max(0, battle.deckSize - battle.cards.length) }).map((_, i) => (
          <div key={`back-${i}`} style={{ ...cardBase, ...cardBack, opacity: 0.4 }} />
        ))}
      </div>

      {heroPick ? (
        <div>
          <div style={awaitLabel}>{battle.heroChoice!.text}:</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {battle.heroChoice!.candidates.map((h) => (
              <button
                key={h.heroId}
                style={{ ...btn, background: 'var(--c-primary)', color: '#fff', borderColor: 'var(--c-primary)' }}
                onClick={() =>
                  handleInput({ requestId: 'battleHeroTarget', value: { heroId: h.heroId }, kind: 'decision' })
                }
              >
                {h.heroId}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            style={{ ...btn, opacity: battle.canReveal ? 1 : 0.4 }}
            disabled={!battle.canReveal}
            onClick={() => handleInput({ requestId: 'battleCard', value: { reveal: true }, kind: 'decision' })}
          >
            Reveal next card
          </button>
          <button
            style={{ ...btn, background: 'var(--c-success)', color: '#fff', borderColor: 'var(--c-success)', opacity: battle.canResolve ? 1 : 0.4 }}
            disabled={!battle.canResolve}
            onClick={() => handleInput({ requestId: 'battleCard', value: { resolve: true }, kind: 'decision' })}
          >
            Resolve card
          </button>
          {battle.canRetreat && (
            <button
              style={btn}
              onClick={() => handleInput({ requestId: 'battleCard', value: { retreat: true }, kind: 'decision' })}
            >
              Retreat
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BattleCardView({
  card,
  active,
  canReveal,
  canImprove,
}: {
  card: BattlePromptCard;
  active: boolean;
  canReveal: boolean;
  canImprove: boolean;
}) {
  if (!card.revealed) {
    return (
      <button
        style={{ ...cardBase, ...cardBack, cursor: canReveal ? 'pointer' : 'default' }}
        disabled={!canReveal}
        onClick={() => canReveal && handleInput({ requestId: 'battleCard', value: { reveal: true }, kind: 'decision' })}
        aria-label="face-down battle card"
      />
    );
  }
  const face: React.CSSProperties = {
    ...cardBase,
    ...(card.critical ? cardCritical : cardFace),
    ...(card.resolved ? { opacity: 0.5 } : {}),
    ...(active ? { boxShadow: '0 0 0 2px var(--c-primary)' } : {}),
  };
  return (
    <div style={face}>
      {card.critical && <div style={critRibbon}>CRITICAL HIT!</div>}
      <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 2 }}>{card.name}</div>
      <div style={{ fontSize: 10, color: 'var(--c-text-muted)', marginBottom: 6 }}>{card.advantage}</div>
      <div style={{ fontSize: 11, flex: 1 }}>{card.text}</div>
      {/* step pips */}
      <div style={{ display: 'flex', gap: 3, margin: '6px 0' }}>
        {Array.from({ length: card.stepCount }).map((_, i) => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: i <= card.step ? 'var(--c-primary)' : 'var(--c-border-strong)',
            }}
          />
        ))}
      </div>
      {!card.resolved && (
        <button
          style={{ ...improveBtn, opacity: canImprove ? 1 : 0.35 }}
          disabled={!canImprove}
          title={card.nextText ? `Improve → ${card.nextText}` : 'Cannot improve'}
          onClick={() => canImprove && handleInput({ requestId: 'battleCard', value: { improve: true }, kind: 'decision' })}
        >
          ▲ Improve
        </button>
      )}
    </div>
  );
}

// ---- styles ----
const awaitLabel: React.CSSProperties = { fontSize: 12, color: 'var(--c-text-muted)', fontWeight: 600 };
const headerRow: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 };
const counterStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--c-text-2)' };
const btn: React.CSSProperties = {
  padding: '6px 14px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 6,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 13,
  cursor: 'pointer',
  fontWeight: 600,
};
const cardBase: React.CSSProperties = {
  width: 108,
  minHeight: 150,
  borderRadius: 8,
  padding: 8,
  display: 'flex',
  flexDirection: 'column',
  border: '1px solid var(--c-border-strong)',
  boxSizing: 'border-box',
};
const cardBack: React.CSSProperties = {
  background: 'repeating-linear-gradient(45deg, var(--c-surface-raised), var(--c-surface-raised) 6px, var(--c-surface) 6px, var(--c-surface) 12px)',
};
const cardFace: React.CSSProperties = { background: 'var(--c-surface-raised)', color: 'var(--c-text)' };
const cardCritical: React.CSSProperties = { background: 'var(--c-surface-raised)', color: 'var(--c-text)', border: '2px solid var(--c-danger)' };
const critRibbon: React.CSSProperties = {
  fontSize: 9,
  fontWeight: 800,
  letterSpacing: 0.5,
  color: 'var(--c-danger)',
  marginBottom: 4,
};
const improveBtn: React.CSSProperties = {
  padding: '3px 6px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 5,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 11,
  cursor: 'pointer',
  fontWeight: 600,
};
