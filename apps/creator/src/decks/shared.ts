// Shared model, helpers, and inline styles for the first-class deck builder (apps/creator/src/decks).
// Named exports; inline React.CSSProperties + theme CSS variables (var(--c-*)) per repo convention.

import type { CSSProperties } from 'react';
import type { CardTemplate, CardFaceData } from '@udtc/card-render';
import type { ScenarioDoc } from '../types';

export const ID_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const ADVANTAGES = ['Beast', 'Magic', 'Humanoid', 'Melee', 'Undead', 'Stealth', 'Wild'] as const;
export const TEMPLATES: CardTemplate[] = ['classic', 'fullArt', 'textOnly'];
export const DECK_CATEGORIES = ['gear', 'treasure', 'potion', 'corruption', 'quest', 'companion'] as const;
export const DEFAULT_ACCENT = '#7a5cff';
/** ~5 MB localStorage budget for the whole draft; the asset manager warns as images approach it. */
export const IMAGE_BUDGET_BYTES = 5_000_000;

export type Appearance = { backRef?: string; template?: CardTemplate; accent?: string };
export type LadderStep = { text?: string; effects?: unknown[] };
export type LadderCard = {
  name?: string;
  advantage?: string;
  critical?: boolean;
  copies?: number;
  note?: string;
  artRef?: string;
  steps?: LadderStep[];
};
export type BattleDeck = { cards?: Array<Record<string, unknown>>; appearance?: Appearance };
export type GenericCard = {
  id: string;
  name?: string;
  type?: string;
  description?: string;
  flavor?: string;
  artRef?: string;
  effects?: unknown[];
};
export type GenericDeckEntry = { cardId: string; copies: number };
export type GenericDeck = {
  category?: string;
  cards?: GenericDeckEntry[];
  marketSize?: number;
  appearance?: Appearance;
};
export type DeckKind = 'battle' | 'card';
export type DeckSelection = { kind: DeckKind; id: string };

/** a battle deck is legacy (frozen, read-only) when its first card uses the strikes shape (no steps) */
export const isLegacyBattleDeck = (deck: BattleDeck): boolean => {
  const c = deck.cards?.[0];
  return !!c && !Array.isArray((c as { steps?: unknown }).steps);
};

export function libraryOf(doc: ScenarioDoc | null): Record<string, unknown> {
  return (doc?.library as Record<string, unknown> | undefined) ?? {};
}

/** resolve a resourceKey against library.resources.images → a data URL (or undefined if dangling) */
export function resolveImage(doc: ScenarioDoc | null, key: string | undefined): string | undefined {
  if (!key) return undefined;
  const resources = libraryOf(doc).resources as Record<string, unknown> | undefined;
  const images = resources?.images as Record<string, string> | undefined;
  return images?.[key];
}

export function imagesOf(doc: ScenarioDoc | null): Record<string, string> {
  const resources = libraryOf(doc).resources as Record<string, unknown> | undefined;
  return (resources?.images as Record<string, string> | undefined) ?? {};
}

/** resolve a DeckSelection to its deck object, for read-only display (e.g. DeckJsonPanel) */
export function resolveSelectedDeck(
  doc: ScenarioDoc | null,
  selection: DeckSelection | null,
): BattleDeck | GenericDeck | undefined {
  if (!doc || !selection) return undefined;
  const lib = libraryOf(doc);
  if (selection.kind === 'battle') {
    return (lib.battleDefs as Record<string, BattleDeck> | undefined)?.[selection.id];
  }
  return (lib.decks as Record<string, GenericDeck> | undefined)?.[selection.id];
}

/** resolve a DeckSelection + cardKey to its card object, for read-only display (e.g. DeckJsonPanel) */
export function resolveSelectedCard(
  doc: ScenarioDoc | null,
  selection: DeckSelection | null,
  cardKey: string | null,
): LadderCard | GenericCard | undefined {
  if (!doc || !selection || cardKey === null) return undefined;
  const deck = resolveSelectedDeck(doc, selection);
  if (!deck) return undefined;
  if (selection.kind === 'battle') {
    return (deck as BattleDeck).cards?.[Number(cardKey)] as LadderCard | undefined;
  }
  const entry = (deck as GenericDeck).cards?.find((e) => e.cardId === cardKey);
  if (!entry) return undefined;
  const cards = (libraryOf(doc).cards as Record<string, GenericCard> | undefined) ?? {};
  return cards[entry.cardId];
}

/** map a battle-ladder card (at a chosen step) to CardFaceData for the shared renderer */
export function ladderToFace(
  doc: ScenarioDoc | null,
  card: LadderCard,
  appearance: Appearance | undefined,
  step: number,
): CardFaceData {
  const steps = card.steps ?? [];
  return {
    name: card.name || 'Untitled',
    tag: card.advantage,
    text: steps[step]?.text,
    artUrl: resolveImage(doc, card.artRef),
    template: appearance?.template,
    accent: appearance?.accent,
    critical: !!card.critical,
  };
}

/** map a generic card to CardFaceData for the shared renderer */
export function genericToFace(
  doc: ScenarioDoc | null,
  card: GenericCard,
  appearance: Appearance | undefined,
): CardFaceData {
  return {
    name: card.name || 'Untitled',
    tag: card.type,
    text: card.description,
    flavor: card.flavor,
    artUrl: resolveImage(doc, card.artRef),
    template: appearance?.template,
    accent: appearance?.accent,
  };
}

/** rough byte size of a stored string (data URLs are ASCII, so length ≈ bytes) */
export const byteLen = (s: string): number => s.length;

export const inputStyle: CSSProperties = {
  padding: '4px 6px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  fontSize: 12,
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text)',
  boxSizing: 'border-box',
};
export const smallBtn: CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--c-border-strong)',
  borderRadius: 4,
  background: 'var(--c-surface)',
  color: 'var(--c-text-2)',
  fontSize: 12,
  cursor: 'pointer',
};
export const primaryBtn: CSSProperties = {
  padding: '5px 12px',
  border: 'none',
  borderRadius: 4,
  background: 'var(--c-primary)',
  color: 'var(--c-primary-fg)',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
};
export const dangerBtn: CSSProperties = {
  padding: '4px 10px',
  border: '1px solid var(--c-danger)',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-danger)',
  fontSize: 12,
  cursor: 'pointer',
};
/** borderless ✕ for dense rows (rail items, ladder steps) — the red glyph alone signals danger */
export const dangerIconBtn: CSSProperties = {
  padding: '2px 6px',
  border: 'none',
  borderRadius: 4,
  background: 'transparent',
  color: 'var(--c-danger)',
  fontSize: 11,
  lineHeight: 1,
  cursor: 'pointer',
};
export const labelStyle: CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.04,
  textTransform: 'uppercase',
  color: 'var(--c-text-faint)',
  margin: '8px 0 4px',
};
export const legacyBadge: CSSProperties = {
  fontSize: 9,
  padding: '1px 5px',
  borderRadius: 3,
  background: 'var(--c-surface-raised)',
  color: 'var(--c-text-muted)',
};
