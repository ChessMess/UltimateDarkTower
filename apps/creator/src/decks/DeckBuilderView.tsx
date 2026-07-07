// DeckBuilderView — the first-class deck builder (center 'Decks' view). 3-zone layout: deck list rail
// · card grid · card editor + live preview. Owns selection + all edit→store wiring (updateBattleDefs /
// updateLibraryDecks / updateLibraryCards / updateResourceImage / updateFoeBattleDefId — every mutator
// revalidates, so deck-edit L1 errors surface in the Problems panel and block export like any layer).

import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import '@udtc/card-render/card.css';
import { useCreatorStore } from '../store';
import { DeckListRail } from './DeckListRail';
import { DeckHeader } from './DeckHeader';
import { CardGrid, type CardTile } from './CardGrid';
import { CardEditorPanel } from './CardEditorPanel';
import { AssetManagerDialog } from './AssetManagerDialog';
import { ConfirmDialog } from '../components/ConfirmDialog';
import {
  isLegacyBattleDeck,
  libraryOf,
  imagesOf,
  ladderToFace,
  genericToFace,
  type Appearance,
  type BattleDeck,
  type GenericDeck,
  type GenericCard,
  type LadderCard,
  type DeckSelection,
} from './shared';

const blankLadderCard = (): LadderCard => ({ name: 'New Card', advantage: 'Melee', steps: [{ text: '' }] });

// Destructive actions awaiting ConfirmDialog approval — deletes autosave in ~800ms with no undo.
type PendingDelete = { type: 'deck'; sel: DeckSelection } | { type: 'card' };

function uniqueKey(base: string, taken: Record<string, unknown>): string {
  let id = base || 'card';
  let i = 2;
  while (taken[id]) id = `${base}-${i++}`;
  return id;
}

export function DeckBuilderView() {
  const schemaDoc = useCreatorStore((s) => s.schemaDoc);
  const updateBattleDefs = useCreatorStore((s) => s.updateBattleDefs);
  const updateLibraryDecks = useCreatorStore((s) => s.updateLibraryDecks);
  const updateLibraryCards = useCreatorStore((s) => s.updateLibraryCards);
  const updateResourceImage = useCreatorStore((s) => s.updateResourceImage);
  const updateFoeBattleDefId = useCreatorStore((s) => s.updateFoeBattleDefId);
  const setDeckSelection = useCreatorStore((s) => s.setDeckSelection);
  const setDeckCardKey = useCreatorStore((s) => s.setDeckCardKey);

  const [selection, setSelection] = useState<DeckSelection | null>(null);
  const [cardKey, setCardKey] = useState<string | null>(null);
  const [assetOpen, setAssetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<PendingDelete | null>(null);

  // Mirror local selection into the store (post-render, not during render) so the right-sidebar
  // DeckJsonPanel can display it. This component remains the sole owner/writer of the selection.
  useEffect(() => {
    setDeckSelection(selection);
  }, [selection, setDeckSelection]);
  useEffect(() => {
    setDeckCardKey(cardKey);
  }, [cardKey, setDeckCardKey]);

  if (!schemaDoc) {
    return <div style={{ padding: 24, color: 'var(--c-text-muted)' }}>Load a scenario to build decks.</div>;
  }

  const library = libraryOf(schemaDoc);
  const battleDefs = (library.battleDefs as Record<string, BattleDeck> | undefined) ?? {};
  const decks = (library.decks as Record<string, GenericDeck> | undefined) ?? {};
  const cards = (library.cards as Record<string, GenericCard> | undefined) ?? {};
  const foes = (library.foes as Record<string, { battleDefId?: string }> | undefined) ?? {};
  const images = imagesOf(schemaDoc);

  const battleIds = Object.keys(battleDefs);
  const cardDeckIds = Object.keys(decks);
  const legacyBattleIds = new Set(battleIds.filter((id) => isLegacyBattleDeck(battleDefs[id])));
  const foeIds = Object.keys(foes);

  const commitBattle = (next: Record<string, BattleDeck>) => updateBattleDefs(next as Record<string, unknown>);
  const commitDecks = (next: Record<string, GenericDeck>) => updateLibraryDecks(next as Record<string, unknown>);
  const commitCards = (next: Record<string, GenericCard>) => updateLibraryCards(next as Record<string, unknown>);

  const select = (sel: DeckSelection) => {
    setSelection(sel);
    if (sel.kind === 'battle') {
      const deck = battleDefs[sel.id];
      setCardKey((deck.cards?.length ?? 0) > 0 ? '0' : null);
    } else {
      const deck = decks[sel.id];
      setCardKey(deck.cards && deck.cards.length > 0 ? deck.cards[0].cardId : null);
    }
  };

  // Keep selection valid & non-null whenever decks exist (rail order: battle decks, then card
  // decks). Adjusting state during render (not useEffect) re-renders before paint, so no
  // placeholder flash on mount or after the selected deck is deleted.
  const selectionValid =
    selection !== null &&
    (selection.kind === 'battle' ? selection.id in battleDefs : selection.id in decks);
  if (!selectionValid) {
    const first: DeckSelection | null =
      battleIds.length > 0
        ? { kind: 'battle', id: battleIds[0] }
        : cardDeckIds.length > 0
          ? { kind: 'card', id: cardDeckIds[0] }
          : null;
    if (first) select(first);
    else if (selection !== null) {
      setSelection(null);
      setCardKey(null);
    }
  }

  const addBattleDeck = (id: string) => {
    commitBattle({ ...battleDefs, [id]: { cards: [blankLadderCard() as unknown as Record<string, unknown>] } });
    setSelection({ kind: 'battle', id });
    setCardKey('0');
  };
  const addCardDeck = (id: string) => {
    commitDecks({ ...decks, [id]: { category: 'treasure', cards: [] } });
    setSelection({ kind: 'card', id });
    setCardKey(null);
  };
  const removeDeck = (sel: DeckSelection) => {
    if (sel.kind === 'battle') {
      const next = { ...battleDefs };
      delete next[sel.id];
      commitBattle(next);
    } else {
      const next = { ...decks };
      delete next[sel.id];
      commitDecks(next);
    }
    if (selection && selection.kind === sel.kind && selection.id === sel.id) {
      setSelection(null);
      setCardKey(null);
    }
  };

  const setAppearance = (sel: DeckSelection, appearance: Appearance | undefined) => {
    if (sel.kind === 'battle') {
      const deck = { ...battleDefs[sel.id] };
      if (appearance) deck.appearance = appearance;
      else delete deck.appearance;
      commitBattle({ ...battleDefs, [sel.id]: deck });
    } else {
      const deck = { ...decks[sel.id] };
      if (appearance) deck.appearance = appearance;
      else delete deck.appearance;
      commitDecks({ ...decks, [sel.id]: deck });
    }
  };

  // ----- selected deck derivation -----
  const sel = selection;
  const selBattle = sel?.kind === 'battle' ? battleDefs[sel.id] : undefined;
  const selDeck = sel?.kind === 'card' ? decks[sel.id] : undefined;
  const appearance: Appearance | undefined = (selBattle ?? selDeck)?.appearance;
  const legacy = !!(selBattle && isLegacyBattleDeck(selBattle));
  // deck.* effect selects target generic (seeded) decks; foe.* selects target scenario foes
  const effectDeckIds = cardDeckIds;

  // ----- card tiles for the grid -----
  let tiles: CardTile[] = [];
  if (selBattle) {
    tiles = (selBattle.cards ?? []).map((c, i) => {
      const card = c as LadderCard & { strikes?: number };
      const face = legacy
        ? {
            name: String((card.advantage as string) ?? '—'),
            tag: card.strikes !== undefined ? `strikes ${card.strikes}` : undefined,
            template: appearance?.template,
            accent: appearance?.accent,
            critical: !!card.critical,
          }
        : ladderToFace(schemaDoc, card, appearance, 0);
      return { key: String(i), face, copies: card.copies ?? 1 };
    });
  } else if (selDeck) {
    tiles = (selDeck.cards ?? []).map((entry) => ({
      key: entry.cardId,
      face: genericToFace(schemaDoc, cards[entry.cardId] ?? { id: entry.cardId, name: entry.cardId }, appearance),
      copies: entry.copies,
    }));
  }

  // ----- battle-card ops -----
  const addBattleCard = () => {
    if (!selBattle || !sel) return;
    const nextCards = [...(selBattle.cards ?? []), blankLadderCard() as unknown as Record<string, unknown>];
    commitBattle({ ...battleDefs, [sel.id]: { ...selBattle, cards: nextCards } });
    setCardKey(String(nextCards.length - 1));
  };
  const changeBattleCard = (i: number, card: LadderCard) => {
    if (!selBattle || !sel) return;
    const nextCards = (selBattle.cards ?? []).map((c, idx) => (idx === i ? (card as unknown as Record<string, unknown>) : c));
    commitBattle({ ...battleDefs, [sel.id]: { ...selBattle, cards: nextCards } });
  };
  const removeBattleCard = (i: number) => {
    if (!selBattle || !sel) return;
    const nextCards = (selBattle.cards ?? []).filter((_, idx) => idx !== i);
    commitBattle({ ...battleDefs, [sel.id]: { ...selBattle, cards: nextCards } });
    setCardKey(nextCards.length > 0 ? '0' : null);
  };

  // ----- generic-card ops -----
  const addGenericCard = () => {
    if (!selDeck || !sel) return;
    const id = uniqueKey('card', cards);
    const nextCards = { ...cards, [id]: { id, name: 'New Card', type: selDeck.category ?? 'treasure' } };
    const nextEntries = [...(selDeck.cards ?? []), { cardId: id, copies: 1 }];
    commitCards(nextCards);
    commitDecks({ ...decks, [sel.id]: { ...selDeck, cards: nextEntries } });
    setCardKey(id);
  };
  const changeGenericCard = (cardId: string, card: GenericCard) => {
    commitCards({ ...cards, [cardId]: card });
  };
  const changeGenericCopies = (cardId: string, copies: number) => {
    if (!selDeck || !sel) return;
    const nextEntries = (selDeck.cards ?? []).map((e) => (e.cardId === cardId ? { ...e, copies } : e));
    commitDecks({ ...decks, [sel.id]: { ...selDeck, cards: nextEntries } });
  };
  const removeGenericCard = (cardId: string) => {
    if (!selDeck || !sel) return;
    const nextEntries = (selDeck.cards ?? []).filter((e) => e.cardId !== cardId);
    const nextDecks = { ...decks, [sel.id]: { ...selDeck, cards: nextEntries } };
    commitDecks(nextDecks);
    // drop the library.cards entry if no remaining deck references it
    const stillUsed = Object.values(nextDecks).some((d) => (d.cards ?? []).some((e) => e.cardId === cardId));
    if (!stillUsed) {
      const nextCards = { ...cards };
      delete nextCards[cardId];
      commitCards(nextCards);
    }
    setCardKey(nextEntries.length > 0 ? nextEntries[0].cardId : null);
  };

  const selectedBattleCard = selBattle && cardKey !== null ? (selBattle.cards?.[Number(cardKey)] as LadderCard | undefined) : undefined;
  const selectedGenericEntry = selDeck && cardKey !== null ? selDeck.cards?.find((e) => e.cardId === cardKey) : undefined;
  const selectedGenericCard = selectedGenericEntry ? cards[selectedGenericEntry.cardId] : undefined;

  // ----- pending-delete confirmation copy + action -----
  type ConfirmSpec = { title: string; message: React.ReactNode; confirmLabel: string; run: () => void };
  const confirm = ((): ConfirmSpec | null => {
    if (pendingDelete?.type === 'deck') {
      const del = pendingDelete.sel;
      const count =
        del.kind === 'battle' ? (battleDefs[del.id]?.cards?.length ?? 0) : (decks[del.id]?.cards?.length ?? 0);
      return {
        title: 'Delete deck?',
        message: (
          <>
            Delete <strong>{del.id}</strong>? It contains {count} card{count === 1 ? '' : 's'}. This cannot be
            undone.
          </>
        ),
        confirmLabel: 'Delete',
        run: () => removeDeck(del),
      };
    }
    if (pendingDelete?.type === 'card' && sel) {
      if (sel.kind === 'battle') {
        return {
          title: 'Delete card?',
          message: (
            <>
              Delete <strong>{selectedBattleCard?.name ?? 'this card'}</strong> from <strong>{sel.id}</strong>?
              This cannot be undone.
            </>
          ),
          confirmLabel: 'Delete',
          run: () => removeBattleCard(Number(cardKey)),
        };
      }
      return {
        title: 'Remove card?',
        message: (
          <>
            Remove <strong>{selectedGenericCard?.name ?? cardKey}</strong> from <strong>{sel.id}</strong>? If no
            other deck uses it, it is also deleted from the card library.
          </>
        ),
        confirmLabel: 'Remove',
        run: () => {
          if (cardKey) removeGenericCard(cardKey);
        },
      };
    }
    return null;
  })();

  return (
    <div style={root}>
      <DeckListRail
        battleIds={battleIds}
        legacyBattleIds={legacyBattleIds}
        cardDeckIds={cardDeckIds}
        selection={selection}
        onSelect={select}
        onAddBattle={addBattleDeck}
        onAddCardDeck={addCardDeck}
        onRemove={(delSel) => setPendingDelete({ type: 'deck', sel: delSel })}
        onImportBattle={(defs) => commitBattle({ ...battleDefs, ...(defs as Record<string, BattleDeck>) })}
      />

      {sel ? (
        <div style={center}>
          <DeckHeader
            doc={schemaDoc}
            selection={sel}
            appearance={appearance}
            onAppearanceChange={(a) => setAppearance(sel, a)}
            images={images}
            onManageImages={() => setAssetOpen(true)}
            legacy={legacy}
            foeIds={sel.kind === 'battle' ? foeIds : undefined}
            foeAssignments={sel.kind === 'battle' ? Object.fromEntries(foeIds.map((f) => [f, foes[f]?.battleDefId])) : undefined}
            battleDeckIds={sel.kind === 'battle' ? battleIds : undefined}
            onAssignFoe={updateFoeBattleDefId}
            category={selDeck?.category}
            marketSize={selDeck?.marketSize}
            onCategoryChange={(cat) => selDeck && commitDecks({ ...decks, [sel.id]: { ...selDeck, category: cat } })}
            onMarketSizeChange={(n) => {
              if (!selDeck) return;
              const d = { ...selDeck };
              if (n === undefined) delete d.marketSize;
              else d.marketSize = n;
              commitDecks({ ...decks, [sel.id]: d });
            }}
          />
          <CardGrid
            tiles={tiles}
            selectedKey={cardKey}
            onSelect={setCardKey}
            onAdd={legacy ? undefined : sel.kind === 'battle' ? addBattleCard : addGenericCard}
          />
        </div>
      ) : (
        <div style={{ ...center, alignItems: 'center', justifyContent: 'center', color: 'var(--c-text-muted)' }}>
          Create a deck to begin.
        </div>
      )}

      {sel && (cardKey !== null || legacy) && (
        <CardEditorPanel
          key={`${sel.kind}:${sel.id}:${cardKey}`}
          doc={schemaDoc}
          selection={sel}
          appearance={appearance}
          images={images}
          onManageImages={() => setAssetOpen(true)}
          deckIds={effectDeckIds}
          foeIds={foeIds}
          legacy={legacy}
          onRemove={() => setPendingDelete({ type: 'card' })}
          battleCard={selectedBattleCard}
          onBattleCardChange={(card) => cardKey !== null && changeBattleCard(Number(cardKey), card)}
          genericCard={selectedGenericCard}
          copies={selectedGenericEntry?.copies}
          onGenericCardChange={(card) => cardKey && changeGenericCard(cardKey, card)}
          onCopiesChange={(n) => cardKey && changeGenericCopies(cardKey, n)}
        />
      )}

      {assetOpen && (
        <AssetManagerDialog
          doc={schemaDoc}
          images={images}
          onSetImage={updateResourceImage}
          onClose={() => setAssetOpen(false)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          confirmLabel={confirm.confirmLabel}
          onConfirm={() => {
            confirm.run();
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

const root: CSSProperties = { display: 'flex', height: '100%', minHeight: 0, background: 'var(--c-bg)' };
const center: CSSProperties = {
  flex: 1,
  minWidth: 0,
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
};
