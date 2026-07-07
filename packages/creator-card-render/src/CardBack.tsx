import type { CSSProperties } from 'react';
import { CARD_W, CARD_H } from './types';

const DEFAULT_ACCENT = '#7a5cff';

interface CardBackProps {
  /** resolved back image URL (data: URL or http URL); procedural fallback if absent */
  backUrl?: string;
  /** hex accent color for the border / procedural tint */
  accent?: string;
  /** display width in px */
  width: number;
  /** optional centered label (e.g. deck name) drawn over the back */
  label?: string;
}

/** Render a card BACK, scaled to `width`. When no image is supplied it falls back to the same
 * repeating-gradient pattern the player used for legacy face-down cards, so legacy decks look
 * continuous. */
export function CardBack({ backUrl, accent, width, label }: CardBackProps) {
  const height = Math.round(width * (CARD_H / CARD_W));
  const border = Math.max(2, Math.round(width * 0.03));
  const radius = Math.round(width * 0.058);
  const ac = accent || DEFAULT_ACCENT;
  const base: CSSProperties = {
    width,
    height,
    borderRadius: radius,
    boxSizing: 'border-box',
    border: `${border}px solid ${ac}`,
    overflow: 'hidden',
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const procedural: CSSProperties = {
    ...base,
    background:
      'repeating-linear-gradient(45deg, var(--c-surface-raised), var(--c-surface-raised) 6px, var(--c-surface) 6px, var(--c-surface) 12px)',
  };
  return (
    <div className="udtc-card" style={backUrl ? base : procedural}>
      {backUrl ? (
        <img
          src={backUrl}
          alt={label || 'card back'}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      ) : null}
      {label ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            padding: `${Math.round(width * 0.05)}px ${Math.round(width * 0.06)}px`,
            background: 'linear-gradient(to top, rgba(6,4,12,0.82), rgba(6,4,12,0))',
            color: '#fff',
            textAlign: 'center',
            fontSize: Math.max(11, Math.round(width * 0.075)),
            fontWeight: 700,
            letterSpacing: 1,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}
