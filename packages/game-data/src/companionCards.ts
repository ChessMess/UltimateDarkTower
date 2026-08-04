/**
 * companionCards.ts — the printed card face for all 22 companions.
 *
 * 10 base-game quest companions (recruited by completing their quest) and 12 guild
 * companions, three per guild. Through v2, `gameContent.COMPANIONS` held the same
 * 10 quest companions as name+title only; this is the full card, and the quest ten
 * are the rows carrying a `quest`.
 */

import type { BoardKingdom } from './board/gameBoard';

/** A companion ally card plus its Tower event text. */
export interface CompanionCard {
  /** Stable, unique kebab-case id (e.g. `'ruska'`). */
  id: string;
  /** Display name. */
  name: string;
  /** Epithet as printed ("The Barbarian"). */
  title: string;
  /** Guild the companion is aligned with, for the guild companions. */
  guild?: string;
  /** Recruitment quest title, for the base-game quest companions. */
  quest?: string;
  /** Home kingdom, where the source records one. */
  kingdom?: BoardKingdom;
  /** Free-text placement note from the source ("South - in the deep desert"). */
  origin?: string;
  /** Flavour text from the card. */
  flavor?: string;
  /** Short summary of the companion's Tower event. */
  event?: string;
  /** Full event text as read out when the event triggers. */
  eventText?: string;
  /** Alternate event text, used when the normal trigger has no legal target. */
  eventTextAlternate?: string;
  /**
   * The companion's granted ability. Absent where the card has none — Zaida's card carries
   * only the advantage line.
   */
  ability?: string;
  /** The companion's advantage bonus line. */
  advantage?: string;
  /** Note about what is still unknown for this companion. */
  sourceNote?: string;
}

export const COMPANION_CARDS: readonly CompanionCard[] = [
  {
    id: 'ruska',
    name: 'Ruska',
    title: 'The Barbarian',
    guild: 'Druids Circle',
    kingdom: 'west',
    origin: 'West - Druids Circle',
    flavor:
      'At one with nature, Ruska can find resources and inspiration where others find nothing but dirt and moss.',
    event: 'Ruska provides spirit if you are outdoors.',
    eventText:
      'Ruska teaches you to live off the land. The hero with Ruska gains 1 spirit if they are not on a building.',
    ability:
      'You can Reinforce on a space without a building. If you do, you gain 6[W] or 1 potion.',
    advantage: '+1 Wild Advantage on spaces without buildings',
  },
  {
    id: 'burgoyn',
    name: 'Burgoyn',
    title: 'the Herbalist',
    guild: 'Druids Circle',
    kingdom: 'west',
    origin: 'West - Druids Circle',
    flavor:
      'Burgoyn can turn a harvest of weeds into a meal fit for royalty or an elixir that will defeat death itself.',
    event: 'Burgoyn provides potions.',
    eventText:
      'Burgoyn found a bounty of restorative plants. The hero with Burgoyn may spend anyu amount of spirit to gain twice that number of potions.',
    ability: 'When you spend (not lose) a potion, gain 1[I].',
    advantage: '+2 Wild Advantages in forests',
  },
  {
    id: 'xyr',
    name: 'Xyr',
    title: 'The Oracle',
    guild: 'Druids Circle',
    kingdom: 'west',
    origin: 'West - Druids Circle',
    flavor:
      'Knowing the future is like the gift of time itself. And Xyr is the greatest gift giver.',
    event: 'Xyr gives you more time.',
    eventText: 'Xyr twists the fabric of time. This month is extended by 1 turn.',
    ability:
      'Keep the top card of the treasure deck and potion deck face up. At the start of your turn, you may move the top card of either deck to the bottom.',
    advantage: '+2 Magic Advantages',
  },
  {
    id: 'omar',
    name: 'Omar',
    title: 'The Healer',
    guild: 'Paladins Order',
    kingdom: 'north',
    origin: "North - Paladin's Order",
    flavor:
      'Omar stands at the veil between life and death to pull back those who wish to fight again.',
    event: 'Omar highlights dangerous cards in battle.',
    eventText:
      'Omar has finished his work. The hero with Omar gains all of the warriors on his card.',
    ability:
      'In each battle, place the first 5[W] that you lose on this card. At the end of the month, gain all [W] on this card.',
    advantage: '+2 Humanoid Advantages',
  },
  {
    id: 'amani',
    name: 'Amani',
    title: 'The Vizier',
    guild: 'Paladins Order',
    kingdom: 'north',
    origin: "North - Paladin's Order",
    flavor:
      'Amani has been a confidant to the last five Elders of the Paladins Order, and is respected more than all of them combined.',
    event: 'Amani increases guild ranks.',
    eventText:
      'Amani courts the guilds. Choose and increase a guild 1 rank. If the new rank has a companion, give it to any hero and indicate they were recruited in the app.',
    ability: 'At the end of the month, gain 4[I]',
    advantage: '+2 Wild Advantages on spaces with buildings',
  },
  {
    id: 'sanzhar',
    name: 'Sanzhar',
    title: 'The Zealot',
    guild: 'Paladins Order',
    kingdom: 'north',
    origin: "North - Paladin's Order",
    flavor:
      'Sanzhar is the walking embodiment of the Paladins Order and the banner bearer for every major battle.',
    event: 'Sanzhar provides warriors.',
    eventText:
      "Sanzhar's zeal is spoken of throughout the land. The hero with Sanzhar may spend any number of spirit to gain 6 warriors for each spirit spent.",
    ability: 'Virtues cost you 2 less [S]',
    advantage: '+1 Wild Advantage for each virtue you have after your first three',
  },
  {
    id: 'lukas',
    name: 'Lukas',
    title: 'The Plunderer',
    guild: 'Thieves Guild',
    kingdom: 'south',
    origin: 'South - Thieves Guild',
    flavor: '"One man\'s poorly locked up item is another man\'s treasure."',
    event: 'Lukas "finds" treasures.',
    eventText:
      'Lukas returns with the spoils of his efforts. The hero with Lukas may spend 2 spirit to search the treasure deck for a treasure and gain it.',
    ability: 'When you defeat a level 4 foe, gain the top card of the treasure deck.',
    advantage: '+2 Wild Advantages if you have any corruptions',
  },
  {
    id: 'maxim',
    name: 'Maxim',
    title: 'The Beast',
    guild: 'Thieves Guild',
    kingdom: 'south',
    origin: 'South - Thieves Guild',
    flavor: 'The very best boy.',
    event: 'Maxim magically transports items and companions.',
    eventText:
      'Maxim shakes his head as you scratch behind his knee. All players may trade any items and companions.',
    ability: 'You can carry up to 4 extra treasures. When you gain a treasure, also gain 2[I].',
    advantage: '+2 Beast Advantages',
  },
  {
    id: 'ema',
    name: 'Ema',
    title: 'The Grand Merchant',
    guild: 'Thieves Guild',
    kingdom: 'south',
    origin: 'South - Thieves Guild',
    flavor: '"An obstacle is only an obstacle until you move it out of your way."',
    event: 'Ema bribes the guilds.',
    eventText:
      'Ema knows all the trade routes. The hero with Ema may spend 1 treasure to upgrade any guild.',
    ability: 'You can reinforce at any building as if it were a bazaar.',
    advantage: '+2 Wild Advantages when completing a monthly quest',
  },
  {
    id: 'oola',
    name: 'Oola',
    title: 'The Nomad',
    guild: 'Arcane Scouts',
    kingdom: 'east',
    origin: 'East - Arcane Scouts',
    flavor:
      "Oola's name is spoken with reverence throughout the Four Kingdoms. It is a good tiding when she crests the horizon before you.",
    event: 'Oola provides spirit to heroes outside their home kingdom.',
    eventText:
      'Oola emboldens those who journey far and wide. All heroes outside their home kingdom gain 1 spirit.',
    ability: 'If you Influence outside your home kingdom, gain an additional 3[I].',
    advantage: '+1 Wild Advantage outside your home kingdom',
  },
  {
    id: 'berat',
    name: 'Berat',
    title: 'The Wizard',
    guild: 'Arcane Scouts',
    kingdom: 'east',
    origin: 'East - Arcane Scouts',
    flavor: '"There\'s always something to find if you look hard enough."',
    event: 'Berat makes dungeons easier.',
    ability:
      'When you would gain a gear, you can spend 1[S] to gain the top card of the treasure deck instead.',
    advantage: '+2 Wild Advantages in dungeons',
    sourceNote:
      'No Tower event text found; Berat appears to auto-upgrade a random selection of dungeon rooms instead.',
  },
  {
    id: 'haraswa',
    name: 'Haraswa',
    title: 'The Pegasus',
    guild: 'Arcane Scouts',
    kingdom: 'east',
    origin: 'East - Arcane Scouts',
    flavor:
      'Haraswa will bear you amongst the winds or help strike foes who believe mountains can hide them.',
    event: 'Haraswa transports you to buildings for reinforcements',
    eventText:
      'Haraswa soars on wings of light. The hero with Haraswa may place their hero in any building and take the free Reinforce action of that building.',
    ability: 'Your base move is +2.',
    advantage: '+2 Wild Advantages in mountains',
  },
  {
    id: 'hakan',
    name: 'Hakan',
    title: 'The Artificer',
    quest: 'Forge an Alchemical Solution',
    kingdom: 'south',
    origin: 'South - Brass League ally',
    flavor:
      'Hakan the Artificer is crafting an alchemical bomb to blow a giant hole in the side of the Tower. Gather ingredients for his creation. (not starting)',
    event: 'Hakan changes gear into potions.',
    eventText:
      'Hakan has devised a new formula and just needs some raw materials. The hero with Hakan may spend 1 gear to gain 3 potions.',
    ability:
      'Spend 2 potions to gain the top card of the treasure deck. You can do this once per turn.',
    advantage: '+2 Wild Advantages on spaces with buildings',
  },
  {
    id: 'letha',
    name: 'Letha',
    title: 'The Dryad',
    quest: 'Assemble an Army of Trees',
    kingdom: 'west',
    origin: 'West - in the deep woods',
    flavor:
      'Letha the Dryad has awoken the ancient trees to besiege the Tower. Protect these trees as they get into position.',
    event: 'Letha weakness beasts.',
    eventText:
      'Letha says, "I have soothed the beasts of the Four Kingdoms." [Foes] have weakened.',
    eventTextAlternate:
      'Letha finds no savage or lethal beasts to soothe. But she is ready should it happen.',
    ability: 'If you end your turn in a forest, gain 6[W].',
    advantage: '+2 Beast Advantages',
  },
  {
    id: 'grigor',
    name: 'Grigor',
    title: 'The Unbreakable',
    quest: "Break Grigor's Ensorcellment",
    kingdom: 'north',
    origin: 'North - trained as a paladin',
    flavor:
      'Grigor the Unbreakable has been ensorcelled to protect the tower. In order to gain entrance, you will have to break the spell that binds him. (not starting)',
    event: 'Grigor removes foes from the board.',
    eventText:
      '"I ran into one of the servants of the Tower. They were no match for me." Remove a foe token from the board: [Foe]',
    ability: 'Spend 1[S] to gain +1 Wild Advantage. You can do this 3 times per turn.',
    advantage: '+2 Melee Advantages',
  },
  {
    id: 'miras',
    name: 'Miras',
    title: 'The Horselord',
    quest: 'Destroy the Evil Relics',
    kingdom: 'west',
    origin: 'West - Garrison of the Horselords',
    flavor:
      'Three caravans carry evil relics. Sneak into the caravans and destroy the relics before they reach the Tower.',
    event: 'Miras moves foes around the board.',
    eventText:
      'Miras says, "I have confused our enemies with rumors and tricks." Move all [Foes] up to 2 spaces.',
    eventTextAlternate:
      'Miras says, "I\'m sorry I can\'t be of more help, but there are simply no foes to rout."',
    ability: 'If you end your turn in the grasslands, gain 6[W].',
    advantage: '+2 Wild Advantages in grasslands',
  },
  {
    id: 'gleb',
    name: 'Gleb',
    title: 'The Outlaw King',
    quest: 'Raise an Outlaw Army',
    kingdom: 'east',
    origin: 'East - Bandit Redoubt',
    flavor:
      'Gleb the Outlaw King is building an army. Gather warriors and gera, then storm the tower with his army behind you.',
    event: 'Gleb provides warriors.',
    eventText: 'Gleb recruits warriors The hero with Gleb may spend 1 spirit to gain 12 warriors.',
    ability: 'If you end your turn in the mountains, gain 6[W].',
    advantage: '+2 Humanoid Advantages',
  },
  {
    id: 'nimet',
    name: 'Nimet',
    title: 'The Fathomless',
    quest: 'A Heroic Beginning',
    origin: 'In the Shadow of the Tower',
    flavor:
      'In a time before the Four Kingdoms ere friendly, Nimet the Fathomless tested a hero from each kingdom to see who could enter the tower and destroy Azkol the Sorcerer-King.',
    event: 'Nimet changes treasures into spirit.',
    eventText:
      "Nimet's magic is as inscrutable as it is powerful. The hero with Nimet may spend 1 treasure to gain 5 spirit.",
    ability: 'Spend 3[S] to place a seal on the Tower. You can do this once per turn.',
    advantage: '+2 Magic Advantages',
  },
  {
    id: 'tomas',
    name: 'Tomas',
    title: 'The Scout',
    quest: 'Delve the Three Dungeons',
    kingdom: 'east',
    origin: 'East - Trained at least',
    flavor:
      'The Tower is surrounded by enchantments that prevent any from entering it. These enchantments are powered by three altars, each In a different dungeon. Only Tomas the Scout knows where to find them.',
    event: 'Tomas moves heroes around the board.',
    eventText:
      'Tomas knows all the hidden paths of the Four Kingdoms. The hero with Tomas may place themselves in any space.',
    ability: 'You do not need to spend spirit to double your move.',
    advantage: '+2 Stealth Advantages',
  },
  {
    id: 'zaida',
    name: 'Zaida',
    title: 'The Efreet',
    quest: "Recover Azkol's Treasures",
    kingdom: 'south',
    origin: 'South - in the deep desert',
    flavor:
      "Azkol's treasures can draw the adversary from the Tower. Gather Azkol's treasures to have Zaida perform the ritual if you are virtuous enough.",
    event: 'Zaida gives treasures.',
    eventText:
      'Zaida draws forth a powerful artifact from another realm. The hero with Zaida may gain the top card of the treasure deck.',
    advantage: 'Spend 1 treasure to gain +3 Wild Advantages. You can do this once per turn.',
  },
  {
    id: 'yana',
    name: 'Yana',
    title: 'The Assassin',
    quest: 'Make a Deal with Darkness',
    origin: 'Nowhere and everywhere',
    flavor:
      'Yana the Assassin knows a hidden passage into the Tower. If you help her with some outstanding "jobs," she will reveal the entrance to you. (not starting)',
    event: 'Yana "handles" foes before they spawn.',
    eventText:
      'You receive a message from Yana, "I had intel that a [Foe] was on its way, but don\'t worry, I have taken care of it." Yana prevents a [Foe] from spawning.',
    ability: 'Gain no more than 1 corruption when you Battle a level 2, 3, or 4 foe.',
    advantage: '+2 Wild Advantages vs. the adversary',
  },
  {
    id: 'vasa',
    name: 'Vasa',
    title: 'The Divine',
    quest: 'Beseech the Gods of Light',
    kingdom: 'south',
    origin: 'South or West',
    flavor:
      'Vasa the Divine communes with the Gods of Light. Cleanse skulls and gather spirit to beseech them to smite the Tower.',
    event: 'Vasa removes corruptions.',
    eventText:
      'Vasa heals the wounds of the soul. The hero with Vasa may remove one of their corruptions.',
    ability:
      'Do not spend spirit for glyphs facing you. After you take an action matching a glyph facing you, gain 1[S].',
    advantage: '+2 Undead Advantages',
  },
];

/** CompanionCard entries keyed by their stable `id`. */
export const COMPANION_CARDS_BY_ID: Readonly<Record<string, CompanionCard>> = Object.freeze(
  COMPANION_CARDS.reduce<Record<string, CompanionCard>>((acc, entry) => {
    acc[entry.id] = entry;
    return acc;
  }, {}),
);
