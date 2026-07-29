/**
 * The card names a player board can hold, derived from the box inventory (PRD-03 §9).
 * Only card *names* are bundled — the rules text on those cards is © Restoration Games
 * and stays out of the app.
 *
 * Base game only: `GameConfig.expansions` is always `[]` in the MVP, so offering
 * Alliances/Covenant/Dark Horde cards would list things the setup flow can't configure.
 */
import { EXPANSIONS } from '@/lib/udtData';
import type { ListKey } from '@/session';

export interface ItemOption {
  /** The stored value — a plain card name, so saves stay `string[]`. */
  value: string;
  /** What the dropdown shows; companions carry their title. */
  label: string;
}

/** Which box-inventory category backs each list. Note the singular `Companion`. */
const CATEGORY: Record<ListKey, string> = {
  gear: 'Gear',
  treasures: 'Treasures',
  questItems: 'Quest Items',
  companions: 'Companion',
};

function optionsFor(category: string): ItemOption[] {
  const components =
    EXPANSIONS['Base Game'].categories.find((c) => c.name === category)?.components ?? [];
  return components.flatMap((c) =>
    c.name
      ? [{ value: c.name, label: c.description ? `${c.name} — ${c.description}` : c.name }]
      : [],
  );
}

/** Base-game card names per list, in box-inventory (alphabetical) order. */
export const ITEM_OPTIONS: Record<ListKey, ItemOption[]> = {
  gear: optionsFor(CATEGORY.gear),
  treasures: optionsFor(CATEGORY.treasures),
  questItems: optionsFor(CATEGORY.questItems),
  companions: optionsFor(CATEGORY.companions),
};
