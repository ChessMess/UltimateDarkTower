/**
 * expeditions.ts — the Expeditions expansion's four expedition boards and its torment setup.
 *
 * Source: the printed Expeditions rulebook (pp. 2–8). Each expedition is the neighbouring
 * realm beyond one kingdom's map edge; its prose description is `Nation.neighbor` in
 * `nations.ts` (joined on `kingdom`), not repeated here. `[S]` = spirit, `[W]` = warriors,
 * as in `potionsAndGear.ts`.
 */

import type { BoardKingdom } from './board/gameBoard';

/** One expedition board and the unique site token its spoils place on the main board. */
export interface Expedition {
  /** Stable, unique kebab-case id. */
  id: string;
  /** The realm's name ("Inkstain Isles"). */
  name: string;
  /** The kingdom this realm borders — joins to `Nation.kingdom`. */
  kingdom: BoardKingdom;
  /** The site token this expedition awards (6 of each in the box). */
  siteToken: string;
  /** The site token's rules text. Site tokens are not buildings. */
  siteEffect: string;
}

export const EXPEDITIONS: readonly Expedition[] = [
  {
    id: 'gasping-mountains',
    name: 'Gasping Mountains',
    kingdom: 'north',
    siteToken: 'Guardian Statue',
    siteEffect:
      "At the start of your turn, when a foe is in a space adjacent to a guardian statue, you may pay spirit equal to the foe's level to remove the foe from the board. You cannot remove the adversary this way. (Remember to remove the foe on the foe status screen in the app.)",
  },
  {
    id: 'inkstain-isles',
    name: 'Inkstain Isles',
    kingdom: 'east',
    siteToken: 'Dark Altar',
    siteEffect:
      'When you place a dark altar, you may immediately move up to 3 skulls in that kingdom onto the dark altar. When you remove a skull from a building, you may place it on a dark altar in the same kingdom as that building instead of returning it to the supply. Dark altars can have up to 3 skulls on them. During a heroic action, if you are in a space adjacent to a dark altar, you may return skulls on that altar to the supply to gain +1 Wild Advantage per skull returned. Skulls on a dark altar are considered to be adjacent to the spaces the altar is adjacent to.',
  },
  {
    id: 'brassbound-league',
    name: 'Brassbound League',
    kingdom: 'south',
    siteToken: 'Lotus Workshop',
    siteEffect:
      'While in a space adjacent to a lotus workshop, you may use your Reinforce action to gain the free effect from any building (1 gear, 1 potion, 1[S], or 6[W]). Using this effect does not count as Reinforcing in a building of the corresponding type.',
  },
  {
    id: 'umberwood',
    name: 'Umberwood',
    kingdom: 'west',
    siteToken: 'Runic Menhir',
    siteEffect:
      'During your turn, you may spend 3[W] while in a space adjacent to a runic menhir to treat that space as having all terrain types for the rest of your turn. (If you are playing with the Covenant expansion, this effect cancels the effect of a wasteland token in that space.)',
  },
];

/** Expeditions keyed by their stable `id`. */
export const EXPEDITION_BY_ID: Readonly<Record<string, Expedition>> = Object.freeze(
  Object.fromEntries(EXPEDITIONS.map((e) => [e.id, e])),
);

/** A torment tier, or `'None'` when that slot gets no torment at that difficulty. */
export type TormentTier = 'None' | 'Lesser' | 'Greater' | 'Nightmare';

/** One row of the rulebook's "Torment Setup by Difficulty Level" table. */
export interface TormentSetupRow {
  /** Which slot this row configures: a foe level, the adversary, or the global count. */
  slot: 'Foe Level 2' | 'Foe Level 3' | 'Foe Level 4' | 'Adversary' | 'Global';
  /** Foe rows give a tier per difficulty; the `Global` row gives a count of global torments. */
  narrative: TormentTier | number;
  easy: TormentTier | number;
  medium: TormentTier | number;
  hard: TormentTier | number;
  nightmare: TormentTier | number;
}

/**
 * Torment setup by difficulty (rulebook p. 4). At setup, randomly choose a torment of the
 * listed tier for each foe, and the listed number of global torments.
 */
export const TORMENT_SETUP: readonly TormentSetupRow[] = [
  {
    slot: 'Foe Level 2',
    narrative: 'None',
    easy: 'Lesser',
    medium: 'Lesser',
    hard: 'Greater',
    nightmare: 'Nightmare',
  },
  {
    slot: 'Foe Level 3',
    narrative: 'None',
    easy: 'Lesser',
    medium: 'Lesser',
    hard: 'Greater',
    nightmare: 'Nightmare',
  },
  {
    slot: 'Foe Level 4',
    narrative: 'None',
    easy: 'Greater',
    medium: 'Greater',
    hard: 'Nightmare',
    nightmare: 'Nightmare',
  },
  {
    slot: 'Adversary',
    narrative: 'None',
    easy: 'None',
    medium: 'Greater',
    hard: 'Nightmare',
    nightmare: 'Nightmare',
  },
  { slot: 'Global', narrative: 0, easy: 1, medium: 2, hard: 3, nightmare: 4 },
];
