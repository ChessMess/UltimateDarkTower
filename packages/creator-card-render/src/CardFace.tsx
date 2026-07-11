import type { CSSProperties, ReactNode } from 'react';
import { CARD_W, CARD_H, type CardFaceData } from './types';

const DEFAULT_ACCENT = '#7a5cff';
const CRITICAL = '#d64545';

interface CardFaceProps {
  data: CardFaceData;
  /** display width in px; card scales to width × width·(1050/750) */
  width: number;
  /** overlay slot rendered above the (scaled) card in DISPLAY-px coordinates — e.g. step pips or an
   * improve button in the player */
  children?: ReactNode;
}

function monogram(name: string): string {
  const t = (name || '?').trim();
  return t ? t[0].toUpperCase() : '?';
}

/** placeholder art window: accent gradient + large monogram, or the resolved art image if present */
function artWindow(data: CardFaceData, style: CSSProperties): ReactNode {
  const accent = data.accent || DEFAULT_ACCENT;
  if (data.artUrl) {
    return (
      <div style={{ ...style, overflow: 'hidden' }}>
        <img
          src={data.artUrl}
          alt={data.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    );
  }
  return (
    <div
      style={{
        ...style,
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 38%, ${accent}44, transparent 62%), linear-gradient(160deg, #1b1626, #0e0b16)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: 240,
          fontWeight: 800,
          color: `${accent}55`,
          fontFamily: 'Georgia, "Times New Roman", serif',
          lineHeight: 1,
          userSelect: 'none',
        }}
      >
        {monogram(data.name)}
      </span>
    </div>
  );
}

function criticalRibbon(): ReactNode {
  return (
    <div
      className="udtc-card-critical-ribbon"
      style={{
        position: 'absolute',
        top: 46,
        right: -70,
        width: 300,
        transform: 'rotate(45deg)',
        background: CRITICAL,
        color: '#fff',
        textAlign: 'center',
        fontSize: 30,
        fontWeight: 800,
        letterSpacing: 3,
        padding: '10px 0',
        boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
      }}
    >
      CRITICAL
    </div>
  );
}

function tagPill(tag: string, accent: string): ReactNode {
  return (
    <span
      style={{
        display: 'inline-block',
        alignSelf: 'flex-start',
        border: `3px solid ${accent}`,
        color: accent,
        borderRadius: 999,
        padding: '6px 22px',
        fontSize: 28,
        fontWeight: 700,
        letterSpacing: 1,
        textTransform: 'uppercase',
      }}
    >
      {tag}
    </span>
  );
}

/* ---- template renderers (all lay out at 750×1050) ---- */

function classicFace(data: CardFaceData): ReactNode {
  const accent = data.accent || DEFAULT_ACCENT;
  const border = data.critical ? CRITICAL : accent;
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        boxSizing: 'border-box',
        border: `14px solid ${border}`,
        borderRadius: 44,
        background: 'var(--c-surface-raised, #fff)',
        color: 'var(--c-text, #1e293b)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: border,
          color: '#fff',
          fontSize: 52,
          fontWeight: 800,
          textAlign: 'center',
          padding: '26px 24px',
          letterSpacing: 0.5,
        }}
      >
        {data.name}
      </div>
      {artWindow(data, { height: 470, flex: '0 0 auto' })}
      <div
        style={{
          flex: 1,
          padding: '26px 34px',
          display: 'flex',
          flexDirection: 'column',
          gap: 18,
          minHeight: 0,
        }}
      >
        {data.tag ? tagPill(data.tag, accent) : null}
        {data.text ? (
          <div style={{ fontSize: 34, lineHeight: 1.35, color: 'var(--c-text-2, #374151)' }}>
            {data.text}
          </div>
        ) : null}
        {data.flavor ? (
          <div
            style={{
              marginTop: 'auto',
              fontStyle: 'italic',
              fontSize: 26,
              color: 'var(--c-text-muted, #6b7280)',
            }}
          >
            {data.flavor}
          </div>
        ) : null}
      </div>
      {data.critical ? criticalRibbon() : null}
    </div>
  );
}

function fullArtFace(data: CardFaceData): ReactNode {
  const accent = data.accent || DEFAULT_ACCENT;
  const border = data.critical ? CRITICAL : accent;
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        boxSizing: 'border-box',
        border: `12px solid ${border}`,
        borderRadius: 44,
        overflow: 'hidden',
        position: 'relative',
        fontFamily: 'system-ui, sans-serif',
        background: '#0e0b16',
      }}
    >
      {artWindow(data, { position: 'absolute', inset: 0, height: '100%' })}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          padding: '120px 34px 34px',
          background: 'linear-gradient(to top, rgba(6,4,12,0.94) 30%, rgba(6,4,12,0.0))',
          color: '#fff',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        {data.tag ? tagPill(data.tag, accent) : null}
        <div style={{ fontSize: 56, fontWeight: 800, lineHeight: 1.05 }}>{data.name}</div>
        {data.text ? <div style={{ fontSize: 32, lineHeight: 1.3 }}>{data.text}</div> : null}
        {data.flavor ? (
          <div style={{ fontStyle: 'italic', fontSize: 26, opacity: 0.85 }}>{data.flavor}</div>
        ) : null}
      </div>
      {data.critical ? criticalRibbon() : null}
    </div>
  );
}

function textOnlyFace(data: CardFaceData): ReactNode {
  const accent = data.accent || DEFAULT_ACCENT;
  const border = data.critical ? CRITICAL : accent;
  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        boxSizing: 'border-box',
        border: `10px double ${border}`,
        borderRadius: 44,
        background: 'var(--c-surface-raised, #fff)',
        color: 'var(--c-text, #1e293b)',
        position: 'relative',
        overflow: 'hidden',
        fontFamily: 'Georgia, "Times New Roman", serif',
        padding: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 34,
      }}
    >
      <div
        style={{
          fontSize: 68,
          fontWeight: 800,
          textAlign: 'center',
          color: border,
          borderBottom: `4px solid ${accent}55`,
          paddingBottom: 26,
        }}
      >
        {data.name}
      </div>
      {data.tag ? <div style={{ alignSelf: 'center' }}>{tagPill(data.tag, accent)}</div> : null}
      {data.text ? (
        <div style={{ fontSize: 42, lineHeight: 1.45, flex: 1 }}>{data.text}</div>
      ) : (
        <div style={{ flex: 1 }} />
      )}
      {data.flavor ? (
        <div style={{ fontStyle: 'italic', fontSize: 30, color: 'var(--c-text-muted, #6b7280)' }}>
          {data.flavor}
        </div>
      ) : null}
      {data.critical ? criticalRibbon() : null}
    </div>
  );
}

/** Render a single card front, scaled to `width`. The card is authored at 750×1050 and scaled via a
 * transform wrapper so every template shares one coordinate system. `children` overlay in display px. */
export function CardFace({ data, width, children }: CardFaceProps) {
  const scale = width / CARD_W;
  const outer: CSSProperties = {
    position: 'relative',
    width,
    height: Math.round(CARD_H * scale),
  };
  const inner: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: CARD_W,
    height: CARD_H,
    transform: `scale(${scale})`,
    transformOrigin: 'top left',
  };
  const template = data.template || 'classic';
  const face =
    template === 'fullArt'
      ? fullArtFace(data)
      : template === 'textOnly'
        ? textOnlyFace(data)
        : classicFace(data);
  return (
    <div className={`udtc-card${data.critical ? ' udtc-card-critical' : ''}`} style={outer}>
      <div style={inner}>{face}</div>
      {children != null ? (
        <div style={{ position: 'absolute', inset: 0 }}>{children}</div>
      ) : null}
    </div>
  );
}
