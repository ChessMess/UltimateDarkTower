/**
 * foeCards.ts — the printed card face for every foe and adversary.
 *
 * Identity metadata (level, tier, source) lives in `foes.ts`, which is also the canonical
 * spelling source; `id` and `name` here match `ALL_FOES` exactly and
 * `tests/nameConsistency.test.ts` enforces it. The dungeon-advantage legend printed at the
 * bottom of the source sheet is a real rule and lives in `dungeons.ts` as
 * `DUNGEON_ADVANTAGE`.
 */

import type { AdvantageType } from './advantages';

/**
 * A foe or adversary card's printed text. Identity metadata (tier, source) lives in
 * `foes.ts`; this is the card face.
 */
export interface FoeCard {
  /** Stable, unique kebab-case id matching `foes.ts` (e.g. `'shadow-wolves'`). */
  id: string;
  /** Display name, reconciled with `ALL_FOES` in `foes.ts`. */
  name: string;
  /** Card level: 2–4 for foes, 5 for adversaries. */
  level: 2 | 3 | 4 | 5;
  /**
   * The foe's trait keywords — normally one attack type and one creature type.
   * Isa the Exile is the sole exception and carries only one.
   */
  traits: readonly AdvantageType[];
  /** The two "When Battling" lines, positionally aligned with `traits`. Foes only. */
  whenBattling?: readonly string[];
  /**
   * The two card lines in the same position as a foe's "When Battling" text. Adversaries
   * only. These describe the adversary's own targeting and effects and do NOT map to the
   * trait slots the way a foe's do.
   */
  cardText?: readonly string[];
  /** Short summary of the foe's Tower event. */
  event?: string;
  /**
   * Strike text by foe status. Adversaries have none — they do not use the foe-status
   * strike track, at least not in the heroic (co-operative) game.
   *
   * Most level 2–3 foes widen their blast radius as they escalate: `ready` hits heroes on
   * or adjacent to the foe, `savage` hits the foe's whole kingdom, and `lethal` hits every
   * hero for roughly double. Level 4 foes mostly break the pattern — Titans, Mormos and
   * Dragons repeat identical text at all three statuses. Do not rely on the progression;
   * read the text.
   */
  acts?: {
    ready?: string;
    savage?: string;
    lethal?: string;
  };
}

export const FOE_CARDS: readonly FoeCard[] = [
  {
    id: 'oreks',
    name: 'Oreks',
    level: 2,
    traits: ['Melee', 'Undead'],
    whenBattling: ['Melee foes make you lose gear', 'Undead foes make you lose spirit'],
    event: 'Oreks add skulls to buildings in their kingdom.',
    acts: {
      ready:
        'Oreks strike! Place 1 skull on one building in each kingdom that has at least one orek.',
      savage: 'Oreks strike! Place 1 skull on each building on or adjacent to an orek.',
      lethal:
        'Orek strike! Place 1 skull on each building in a kingdom that has at least one orek.',
    },
  },
  {
    id: 'spine-fiends',
    name: 'Spine Fiends',
    level: 2,
    traits: ['Magic', 'Beast'],
    whenBattling: ['Magic foes manipulate the Tower', 'Beast foes make you lose extra warriors'],
    event: 'Spine fiends make you lose warriors.',
    acts: {
      ready:
        'Spine fiends strike! Each hero loses 6 warriors if a spine fiend is on or adjacent to their space.',
      savage:
        'Spine fiends strike! Each hero loses 6 warriors if a spine fiend is in their current kingdom.',
      lethal: 'Spine fiends strike! Each hero loses 12 warriors.',
    },
  },
  {
    id: 'brigands',
    name: 'Brigands',
    level: 2,
    traits: ['Stealth', 'Humanoid'],
    whenBattling: ['Stealth foes make you lose potions', 'Humanoid foes add skulls to buildings'],
    event: 'Brigands make you lose items.',
    acts: {
      ready:
        'Brigands strike! Each hero loses 1 item if a brigand is on or adjacent to their space.',
      savage:
        'Brigands strike! Each hero loses 1 item if there is a brigand in their current kingdom.',
      lethal: 'Brigands strike! Each hero loses 1 item.',
    },
  },
  {
    id: 'shadow-wolves',
    name: 'Shadow Wolves',
    level: 2,
    traits: ['Stealth', 'Beast'],
    whenBattling: ['Stealth foes make you lose potions', 'Beast foes make you lose extra warriors'],
    event: 'Shadow wolves move to your space and make you lose warriors.',
    acts: {
      ready:
        "Shadow wolves strike! Move each shadow wolf that is adjacent to a hero onto that hero's space. Then, each hero loses 3 warriors for each shadow wolf on their space.",
      savage:
        'Shadow wolves strike! Move each shadow wolf onto a hero in their current kingdom (if any). Then, each hero loses 3 warriors for each shadow wolf on their space.',
      lethal:
        'Shadow wolves strike! Move each shadow wolf onto your space. Then lose 6 warriors for each shadow wolf on your space.',
    },
  },
  {
    id: 'frost-trolls',
    name: 'Frost Trolls',
    level: 3,
    traits: ['Melee', 'Humanoid'],
    whenBattling: ['Melee foes make you lose gear', 'Humanoid foes add skulls to buildings'],
    event: 'Frost trolls add skulls to nearby buildings.',
    acts: {
      ready:
        'Frost trolls strike! Move each frost troll to an adjacent space. Then, place 1 skull on each building on or adjacent to a frost troll.',
      savage:
        'Frost trolls strike! Move each frost troll to an adjacent space. Then, place 2 skulls on each building on or adjacent to a frost troll.',
      lethal:
        'Frost trolls strike! Move each frost troll to an adjacent space. Then, destroy each building on or adjacent to a frost troll.',
    },
  },
  {
    id: 'clan-of-neuri',
    name: 'Clan of Neuri',
    level: 3,
    traits: ['Magic', 'Humanoid'],
    whenBattling: ['Magic foes manipulate the Tower', 'Humanoid foes add skulls to buildings'],
    event: 'Clan of Neuri make you lose spirit.',
    acts: {
      ready:
        'Clan of Neuri strike! Each hero loses 1 spirit if a Clan of Neuri is on or adjacent to their space.',
      savage:
        'Clan of Neuri strike! Each hero loses 1 spirit if a Clan of Neuri is in their current kingdom.',
      lethal: 'Clan of Neuri strike! Each hero loses 2 spirit.',
    },
  },
  {
    id: 'lemures',
    name: 'Lemures',
    level: 3,
    traits: ['Magic', 'Undead'],
    whenBattling: ['Magic foes manipulate the Tower', 'Undead foes make you lose spirit'],
    event: 'Lemures add skulls to citadels and sanctuaries.',
    acts: {
      ready:
        'Lemures strike! Move each lemure to the closest Sanctuary or Citadel. Then, for each lemure, place 1 skull on the building in their space.',
      savage:
        'Lemures strike! Move each lemure to the closest Sanctuary or Citadel. Then, for each lemure, place 2 skulls on the building in their space.',
      lethal:
        'Lemures strike! Move each lemure to the closest Sanctuary or Citadel. Then, destroy the building in their space.',
    },
  },
  {
    id: 'widowmade-spiders',
    name: 'Widowmade Spiders',
    level: 3,
    traits: ['Stealth', 'Beast'],
    whenBattling: ['Stealth foes make you lose potions', 'Beast foes make you lose extra warriors'],
    event: 'Widowmade spiders chase one hero and drain their spirit.',
    acts: {
      ready:
        'Widowmade Spiders strike! Move each widowmade spider 4 spaces towards you. Lose 1 spirit for each widowmade spider on your space.',
      savage:
        'Widowmade Spiders strike! Move each widowmade spider 6 spaces towards you. Lose 1 spirit for each widowmade spider on your space.',
      lethal:
        'Widowmade Spiders strike! Move each widowmade spider to your space. Lose 1 spirit for each widowmade spider on your space.',
    },
  },
  {
    id: 'titans',
    name: 'Titans',
    level: 4,
    traits: ['Melee', 'Humanoid'],
    whenBattling: ['Melee foes make you lose gear', 'Humanoid foes add skulls to buildings'],
    event: 'The titan destroys buildings.',
    acts: {
      ready:
        "The Titan strikes! Destroy a building in the Titan's kingdom. Then, move the Titan to any building space in the next kingdom clockwise.",
      savage:
        "The Titan strikes! Destroy a building in the Titan's kingdom. Then, move the Titan to any building space in the next kingdom clockwise.",
      lethal:
        "The Titan strikes! Destroy a building in the Titan's kingdom. Then, move the Titan to any building space in the next kingdom clockwise.",
    },
  },
  {
    id: 'striga',
    name: 'Striga',
    level: 4,
    traits: ['Magic', 'Undead'],
    whenBattling: ['Magic foes manipulate the Tower', 'Undead foes make you lose spirit'],
    event: 'Strigas make you lose virtues.',
    acts: {
      ready:
        'Striga strike! Each hero with a striga in their current kingdom loses an active virtue tile (remove it from the game). If you cannot, gain a corruption.',
      savage:
        'Striga strike! Each hero with a striga in their current kingdom loses an active virtue tile (remove it from the game). If you cannot, gain a corruption.',
      lethal:
        'Striga strike! Each hero with a striga in their current kingdom loses an active virtue tile (remove it from the game). If you cannot, gain a corruption.',
    },
  },
  {
    id: 'mormos',
    name: 'Mormos',
    level: 4,
    traits: ['Stealth', 'Undead'],
    whenBattling: ['Stealth foes make you lose potions', 'Undead foes make you lose spirit'],
    event: 'Mormos give you corruptions.',
    acts: {
      ready: 'Mormo strike! Each hero with a mormo in their current kingdom gains a corruption.',
      savage: 'Mormo strike! Each hero with a mormo in their current kingdom gains a corruption.',
      lethal: 'Mormo strike! Each hero with a mormo in their current kingdom gains a corruption.',
    },
  },
  {
    id: 'dragons',
    name: 'Dragons',
    level: 4,
    traits: ['Melee', 'Beast'],
    whenBattling: ['Melee foes make you lose gear', 'Beast foes make you lose extra warriors'],
    event: 'Dragons make you lose treasures.',
    acts: {
      ready: 'Dragons strike! Each hero with a dragon in their current kingdom loses a treasure.',
      savage: 'Dragons strike! Each hero with a dragon in their current kingdom loses a treasure.',
      lethal: 'Dragons strike! Each hero with a dragon in their current kingdom loses a treasure.',
    },
  },
  {
    id: 'bane-of-omens',
    name: 'Bane of Omens',
    level: 5,
    traits: ['Stealth', 'Humanoid'],
    cardText: [
      'The Bane of Omens gives you corruptions',
      'The Bane of Omens targets the hero with the Black Mark',
    ],
    event: 'The Bane of Omens attacks the hero with the Black Mark.',
  },
  {
    id: 'gravemaw',
    name: 'Gravemaw',
    level: 5,
    traits: ['Melee', 'Beast'],
    cardText: [
      'Gravemaw makes you lose a huge number of warriors',
      'Gravemaw hurts heroes based on how many foes are on the board',
    ],
    event: 'Gravemaw mutates foes, adding new battle cards to their decks.',
  },
  {
    id: 'utuk-ku',
    name: "Utuk'Ku",
    level: 5,
    traits: ['Magic', 'Undead'],
    cardText: ["Utuk'Ku makes you lose spirit", "Utuk'Ku targets heroes in his current kingdom"],
    event: "Utuk'Ku reduces the number of advantages you can spend per action.",
  },
  {
    id: 'gaze-eternal',
    name: 'Gaze Eternal',
    level: 5,
    traits: ['Magic', 'Humanoid'],
    cardText: [
      'The Gaze Eternal makes you lose potions',
      'The Gaze Eternal hurts heroes in its current kingdom based on the Tower glyphs',
    ],
    event: 'The Gaze Eternal manipulates the Tower to cause disaster.',
  },
  {
    id: 'isa-the-exile',
    name: 'Isa the Exile',
    level: 5,
    traits: ['Humanoid'],
    cardText: [
      'Isa makes you lose spirit',
      'Isa hurts heroes based on how many treasures they have',
    ],
    event: 'Isa issues ultimatums.',
  },
  {
    id: 'ashstrider',
    name: 'Ashstrider',
    level: 5,
    traits: ['Magic', 'Beast'],
    cardText: [
      'Ashstrider adds skulls to buildings',
      'Ashstrider hurts heroes in its current kingdom based on skulls in the kingdom',
    ],
    event: 'Ashstrider adds skulls to buildings.',
  },
  {
    id: 'empress-of-shades',
    name: 'Empress of Shades',
    level: 5,
    traits: ['Stealth', 'Undead'],
    cardText: [
      'The Empress targets heroes in certain terrain types',
      'The Empress targets heroes in her current kingdom',
    ],
    event: 'The Empress unleashes plague in one kingdom, killing warriors.',
  },
  {
    id: 'lingering-rot',
    name: 'Lingering Rot',
    level: 5,
    traits: ['Melee', 'Undead'],
    cardText: [
      'The Lingering Rot gives you spore tokens',
      'The Lingering Rot targets heroes with spore tokens',
    ],
    event: 'The Lingering Rot gives you spore tokens.',
  },
];

/** FoeCard entries keyed by their stable `id`. */
export const FOE_CARDS_BY_ID: Readonly<Record<string, FoeCard>> = Object.freeze(
  FOE_CARDS.reduce<Record<string, FoeCard>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
