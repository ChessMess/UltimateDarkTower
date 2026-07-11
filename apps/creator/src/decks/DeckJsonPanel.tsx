// DeckJsonPanel — right-sidebar replacement for InspectorPanel while centerView === 'decks'.
// Read-only: shows the JSON of whatever DeckBuilderView currently has selected (mirrored via the
// store's deckSelection/deckCardKey), split into a "Selected Card" panel over a "Deck" panel.

import { useCreatorStore } from '../store';
import { resolveSelectedDeck, resolveSelectedCard } from './shared';

const panelStyle = {
  width: 260,
  background: 'var(--c-surface)',
  borderLeft: '1px solid var(--c-border)',
  display: 'flex',
  flexDirection: 'column' as const,
  fontSize: 12,
  height: '100%',
};

const sectionStyle = {
  display: 'flex',
  flexDirection: 'column' as const,
  flex: 1,
  minHeight: 0,
  borderBottom: '1px solid var(--c-border)',
};

const headerStyle = {
  padding: '10px 12px 6px',
  fontWeight: 700,
  fontSize: 11,
  letterSpacing: '0.08em',
  color: 'var(--c-text-muted)',
  textTransform: 'uppercase' as const,
  flex: '0 0 auto',
};

const emptyStyle = {
  padding: '0 12px 12px',
  color: 'var(--c-text-faint)',
  fontStyle: 'italic' as const,
  fontSize: 11,
};

const preStyle = {
  margin: '0 12px 12px',
  padding: 8,
  fontSize: 10,
  background: 'var(--c-surface-raised)',
  borderRadius: 4,
  overflow: 'auto' as const,
  flex: 1,
  minHeight: 0,
  color: 'var(--c-text)',
};

export function DeckJsonPanel() {
  const schemaDoc = useCreatorStore((s) => s.schemaDoc);
  const deckSelection = useCreatorStore((s) => s.deckSelection);
  const deckCardKey = useCreatorStore((s) => s.deckCardKey);

  if (!schemaDoc) {
    return (
      <div style={panelStyle}>
        <div style={headerStyle}>Deck JSON</div>
        <div style={{ padding: 12, color: 'var(--c-text-faint)', fontStyle: 'italic', fontSize: 11 }}>
          No scenario loaded
        </div>
      </div>
    );
  }

  const selectedCard = resolveSelectedCard(schemaDoc, deckSelection, deckCardKey);
  const selectedDeck = resolveSelectedDeck(schemaDoc, deckSelection);

  return (
    <div style={panelStyle}>
      <div style={sectionStyle}>
        <div style={headerStyle}>Selected Card</div>
        {selectedCard ? (
          <pre style={preStyle}>{JSON.stringify(selectedCard, null, 2)}</pre>
        ) : (
          <div style={emptyStyle}>No card selected</div>
        )}
      </div>
      <div style={sectionStyle}>
        <div style={headerStyle}>Deck{deckSelection ? `: ${deckSelection.id}` : ''}</div>
        {selectedDeck ? (
          <pre style={preStyle}>{JSON.stringify(selectedDeck, null, 2)}</pre>
        ) : (
          <div style={emptyStyle}>No deck selected</div>
        )}
      </div>
    </div>
  );
}
