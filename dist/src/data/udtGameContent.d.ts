export type HeroExpansion = 'Base Game' | 'Alliances' | 'Covenant';
/** A virtue: its tile name and rules text. */
export interface Virtue {
    readonly name: string;
    readonly ability: string;
}
/**
 * A playable hero.
 * - `defaultVirtues`: the 2 virtues active from the start (printed on the board).
 * - `unlockableVirtues`: the 3 virtue tiles unlocked during play.
 * Kingdom virtues are NOT hero-specific — see KINGDOM_VIRTUES.
 */
export interface Hero {
    readonly name: string;
    readonly expansion: HeroExpansion;
    readonly bannerAction: string;
    readonly defaultVirtues: readonly Virtue[];
    readonly unlockableVirtues: readonly Virtue[];
}
/** All heroes, keyed by name for O(1) lookup (e.g. HEROES.Spymaster). */
export declare const HEROES: {
    readonly Spymaster: {
        readonly name: "Spymaster";
        readonly expansion: "Base Game";
        readonly bannerAction: "Place your hero on any space in your current kingdom.";
        readonly defaultVirtues: readonly [{
            readonly name: "Alert";
            readonly ability: "+1 Stealth Advantage.";
        }, {
            readonly name: "Swift";
            readonly ability: "Your base move is 4.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Resourceful";
            readonly ability: "At the end of each month, gain 15 warriors.";
        }, {
            readonly name: "Fortunate";
            readonly ability: "You may Reinforce twice per turn at the same building.";
        }, {
            readonly name: "Unseen";
            readonly ability: "When you complete a monthly quest, you may remove a foe instead of gaining spirit.";
        }];
    };
    readonly 'Brutal Warlord': {
        readonly name: "Brutal Warlord";
        readonly expansion: "Base Game";
        readonly bannerAction: "Gain 5 warriors.";
        readonly defaultVirtues: readonly [{
            readonly name: "Baleful";
            readonly ability: "+1 Melee Advantage.";
        }, {
            readonly name: "Veteran";
            readonly ability: "+1 Wild Advantage when you Battle.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Inspiring";
            readonly ability: "After you Reinforce, also gain 6 warriors.";
        }, {
            readonly name: "Callous";
            readonly ability: "After you Battle, if you lost at least 10 warriors, gain a treasure from the market.";
        }, {
            readonly name: "Relentless";
            readonly ability: "If you double your move, gain +1 Wild Advantage.";
        }];
    };
    readonly 'Orphaned Scion': {
        readonly name: "Orphaned Scion";
        readonly expansion: "Base Game";
        readonly bannerAction: "Gain 1 spirit.";
        readonly defaultVirtues: readonly [{
            readonly name: "Arcane";
            readonly ability: "+1 Magic Advantage.";
        }, {
            readonly name: "Generous";
            readonly ability: "After you Cleanse, remove 1 skull from any building.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Infused";
            readonly ability: "At the start of your turn, remove 1 skull from a building in your home kingdom.";
        }, {
            readonly name: "Blessed";
            readonly ability: "Spend 1 spirit to prevent up to 6 warrior losses from a battle card or dungeon room.";
        }, {
            readonly name: "Anointed";
            readonly ability: "+1 Wild Advantage for each building with no skulls on or adjacent to your space.";
        }];
    };
    readonly 'Relic Hunter': {
        readonly name: "Relic Hunter";
        readonly expansion: "Base Game";
        readonly bannerAction: "Gain 1 potion.";
        readonly defaultVirtues: readonly [{
            readonly name: "Precise";
            readonly ability: "+1 Humanoid Advantage.";
        }, {
            readonly name: "Prepared";
            readonly ability: "When you Reinforce at a bazaar, spend 1 less spirit to gain a treasure.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Crafty";
            readonly ability: "When you spend a potion, double the number on it.";
        }, {
            readonly name: "Lucky";
            readonly ability: "When you spend (not lose) a treasure, gain the top card of the treasure deck.";
        }, {
            readonly name: "Inventive";
            readonly ability: "Spend 4 potions to remove a foe from your space.";
        }];
    };
    readonly 'Haunted Recluse': {
        readonly name: "Haunted Recluse";
        readonly expansion: "Alliances";
        readonly bannerAction: "Move 1 skull from any building to any other building with 2 or fewer skulls.";
        readonly defaultVirtues: readonly [{
            readonly name: "Spiritreaver";
            readonly ability: "+1 Undead Advantage.";
        }, {
            readonly name: "Skullweaver";
            readonly ability: "When a skull emerges in your home kingdom, you can place it on any building with 2 or fewer skulls in any kingdom.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Shadowspinner";
            readonly ability: "+1 Wild Advantage for each building with skulls on or adjacent to your space.";
        }, {
            readonly name: "Soulreaper";
            readonly ability: "Prevent up to 2 warrior losses per battle card for each skull on or adjacent to your space.";
        }, {
            readonly name: "Sinbearer";
            readonly ability: "At the end of the month you can spend up to 12 warriors to remove all skulls from your current kingdom.";
        }];
    };
    readonly Archwright: {
        readonly name: "Archwright";
        readonly expansion: "Alliances";
        readonly bannerAction: "Place a battlement on any space or move a battlement up to 2 spaces.";
        readonly defaultVirtues: readonly [{
            readonly name: "Innovative";
            readonly ability: "+1 Beast Advantage.";
        }, {
            readonly name: "Clever";
            readonly ability: "Battlements give you +2 Wild Advantages (instead of +1).";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Tactical";
            readonly ability: "While on a battlement, you can Battle a foe on an adjacent space. (Terrain advantages use the space you are on.)";
        }, {
            readonly name: "Wily";
            readonly ability: "Battlements give you advantages when you Quest (in addition to when you Battle).";
        }, {
            readonly name: "Exalted";
            readonly ability: "While on a battlement, you may Cleanse to remove skulls from all adjacent buildings.";
        }];
    };
    readonly 'Relentless Warden': {
        readonly name: "Relentless Warden";
        readonly expansion: "Covenant";
        readonly bannerAction: "Place quarry token on a foe if it is not already, else move quarry token up to 2 spaces.";
        readonly defaultVirtues: readonly [{
            readonly name: "Perceptive";
            readonly ability: "+1 Wild Advantage vs. your quarry.";
        }, {
            readonly name: "Guarded";
            readonly ability: "Prevent up to 3 warrior losses per battle card when you Battle your quarry.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Keen-Eyed";
            readonly ability: "+2 Wild Advantages vs. your quarry.";
        }, {
            readonly name: "Instinctive";
            readonly ability: "You may remove your quarry token to ignore your quarry during its strike event.";
        }, {
            readonly name: "Inspiring";
            readonly ability: "When you defeat your quarry, remove all skulls on or adjacent to your space.";
        }];
    };
    readonly 'Undaunted Aegis': {
        readonly name: "Undaunted Aegis";
        readonly expansion: "Covenant";
        readonly bannerAction: "For each corruption you have, gain 3 warriors. You may spend 10 warriors to remove one of your corruptions.";
        readonly defaultVirtues: readonly [{
            readonly name: "Ascetic";
            readonly ability: "Gain 1 spirit for each battle card you spend no advantages on.";
        }, {
            readonly name: "Iron-Willed";
            readonly ability: "You can have an additional corruption. Start the game with 1 random corruption.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Emboldened";
            readonly ability: "+1 Wild Advantage for each corruption you have.";
        }, {
            readonly name: "Resolute";
            readonly ability: "When you Reinforce, spend 1 less spirit for each corruption you have.";
        }, {
            readonly name: "Steeled";
            readonly ability: "Once per turn, if another hero would gain a corruption, you may gain it instead and gain 2 spirit.";
        }];
    };
    readonly 'Devious Swindler': {
        readonly name: "Devious Swindler";
        readonly expansion: "Covenant";
        readonly bannerAction: "Roll the haggle die and gain the result.";
        readonly defaultVirtues: readonly [{
            readonly name: "Inventive";
            readonly ability: "When you Battle, gain all advantages in the treasure market.";
        }, {
            readonly name: "Joyful";
            readonly ability: "When you roll the haggle die, ignore the Cancelled symbol.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Fortuitous";
            readonly ability: "After you roll the haggle die, you may reroll once and take either result.";
        }, {
            readonly name: "Opportunistic";
            readonly ability: "When any player gains a treasure from the treasure market, you gain a blessing.";
        }, {
            readonly name: "Calculating";
            readonly ability: "You may ignore warrior and spirit losses on critical hit battle cards.";
        }];
    };
    readonly 'Reverent Astromancer': {
        readonly name: "Reverent Astromancer";
        readonly expansion: "Covenant";
        readonly bannerAction: "Remove a skull on or adjacent to your space.";
        readonly defaultVirtues: readonly [{
            readonly name: "Well Versed";
            readonly ability: "If you remove a skull with your Banner action, gain a blessing.";
        }, {
            readonly name: "Pious";
            readonly ability: "At the start of each month, prepare spells equal to the month number.";
        }];
        readonly unlockableVirtues: readonly [{
            readonly name: "Exalted";
            readonly ability: "You can prepare invocations.";
        }, {
            readonly name: "Zealous";
            readonly ability: "Whenever you cast a spell, gain a blessing.";
        }, {
            readonly name: "Bounteous";
            readonly ability: "Once per turn, when you cast a spell, gain the top card of the treasure deck.";
        }];
    };
};
export type HeroName = keyof typeof HEROES;
export type VirtueName = (typeof HEROES)[HeroName]['defaultVirtues'][number]['name'] | (typeof HEROES)[HeroName]['unlockableVirtues'][number]['name'];
/** Heroes as a list, for iteration. */
export declare const heroes: readonly Hero[];
/** A non-adversary foe (levels 2–4). */
export interface Foe {
    readonly name: string;
    readonly level: 2 | 3 | 4;
}
/** Foes keyed by name. The adversary (level 5) lives in ADVERSARIES. */
export declare const FOES: {
    readonly Brigands: {
        readonly name: "Brigands";
        readonly level: 2;
    };
    readonly Oreks: {
        readonly name: "Oreks";
        readonly level: 2;
    };
    readonly 'Shadow Wolves': {
        readonly name: "Shadow Wolves";
        readonly level: 2;
    };
    readonly 'Spine Fiend': {
        readonly name: "Spine Fiend";
        readonly level: 2;
    };
    readonly 'Clan Of Neuri': {
        readonly name: "Clan Of Neuri";
        readonly level: 3;
    };
    readonly 'Frost Troll': {
        readonly name: "Frost Troll";
        readonly level: 3;
    };
    readonly Lemure: {
        readonly name: "Lemure";
        readonly level: 3;
    };
    readonly 'Widowmade Spider': {
        readonly name: "Widowmade Spider";
        readonly level: 3;
    };
    readonly Dragon: {
        readonly name: "Dragon";
        readonly level: 4;
    };
    readonly Mormo: {
        readonly name: "Mormo";
        readonly level: 4;
    };
    readonly Striga: {
        readonly name: "Striga";
        readonly level: 4;
    };
    readonly Titan: {
        readonly name: "Titan";
        readonly level: 4;
    };
};
export type FoeName = keyof typeof FOES;
export declare const foes: readonly Foe[];
/** An adversary (the level-5 "foe"). */
export interface Adversary {
    readonly name: string;
    readonly level: 5;
}
/** Adversaries keyed by name. */
export declare const ADVERSARIES: {
    readonly Ashstrider: {
        readonly name: "Ashstrider";
        readonly level: 5;
    };
    readonly 'Bane Of Omens': {
        readonly name: "Bane Of Omens";
        readonly level: 5;
    };
    readonly 'Empress Of Shades': {
        readonly name: "Empress Of Shades";
        readonly level: 5;
    };
    readonly 'Gaze Eternal': {
        readonly name: "Gaze Eternal";
        readonly level: 5;
    };
    readonly Gravemaw: {
        readonly name: "Gravemaw";
        readonly level: 5;
    };
    readonly 'Isa The Exile': {
        readonly name: "Isa The Exile";
        readonly level: 5;
    };
    readonly 'Lingering Rot': {
        readonly name: "Lingering Rot";
        readonly level: 5;
    };
    readonly "U'tuk-Ku The Ice Herald": {
        readonly name: "U'tuk-Ku The Ice Herald";
        readonly level: 5;
    };
};
export type AdversaryName = keyof typeof ADVERSARIES;
export declare const adversaries: readonly Adversary[];
/** A companion ally and their title/epithet. */
export interface Companion {
    readonly name: string;
    readonly title: string;
}
/** Companions keyed by name. */
export declare const COMPANIONS: {
    readonly Gleb: {
        readonly name: "Gleb";
        readonly title: "The Outlaw King";
    };
    readonly Grigor: {
        readonly name: "Grigor";
        readonly title: "The Unbreakable";
    };
    readonly Hakan: {
        readonly name: "Hakan";
        readonly title: "The Artificer";
    };
    readonly Letha: {
        readonly name: "Letha";
        readonly title: "The Dryad";
    };
    readonly Miras: {
        readonly name: "Miras";
        readonly title: "The Horselord";
    };
    readonly Nimet: {
        readonly name: "Nimet";
        readonly title: "The Fathomless";
    };
    readonly Tomas: {
        readonly name: "Tomas";
        readonly title: "The Scout";
    };
    readonly Vasa: {
        readonly name: "Vasa";
        readonly title: "The Devine";
    };
    readonly Yana: {
        readonly name: "Yana";
        readonly title: "The Assassin";
    };
    readonly Zaida: {
        readonly name: "Zaida";
        readonly title: "The Efreet";
    };
};
export type CompanionName = keyof typeof COMPANIONS;
export declare const companions: readonly Companion[];
/** Kingdom virtues, keyed by kingdom direction. A hero takes the one for their
 *  home/seating kingdom at setup (not hero-specific). */
export declare const KINGDOM_VIRTUES: {
    readonly East: {
        readonly name: "Champion of the East";
        readonly ability: "+2 Wild Advantages in hills.";
    };
    readonly North: {
        readonly name: "Champion of the North";
        readonly ability: "+2 Wild Advantages in mountains.";
    };
    readonly South: {
        readonly name: "Champion of the South";
        readonly ability: "+2 Wild Advantages in deserts.";
    };
    readonly West: {
        readonly name: "Champion of the West";
        readonly ability: "+2 Wild Advantages in forests.";
    };
};
export type KingdomDirection = keyof typeof KINGDOM_VIRTUES;
export declare const kingdomVirtues: readonly Virtue[];
