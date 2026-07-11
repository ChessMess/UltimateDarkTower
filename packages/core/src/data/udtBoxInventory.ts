// Return to Dark Tower — box inventory (physical component counts).
// "What's in the box" data for UDT apps. Gameplay content lives in udtGameContent.ts.
// Source: "RTDT Expansion Info v2.xlsx" (categories with < 2 entries were skipped).

/** Top-level grouping a category sits under on a component sheet. */
export type Section = 'Misc' | 'Tokens' | 'Cards' | 'Minis';

/** A single line-item. Only `count` is always present; the rest describe the item
 *  depending on its category (name, color, type, level, and/or description). */
export interface Component {
    name?: string;
    color?: string;
    type?: string;
    level?: number;
    description?: string;
    count: number;
}

/** A category (column-group) of components within an expansion. */
export interface Category {
    name: string;
    section: Section;
    components: Component[];
}

/** A boxed expansion (or the base game) made up of categorized components. */
export interface Expansion {
    name: string;
    categories: Category[];
}

export interface TokenDenomination {
    name: string;
    count: number;
}
export interface CofferTokenSet {
    resource: string;
    denominations: TokenDenomination[];
    total: number;
}
export interface TokenPack {
    tokens: Component[];
    total: number;
}
export interface SleeveType {
    name: string;
    purposes: string[];
}

export const expansions: Expansion[] = [
    {
        name: 'Base Game',
        categories: [
            {
                name: 'Manuals / Sheets',
                section: 'Misc',
                components: [
                    { name: 'Are You Ready To Take On The Tower', count: 1 },
                    { name: 'Re-Pack Sheet', count: 1 },
                    { name: 'Rulebook', count: 1 },
                ],
            },
            {
                name: 'Tower',
                section: 'Misc',
                components: [
                    { name: 'Seals', count: 12 },
                    { name: 'Tower', count: 1 },
                ],
            },
            {
                name: 'Boards',
                section: 'Misc',
                components: [
                    { name: 'Brutal Warlord', count: 1 },
                    { name: 'Game Board', count: 1 },
                    { name: 'Orphaned Scion', count: 1 },
                    { name: 'Relic Hunter', count: 1 },
                    { name: 'Spymaster', count: 1 },
                ],
            },
            {
                name: 'Minis',
                section: 'Misc',
                components: [
                    { name: 'Bazaars', count: 4 },
                    { name: 'Citadels', count: 4 },
                    { name: 'Hero Figures', count: 4 },
                    { name: 'Sanctuaries', count: 4 },
                    { name: 'Villages', count: 4 },
                ],
            },
            {
                name: 'Mini Bases',
                section: 'Misc',
                components: [
                    { color: 'Blue', count: 1 },
                    { color: 'Brown', count: 1 },
                    { color: 'Green', count: 1 },
                    { color: 'White', count: 1 },
                ],
            },
            {
                name: 'Dungeons',
                section: 'Tokens',
                components: [
                    { name: 'Cave', count: 1 },
                    { name: 'Encampment', count: 1 },
                    { name: 'Fortress', count: 1 },
                    { name: 'Ruins', count: 1 },
                    { name: 'Shrine', count: 1 },
                    { name: 'Tomb', count: 1 },
                ],
            },
            {
                name: 'Foes / Adversaries',
                section: 'Tokens',
                components: [
                    { name: 'Brigands', level: 2, count: 8 },
                    { name: 'Oreks', level: 2, count: 6 },
                    { name: 'Shadow Wolves', level: 2, count: 8 },
                    { name: 'Spine Fiend', level: 2, count: 6 },
                    { name: 'Clan Of Neuri', level: 3, count: 5 },
                    { name: 'Frost Troll', level: 3, count: 4 },
                    { name: 'Lemure', level: 3, count: 6 },
                    { name: 'Widowmade Spider', level: 3, count: 5 },
                    { name: 'Dragon', level: 4, count: 2 },
                    { name: 'Mormo', level: 4, count: 4 },
                    { name: 'Striga', level: 4, count: 2 },
                    { name: 'Titan', level: 4, count: 1 },
                    { name: 'Ashstrider', level: 5, count: 1 },
                    { name: 'Bane Of Omens', level: 5, count: 1 },
                    { name: 'Empress Of Shades', level: 5, count: 1 },
                    { name: 'Gaze Eternal', level: 5, count: 1 },
                    { name: 'Gravemaw', level: 5, count: 1 },
                    { name: 'Isa The Exile', level: 5, count: 1 },
                    { name: 'Lingering Rot', level: 5, count: 1 },
                    { name: "U'tuk-Ku The Ice Herald", level: 5, count: 1 },
                ],
            },
            {
                name: 'Quest Markers & Bases',
                section: 'Tokens',
                components: [
                    { name: 'Adversary', count: 1 },
                    { name: 'Companion', count: 1 },
                    { name: 'Main Goal', count: 1 },
                ],
            },
            {
                name: 'Special',
                section: 'Tokens',
                components: [
                    { name: 'Caravans', type: 'Eastern', count: 1 },
                    { name: 'Caravans', type: 'Northern', count: 1 },
                    { name: 'Caravans', type: 'Western', count: 1 },
                    { name: 'River Of Fire', count: 4 },
                    { name: 'Siege Trees', count: 8 },
                    { name: 'Spores', count: 8 },
                ],
            },
            {
                name: 'Spirits',
                section: 'Tokens',
                components: [
                    { name: "1's", count: 25 },
                    { name: "5's", count: 19 },
                ],
            },
            {
                name: 'Virtues',
                section: 'Tokens',
                components: [
                    { name: 'Anointed', count: 1 },
                    { name: 'Blessed', count: 1 },
                    { name: 'Callous', count: 1 },
                    { name: 'Champion Of The East', count: 1 },
                    { name: 'Champion Of The North', count: 1 },
                    { name: 'Champion Of The South', count: 1 },
                    { name: 'Champion Of The West', count: 1 },
                    { name: 'Crafty', count: 1 },
                    { name: 'Fortunate', count: 1 },
                    { name: 'Infused', count: 1 },
                    { name: 'Inspiring', count: 1 },
                    { name: 'Inventive', count: 1 },
                    { name: 'Lucky', count: 1 },
                    { name: 'Relentless', count: 1 },
                    { name: 'Resourceful', count: 1 },
                    { name: 'Unseen', count: 1 },
                ],
            },
            {
                name: 'Warriors',
                section: 'Tokens',
                components: [
                    { name: "1's", count: 30 },
                    { name: "5's", count: 25 },
                ],
            },
            {
                name: 'Companion',
                section: 'Cards',
                components: [
                    { name: 'Gleb', description: 'The Outlaw King', count: 1 },
                    { name: 'Grigor', description: 'The Unbreakable', count: 1 },
                    { name: 'Hakan', description: 'The Artificer', count: 1 },
                    { name: 'Letha', description: 'The Dryad', count: 1 },
                    { name: 'Miras', description: 'The Horselord', count: 1 },
                    { name: 'Nimet', description: 'The Fathomless', count: 1 },
                    { name: 'Tomas', description: 'The Scout', count: 1 },
                    { name: 'Vasa', description: 'The Devine', count: 1 },
                    { name: 'Yana', description: 'The Assassin', count: 1 },
                    { name: 'Zaida', description: 'The Efreet', count: 1 },
                ],
            },
            {
                name: 'Corruption',
                section: 'Cards',
                components: [
                    { name: 'Cruel', count: 1 },
                    { name: 'Cursed', count: 1 },
                    { name: 'Feeble', count: 1 },
                    { name: 'Feral', count: 1 },
                    { name: 'Feverish', count: 1 },
                    { name: 'Greedy', count: 1 },
                    { name: 'Lost', count: 1 },
                    { name: 'Selfish', count: 1 },
                    { name: 'Suspicious', count: 1 },
                    { name: 'Tempted', count: 1 },
                    { name: 'Uncertain', count: 1 },
                    { name: 'Weak', count: 1 },
                ],
            },
            {
                name: 'Foes',
                section: 'Cards',
                components: [
                    { name: 'Brigands', level: 2, count: 1 },
                    { name: 'Oreks', level: 2, count: 1 },
                    { name: 'Shadow Wolves', level: 2, count: 1 },
                    { name: 'Spine Fiend', level: 2, count: 1 },
                    { name: 'Clan Of Neuri', level: 3, count: 1 },
                    { name: 'Frost Troll', level: 3, count: 1 },
                    { name: 'Lemure', level: 3, count: 1 },
                    { name: 'Widowmade Spider', level: 3, count: 1 },
                    { name: 'Dragon', level: 4, count: 1 },
                    { name: 'Mormo', level: 4, count: 1 },
                    { name: 'Striga', level: 4, count: 1 },
                    { name: 'Titan', level: 4, count: 1 },
                    { name: 'Ashstrider', level: 5, count: 1 },
                    { name: 'Bane Of Omens', level: 5, count: 1 },
                    { name: 'Empress Of Shades', level: 5, count: 1 },
                    { name: 'Gaze Eternal', level: 5, count: 1 },
                    { name: 'Gravemaw', level: 5, count: 1 },
                    { name: 'Isa The Exile', level: 5, count: 1 },
                    { name: 'Lingering Rot', level: 5, count: 1 },
                    { name: "U'tuk-Ku The Ice Herald", level: 5, count: 1 },
                ],
            },
            {
                name: 'Gear',
                section: 'Cards',
                components: [
                    { name: 'Blessed Scepters', count: 3 },
                    { name: 'Brass Talismans', count: 3 },
                    { name: 'Dusky Cloaks', count: 3 },
                    { name: 'LeaTher Armor', count: 3 },
                    { name: 'Longswords', count: 3 },
                    { name: 'Trusted Maps', count: 3 },
                ],
            },
            {
                name: 'Heroic Tests',
                section: 'Cards',
                components: [
                    { name: 'Finish Building The Shrine', type: 'Compassion', count: 1 },
                    { name: 'Suffer With The Silent Sisters', type: 'Compassion', count: 1 },
                    { name: 'Guide Abandoned Pilgrims', type: 'Compassion', count: 1 },
                    { name: 'Hold A Moonless Vigil', type: 'Compassion', count: 1 },
                    { name: 'Perform The Song Of Peril', type: 'Prowess', count: 1 },
                    { name: 'Race To The Golden Obelisk', type: 'Prowess', count: 1 },
                    { name: 'Solve The Riddle Of The Marid', type: 'Prowess', count: 1 },
                    { name: 'Survive The Drowned Barrows', type: 'Prowess', count: 1 },
                    { name: 'Consecrate Akartus', type: 'Sacrifice', count: 1 },
                    { name: "Lay Plovo's Ghost To Rest", type: 'Sacrifice', count: 1 },
                    { name: 'Repair The Weeping Damn', type: 'Sacrifice', count: 1 },
                    { name: 'Supply The WatchTowers', type: 'Sacrifice', count: 1 },
                    { name: 'Activate The Ley Lines', type: 'Valor', count: 1 },
                    { name: 'Impress The Winter Fey', type: 'Valor', count: 1 },
                    { name: 'Protect The Radiant Castle', type: 'Valor', count: 1 },
                    { name: "Win Egan's Tournament", type: 'Valor', count: 1 },
                ],
            },
            {
                name: 'Potions',
                section: 'Cards',
                components: [
                    { name: 'Potion Of Dragon Teeth', count: 3 },
                    { name: "Potion Of Fortune's Favor", count: 3 },
                    { name: 'Potion Of one Thousand Strides', count: 3 },
                    { name: 'Potion Of Purifying Breath', count: 3 },
                    { name: 'Potion Of The Golden Sun', count: 3 },
                    { name: "Potion Of The Siren's Song", count: 3 },
                ],
            },
            {
                name: 'Quest Items',
                section: 'Cards',
                components: [
                    { name: 'Amulet Of Annihilation', count: 1 },
                    { name: 'Amulet Of Hope', count: 4 },
                    { name: 'Bezoar', count: 1 },
                    { name: 'Dragon Scales', count: 1 },
                    { name: 'Fulminating Silver', count: 1 },
                    { name: 'Golden Wolf Pelt', count: 1 },
                    { name: 'Herbal Remedy', count: 1 },
                    { name: 'Horn Of The Elements', count: 1 },
                    { name: 'Mark Of The Outlaw', count: 1 },
                    { name: 'Orb Of Pure Snow', count: 1 },
                    { name: 'Relic Of Light', count: 1 },
                    { name: "Smuggler's Coin", count: 1 },
                    { name: 'The Black Mark', count: 1 },
                    { name: "Tomas's Map", count: 1 },
                    { name: 'Tools Of The Saboteur', count: 1 },
                    { name: 'Turquoise Urn', count: 1 },
                    { name: 'Wraps Of Invisibility', count: 1 },
                ],
            },
            {
                name: 'Treasures',
                section: 'Cards',
                components: [
                    { name: 'Acorns Of The White Oak', count: 1 },
                    { name: 'Amulet Of The Marid', count: 1 },
                    { name: 'Axe Of Soul Rending', count: 1 },
                    { name: "Azkol's Banner", count: 1 },
                    { name: "Azkol's Horn", count: 1 },
                    { name: "Azkol's Idol", count: 1 },
                    { name: 'Circlet Of Conviction', count: 1 },
                    { name: 'Cloak Of Stars', count: 1 },
                    { name: 'Crown Of Azkol', count: 1 },
                    { name: 'Golden Mace Of Azkol', count: 1 },
                    { name: 'Hallowed Reliquary', count: 1 },
                    { name: "Kamaria's Carpet", count: 1 },
                    { name: 'Lamp Of Darkness', count: 1 },
                    { name: 'Lamp Of Hope', count: 1 },
                    { name: 'Necklace Of Haggling', count: 1 },
                    { name: 'Oakstone Bow', count: 1 },
                    { name: 'Scroll Of Burning Sands', count: 1 },
                    { name: 'Scroll Of The Great Serpent', count: 1 },
                    { name: 'Scroll Of Twilight Shadow', count: 1 },
                    { name: 'Spear Of Atish', count: 1 },
                    { name: 'Tears Of The Shedu', count: 1 },
                    { name: 'White Cauldron', count: 1 },
                ],
            },
        ],
    },
    {
        name: 'Alliances',
        categories: [
            {
                name: 'Boards',
                section: 'Misc',
                components: [
                    { name: 'Arcane Scouts', count: 1 },
                    { name: 'Archwright', count: 1 },
                    { name: 'Druids Circle', count: 1 },
                    { name: 'Heroic Action', count: 4 },
                    { name: 'Hunted Recluse', count: 1 },
                    { name: 'Influence Vessel', count: 1 },
                    { name: 'Paladins Order', count: 1 },
                    { name: 'Thieves Guild', count: 1 },
                ],
            },
            {
                name: 'Mini Bases',
                section: 'Misc',
                components: [
                    { color: 'Brown', count: 1 },
                    { color: 'Yellow', count: 1 },
                ],
            },
            {
                name: 'Flags',
                section: 'Misc',
                components: [
                    { type: 'Arcane Scouts', count: 1 },
                    { type: 'Druids Circle', count: 1 },
                    { type: 'Paladins Order', count: 1 },
                    { type: 'Thieves Guild', count: 1 },
                ],
            },
            {
                name: 'Skulls',
                section: 'Misc',
                components: [
                    { color: 'Blue (Frost)', count: 11 },
                    { color: 'Green (Blight)', count: 11 },
                    { color: 'Purple (Omen)', count: 11 },
                    { color: 'Red (Fire)', count: 11 },
                ],
            },
            {
                name: 'Influence',
                section: 'Tokens',
                components: [
                    { name: "1's", count: 17 },
                    { name: "5's", count: 23 },
                ],
            },
            {
                name: 'Virtues',
                section: 'Tokens',
                components: [
                    { name: 'Exalted', count: 1 },
                    { name: 'Shadowspinner', count: 1 },
                    { name: 'Sinbearer', count: 1 },
                    { name: 'Soulreaper', count: 1 },
                    { name: 'Tactical', count: 1 },
                    { name: 'Wily', count: 1 },
                ],
            },
            {
                name: 'Companion',
                section: 'Cards',
                components: [
                    { name: 'Amani', description: 'The Vizier', count: 1 },
                    { name: 'Berat', description: 'The Wizard', count: 1 },
                    { name: 'Burgoyn', description: 'The Herbalist', count: 1 },
                    { name: 'Ema', description: 'The Grand Merchant', count: 1 },
                    { name: 'Haraswa', description: 'The Pegasus', count: 1 },
                    { name: 'Lukas', description: 'The Plunderer', count: 1 },
                    { name: 'Maxim', description: 'The Beast', count: 1 },
                    { name: 'Omar', description: 'The Healer', count: 1 },
                    { name: 'Oola', description: 'The Nomad', count: 1 },
                    { name: 'Ruska', description: 'The Barbarian', count: 1 },
                    { name: 'Sanzhar', description: 'The Zealot', count: 1 },
                    { name: 'Xyr', description: 'The Oracle', count: 1 },
                ],
            },
            {
                name: 'Treasures',
                section: 'Cards',
                components: [
                    { name: 'Coffer Of The Master Thief', count: 1 },
                    { name: 'Crystal Blade', count: 1 },
                    { name: 'Crystal Platemail', count: 1 },
                    { name: 'Crystal Shield', count: 1 },
                    { name: 'Diadem Of The Emmisary', count: 1 },
                    { name: "Druid's Incense", count: 1 },
                    { name: 'Everlasting Brazier', count: 1 },
                    { name: 'Ewer Of The Silent Child', count: 1 },
                    { name: 'Forbidden Grimoire', count: 1 },
                    { name: 'Iron Hound Of Azkol', count: 1 },
                    { name: 'Jeweled Goblet Of Azkol', count: 1 },
                    { name: "Paladin's Greatshield", count: 1 },
                    { name: 'Ring Of The Emmisary', count: 1 },
                    { name: 'Robes Of The Last Sultan', count: 1 },
                    { name: 'Scroll Of Forged Friendship', count: 1 },
                    { name: 'Standard Of The Scouts', count: 1 },
                    { name: 'Staff Of Wishes', count: 1 },
                    { name: "Trebblok's Hammer", count: 1 },
                    { name: 'Vestments Of The Emmisary', count: 1 },
                    { name: "Zemayir's Teeth", count: 1 },
                ],
            },
        ],
    },
    {
        name: 'Covenant',
        categories: [
            {
                name: 'Boards',
                section: 'Misc',
                components: [
                    { name: 'Devious Swindler', count: 1 },
                    { name: 'Relentless Warden', count: 1 },
                    { name: 'Reverent Astromancer', count: 1 },
                    { name: 'Undaunted Aegis', count: 1 },
                ],
            },
            {
                name: 'Mini Bases',
                section: 'Misc',
                components: [
                    { color: 'Blue', count: 1 },
                    { color: 'Brown', count: 1 },
                    { color: 'Green', count: 1 },
                    { color: 'Orange', count: 1 },
                ],
            },
            {
                name: 'Monuments',
                section: 'Misc',
                components: [
                    { type: 'Arch of the Golden Sun', count: 1 },
                    { type: 'Argent Oak', count: 1 },
                    { type: 'Cenotaph of the First Prophet', count: 1 },
                    { type: 'Colossus of Bjorn', count: 1 },
                    { type: 'Endless Necropolis', count: 1 },
                    { type: 'Moonstone Temple', count: 1 },
                    { type: 'Nightmare Cage', count: 1 },
                    { type: 'Tower Shard', count: 1 },
                ],
            },
            {
                name: 'Foundation',
                section: 'Tokens',
                components: [
                    { name: 'Arch of the Golden Sun / Nightmare Cage', count: 1 },
                    { name: 'Argent Oak / Moonstone Temple', count: 1 },
                    { name: 'Cenotaph of the First Prophet / Tower Shard', count: 1 },
                    { name: 'Colossus of Bjorn / Endless Necropolis', count: 1 },
                ],
            },
            {
                name: 'Virtues',
                section: 'Tokens',
                components: [
                    { name: 'Bounteous', count: 1 },
                    { name: 'Exalted', count: 1 },
                    { name: 'Zealous', count: 1 },
                    { name: 'Emboldened', count: 1 },
                    { name: 'Resolute', count: 1 },
                    { name: 'Steeled', count: 1 },
                    { name: 'Keen-Eyed', count: 1 },
                    { name: 'Inspiring', count: 1 },
                    { name: 'Instinctive', count: 1 },
                    { name: 'Calculating', count: 1 },
                    { name: 'Opportunistic', count: 1 },
                    { name: 'Fortuitous', count: 1 },
                ],
            },
            {
                name: 'Corruption',
                section: 'Cards',
                components: [
                    { name: 'Aquaphobic', count: 1 },
                    { name: 'Arrogant', count: 1 },
                    { name: 'Crestfallen', count: 1 },
                    { name: 'Disreputable', count: 1 },
                    { name: 'Fatigued', count: 1 },
                    { name: 'Indolent', count: 1 },
                    { name: 'Inobservant', count: 1 },
                    { name: 'Reckless', count: 1 },
                    { name: 'Shaken', count: 1 },
                    { name: 'Snobby', count: 1 },
                    { name: 'Timid', count: 1 },
                    { name: 'Vain', count: 1 },
                ],
            },
            {
                name: 'Invocation',
                section: 'Cards',
                components: [
                    { name: 'Abate the Darkness', count: 1 },
                    { name: 'Celestial Jaunt', count: 1 },
                    { name: 'Commanding Rebuke', count: 1 },
                    { name: 'Smite the Wicked', count: 1 },
                ],
            },
            {
                name: 'Monument',
                section: 'Cards',
                components: [
                    { name: 'Arch of the Golden Sun', description: 'Bazaar', count: 1 },
                    { name: 'Argent Oak', description: 'Sanctuary', count: 1 },
                    { name: 'Cenotaph of the First Prophet', description: 'Citadel', count: 1 },
                    { name: 'Colossus of Bjorn', description: 'Village', count: 1 },
                    { name: 'Endless Necropolis', description: 'Village', count: 1 },
                    { name: 'Moonstone Temple', description: 'Sanctuary', count: 1 },
                    { name: 'Nightmare Cage', description: 'Bazaar', count: 1 },
                    { name: 'Tower Shard', description: 'Citadel', count: 1 },
                ],
            },
            {
                name: 'Spell',
                section: 'Cards',
                components: [
                    { name: 'Aura of Friendship', count: 1 },
                    { name: 'Bestow Blessing', count: 1 },
                    { name: 'Bounty of the Gods', count: 1 },
                    { name: 'Ritual of Warding', count: 1 },
                    { name: 'Soothing Word', count: 1 },
                    { name: 'Winds of Change', count: 1 },
                ],
            },
            {
                name: 'Treasures',
                section: 'Cards',
                components: [
                    { name: "Archwright's Sledge", count: 1 },
                    { name: "Azkol's Chakram", count: 1 },
                    { name: "Azkol's Ichor", count: 1 },
                    { name: "Azkol's Scroll", count: 1 },
                    { name: "Azkol's Vambraces", count: 1 },
                    { name: 'Beacon Stone', count: 1 },
                    { name: "Brutal Warlord's Bell", count: 1 },
                    { name: 'Everfilled Chest', count: 1 },
                    { name: 'Grim Whisper', count: 1 },
                    { name: "Haunted Recluse's Effigy", count: 1 },
                    { name: 'Opal of Protection', count: 1 },
                    { name: "Orhpaned Scion's Charm", count: 1 },
                    { name: "Relic Hunter's Flagon", count: 1 },
                    { name: 'Sanctified Flask', count: 1 },
                    { name: "Spymaster's Journal", count: 1 },
                    { name: 'Tent of Revelry', count: 1 },
                    { name: 'The Iron Wall', count: 1 },
                    { name: 'Wand of Celerity', count: 1 },
                    { name: 'Wand of Conflagration', count: 1 },
                    { name: 'Wand of Pacification', count: 1 },
                ],
            },
        ],
    },
    {
        name: 'Dark Horde',
        categories: [
            {
                name: 'Storage Tray 1 (Top)',
                section: 'Minis',
                components: [
                    { name: 'Briagands', count: 8 },
                    { name: 'Clan Of Neuri', count: 5 },
                    { name: 'Isa The Exile', count: 1 },
                    { name: 'Lemure', count: 6 },
                    { name: 'Mormo', count: 4 },
                    { name: 'Oreks', count: 6 },
                    { name: 'Shadow Wolves', count: 8 },
                    { name: 'Spine Fiend', count: 6 },
                    { name: 'Widowmade Spider', count: 5 },
                ],
            },
            {
                name: 'Storage Tray 2 (Bottom)',
                section: 'Minis',
                components: [
                    { name: 'Frost Trolls', count: 4 },
                    { name: 'Gravemaw', count: 1 },
                    { name: 'Dragon', count: 2 },
                    { name: 'Empress Of Shades', count: 1 },
                    { name: 'Bane Of Omens', count: 1 },
                    { name: 'Lingering Rot', count: 1 },
                    { name: 'Striga', count: 2 },
                    { name: 'Ashstrider', count: 1 },
                    { name: 'Titan', count: 1 },
                    { name: 'Gaze Eternal', count: 1 },
                    { name: "U'tuk-Ku The Ice Herald", count: 1 },
                    { name: 'Main Goal Marker', count: 1 },
                    { name: 'Guild Quest Marker', count: 1 },
                    { name: 'Adversary Quest Marker', count: 1 },
                    { name: 'Companion Quest Marker', count: 1 },
                ],
            },
        ],
    },
];

/** Expansions keyed by name. */
export const EXPANSIONS: Record<string, Expansion> = expansions.reduce(
    (acc, e) => {
        acc[e.name] = e;
        return acc;
    },
    {} as Record<string, Expansion>
);

export const coffers: CofferTokenSet[] = [
    {
        resource: 'Influence',
        denominations: [
            { name: "1's", count: 8 },
            { name: "5's", count: 17 },
        ],
        total: 25,
    },
    {
        resource: 'Spirits',
        denominations: [
            { name: "1's", count: 24 },
            { name: "5's", count: 16 },
        ],
        total: 40,
    },
    {
        resource: 'Warriors',
        denominations: [
            { name: "1's", count: 28 },
            { name: "5's", count: 22 },
        ],
        total: 50,
    },
];

export const coffers2: TokenPack = {
    tokens: [
        { name: 'Advantage', count: 10 },
        { name: 'Charge', count: 10 },
        { name: 'Foundation', count: 4 },
        { name: 'Guild', count: 4 },
        { name: 'Protection', count: 6 },
        { name: 'Quarry', count: 1 },
        { name: 'Wasteland', count: 32 },
    ],
    total: 67,
};

export const skullsPack: TokenPack = {
    tokens: [
        { name: 'White (Normal)', count: 10 },
        { name: 'Black (Doom)', count: 2 },
        { name: 'Blue (Frost)', count: 2 },
        { name: 'Green (Blight)', count: 2 },
        { name: 'Purple (Omen)', count: 2 },
        { name: 'Red (Fire)', count: 2 },
    ],
    total: 20,
};

export const sleeves: SleeveType[] = [
    { name: 'Printed Large Sleeves', purposes: ['Monuments', 'Treasure Cards'] },
    {
        name: 'Printed Mini Sleeves',
        purposes: ['Gear', 'Heroic Tests', 'Invocations', 'Potions', 'Quest Items', 'Spells'],
    },
    { name: 'Clear Large Sleeves', purposes: ['Companions', 'Foes'] },
    { name: 'Clear Mini Sleeves', purposes: ['Blessings', 'Corruptions'] },
];
