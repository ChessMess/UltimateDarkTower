// Glyph positions, light-sequence names, and the tower's audio catalog. These are game-domain
// vocabularies (what a glyph is called, what an adversary's cue is named) rather than BLE
// protocol — moved out of `ultimatedarktower` in v6. Byte values here are firmware contract and
// never change; only the labels/keys are game data.

export type Glyphs = 'cleanse' | 'quest' | 'battle' | 'banner' | 'reinforce';

// positions based on calibrated drum orientation
export const GLYPHS = {
  cleanse: { name: 'Cleanse', level: 'top', side: 'north' },
  quest: { name: 'Quest', level: 'top', side: 'south' },
  battle: { name: 'Battle', level: 'middle', side: 'north' },
  banner: { name: 'Banner', level: 'bottom', side: 'north' },
  reinforce: { name: 'Reinforce', level: 'bottom', side: 'south' },
};

export const TOWER_LIGHT_SEQUENCES = {
  twinkle: 0x01,
  flareThenFade: 0x02,
  flareThenFadeBase: 0x03,
  flareThenFlicker: 0x04,
  angryStrobe01: 0x05,
  angryStrobe02: 0x06,
  angryStrobe03: 0x07,
  gloat01: 0x08,
  gloat02: 0x09,
  gloat03: 0x0a,
  defeat: 0x0b,
  victory: 0x0c,
  dungeonIdle: 0x0d,
  sealReveal: 0x0e,
  rotationAllDrums: 0x0f,
  rotationDrumTop: 0x10,
  rotationDrumMiddle: 0x11,
  rotationDrumBottom: 0x12,
  monthStarted: 0x13,
  wholeTowerBreathing: 0x14,
  slowFlareThenFade: 0x15,
};

export type SoundCategory =
  | 'Adversary'
  | 'Ally'
  | 'Battle'
  | 'Classic'
  | 'Unlisted'
  | 'Dungeon'
  | 'Foe'
  | 'Spawn'
  | 'Quest'
  | 'Glyph'
  | 'State'
  | 'Seals';

export type AudioLibrary = {
  [name: string]: {
    name: string;
    value: number;
    category: SoundCategory;
  };
};

// prettier-ignore
export const TOWER_AUDIO_LIBRARY: AudioLibrary = {
  Ashstrider: { name: "Ashstrider", value: 0x01, category: "Adversary" },
  BaneofOmens: { name: "Bane of Omens", value: 0x02, category: "Adversary" },
  EmpressofShades: { name: "Empress of Shades", value: 0x03, category: "Adversary" },
  GazeEternal: { name: "Gaze Eternal", value: 0x04, category: "Adversary" },
  Gravemaw: { name: "Gravemaw", value: 0x05, category: "Adversary" },
  IsatheExile: { name: "Isa the Exile", value: 0x06, category: "Adversary" },
  LingeringRot: { name: "Lingering Rot", value: 0x07, category: "Adversary" },
  UtukKu: { name: "Utuk'Ku", value: 0x08, category: "Adversary" },
  Gleb: { name: "Gleb", value: 0x09, category: "Ally" },
  Grigor: { name: "Grigor", value: 0x0A, category: "Ally" },
  Hakan: { name: "Hakan", value: 0x0B, category: "Ally" },
  Letha: { name: "Letha", value: 0x0C, category: "Ally" },
  Miras: { name: "Miras", value: 0x0D, category: "Ally" },
  Nimet: { name: "Nimet", value: 0x0E, category: "Ally" },
  Tomas: { name: "Tomas", value: 0x0F, category: "Ally" },
  Vasa: { name: "Vasa", value: 0x10, category: "Ally" },
  Yana: { name: "Yana", value: 0x11, category: "Ally" },
  Zaida: { name: "Zaida", value: 0x12, category: "Ally" },
  ApplyAdvantage01: { name: "Apply Advantage 01", value: 0x13, category: "Battle" },
  ApplyAdvantage02: { name: "Apply Advantage 02", value: 0x14, category: "Battle" },
  ApplyAdvantage03: { name: "Apply Advantage 03", value: 0x15, category: "Battle" },
  ApplyAdvantage04: { name: "Apply Advantage 04", value: 0x16, category: "Battle" },
  ApplyAdvantage05: { name: "Apply Advantage 05", value: 0x17, category: "Battle" },
  MaxAdvantages: { name: "Max Advantages", value: 0x18, category: "Battle" },
  NoAdvantages: { name: "No Advantages", value: 0x19, category: "Battle" },
  AdversaryEscaped: { name: "Adversary Escaped", value: 0x1A, category: "Battle" },
  BattleButton: { name: "Battle Button", value: 0x1B, category: "Battle" },
  CardFlip01: { name: "Card Flip 01", value: 0x1C, category: "Battle" },
  CardFlip02: { name: "Card Flip 02", value: 0x1D, category: "Battle" },
  CardFlip03: { name: "Card Flip 03", value: 0x1E, category: "Battle" },
  CardFlipPaper01: { name: "Card Flip Paper 01", value: 0x1F, category: "Battle" },
  CardFlipPaper02: { name: "Card Flip Paper 02", value: 0x20, category: "Battle" },
  CardFlipPaper03: { name: "Card Flip Paper 03", value: 0x21, category: "Battle" },
  CardSelect01: { name: "Card Select 01", value: 0x22, category: "Battle" },
  CardSelect02: { name: "Card Select 02", value: 0x23, category: "Battle" },
  CardSelect03: { name: "Card Select 03", value: 0x24, category: "Battle" },
  BattleStart: { name: "Battle Start", value: 0x25, category: "Battle" },
  BattleVictory: { name: "Battle Victory", value: 0x26, category: "Battle" },
  ButtonHoldPressCombo: { name: "Button Hold Press Combo", value: 0x27, category: "Battle" },
  ButtonHold: { name: "Button Hold", value: 0x28, category: "Battle" },
  ButtonPress: { name: "Button Press", value: 0x29, category: "Battle" },
  ClassicAdvantageApplied: { name: "8-bit Advantage", value: 0x2A, category: "Classic" },
  ClassicAttackTower: { name: "8-bit Attack Tower", value: 0x2B, category: "Classic" },
  ClassicBazaar: { name: "8-bit Bazaar", value: 0x2C, category: "Classic" },
  ClassicConfirmation: { name: "8-bit Confirmation", value: 0x2D, category: "Classic" },
  ClassicDragons: { name: "8-bit Dragons", value: 0x2E, category: "Classic" },
  ClassicQuestFailed: { name: "8-bit Quest Failed", value: 0x2F, category: "Classic" },
  ClassicRetreat: { name: "8-bit Retreat", value: 0x30, category: "Classic" },
  ClassicStartMonth: { name: "8-bit Start Month", value: 0x31, category: "Classic" },
  ClassicStartDungeon: { name: "8-bit Start Dungeon", value: 0x32, category: "Classic" },
  ClassicTowerLost: { name: "8-bit Tower Lost", value: 0x33, category: "Classic" },
  ClassicUnsure: { name: "8-bit Unsure", value: 0x34, category: "Classic" },
  DungeonAdvantage01: { name: "Dungeon Advantage 01", value: 0x35, category: "Dungeon" },
  DungeonAdvantage02: { name: "Dungeon Advantage 02", value: 0x36, category: "Dungeon" },
  DungeonButton: { name: "Dungeon Button", value: 0x37, category: "Dungeon" },
  DungeonFootsteps: { name: "Dungeon Footsteps", value: 0x38, category: "Dungeon" },
  DungeonCaves: { name: "Dungeon Caves", value: 0x39, category: "Dungeon" },
  DungeonComplete: { name: "Dungeon Complete", value: 0x3A, category: "Dungeon" },
  DungeonEncampment: { name: "Dungeon Encampment", value: 0x3B, category: "Dungeon" },
  DungeonEscape: { name: "Dungeon Escape", value: 0x3C, category: "Dungeon" },
  DungeonFortress: { name: "Dungeon Fortress", value: 0x3D, category: "Dungeon" },
  DungeonRuins: { name: "Dungeon Ruins", value: 0x3E, category: "Dungeon" },
  DungeonShrine: { name: "Dungeon Shrine", value: 0x3F, category: "Dungeon" },
  DungeonTomb: { name: "Dungeon Tomb", value: 0x40, category: "Dungeon" },
  FoeEvent: { name: "Foe Event", value: 0x41, category: "Foe" },
  FoeSpawn: { name: "Foe Spawn", value: 0x42, category: "Foe" },
  Brigands: { name: "Brigands", value: 0x43, category: "Foe" },
  ClanofNeuri: { name: "Clan of Neuri", value: 0x44, category: "Foe" },
  Dragons: { name: "Dragons", value: 0x45, category: "Foe" },
  Lemures: { name: "Lemures", value: 0x46, category: "Foe" },
  LeveledUp: { name: "Leveled Up", value: 0x47, category: "Foe" },
  Mormos: { name: "Mormos", value: 0x48, category: "Foe" },
  Oreks: { name: "Oreks", value: 0x49, category: "Foe" },
  ShadowWolves: { name: "Shadow Wolves", value: 0x4A, category: "Foe" },
  SpineFiends: { name: "Spine Fiends", value: 0x4B, category: "Foe" },
  Striga: { name: "Striga", value: 0x4C, category: "Foe" },
  Titans: { name: "Titans", value: 0x4D, category: "Foe" },
  FrostTrolls: { name: "Frost Trolls", value: 0x4E, category: "Foe" },
  WidowmadeSpiders: { name: "Widowmade Spiders", value: 0x4F, category: "Foe" },
  AshstriderSpawn: { name: "Ashstrider Spawn", value: 0x50, category: "Spawn" },
  BaneofOmensSpawn: { name: "Bane of Omens Spawn", value: 0x51, category: "Spawn" },
  EmpressofShadesSpawn: { name: "Empress of Shades Spawn", value: 0x52, category: "Spawn" },
  GazeEternalSpawn: { name: "Gaze Eternal Spawn", value: 0x53, category: "Spawn" },
  GravemawSpawn: { name: "Gravemaw Spawn", value: 0x54, category: "Spawn" },
  IsatheExileSpawn: { name: "Isa the Exile Spawn", value: 0x55, category: "Spawn" },
  LingeringRotSpawn: { name: "Lingering Rot Spawn", value: 0x56, category: "Spawn" },
  UtukKuSpawn: { name: "Utuk'Ku Spawn", value: 0x57, category: "Spawn" },
  QuestComplete: { name: "Quest Complete", value: 0x58, category: "Quest" },
  TowerAllGlyphs: { name: "Tower All Glyphs", value: 0x59, category: "Glyph" },
  TowerAngry1: { name: "Tower Angry 1", value: 0x5A, category: "Glyph" },
  TowerAngry2: { name: "Tower Angry 2", value: 0x5B, category: "Glyph" },
  TowerAngry3: { name: "Tower Angry 3", value: 0x5C, category: "Glyph" },
  TowerAngry4: { name: "Tower Angry 4", value: 0x5D, category: "Glyph" },
  TowerConnected: { name: "Tower Connected", value: 0x5E, category: "State" },
  GameStart: { name: "Game Start", value: 0x5F, category: "State" },
  TowerGloat1: { name: "Tower Gloat 1", value: 0x60, category: "State" },
  TowerGloat2: { name: "Tower Gloat 2", value: 0x61, category: "State" },
  TowerGloat3: { name: "Tower Gloat 3", value: 0x62, category: "State" },
  TowerGlyph: { name: "Tower Glyph", value: 0x63, category: "State" },
  TowerIdle1: { name: "Tower Idle 1", value: 0x64, category: "State" },
  TowerIdle2: { name: "Tower Idle 2", value: 0x65, category: "State" },
  TowerIdle3: { name: "Tower Idle 3", value: 0x66, category: "State" },
  TowerIdle4: { name: "Tower Idle 4", value: 0x67, category: "State" },
  TowerIdle5: { name: "Tower Idle 5", value: 0x68, category: "Unlisted" },
  TowerDisconnected: { name: "Tower Disconnect", value: 0x69, category: "State" },
  MonthEnded: { name: "Month Ended", value: 0x6A, category: "State" },
  MonthStarted: { name: "Month Started", value: 0x6B, category: "State" },
  QuestFailed: { name: "Quest Failed", value: 0x6C, category: "Quest" },
  RotateExit: { name: "Rotate Exit", value: 0x6D, category: "Seals" },
  RotateLoop: { name: "Rotate Loop", value: 0x6E, category: "Seals" },
  RotateStart: { name: "Rotate Start", value: 0x6F, category: "Seals" },
  TowerSeal: { name: "Tower Seal", value: 0x70, category: "Seals" },
  TowerSkullDropped: { name: "Tower Skull Dropped", value: 0x71, category: "State" },
}
