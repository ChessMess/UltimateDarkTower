import { TOWER_AUDIO_LIBRARY } from 'ultimatedarktower';
import type { SoundPack } from './soundPack';

const A = TOWER_AUDIO_LIBRARY;

// Per-file `new URL('./assets/<literal>.ogg', import.meta.url)` is the
// canonical pattern recognised by every major bundler (Vite, esbuild,
// webpack 5+, Rollup, Parcel) and by native Node ESM. Each bundler detects
// the literal filename at build time, emits the asset to its output, and
// rewrites the expression to a literal URL string — no runtime evaluation
// of `import.meta.url` is needed, so the pattern survives IIFE/CJS targets
// where `import.meta` is stripped.
//
// OFFICIAL_AUDIO_FILES is the shared source of truth: `buildOfficialSoundPack`
// uses it to compose URLs against a custom base, while `samples` below
// references each filename inline so bundler asset detection works.

const OFFICIAL_AUDIO_FILES: Record<number, string> = {
  // === BEGIN AUTOGEN (scripts/extract-audio.mjs) ===
  [A.Ashstrider.value]: 'Adversary_Ashstrider_01.ogg',
  [A.BaneofOmens.value]: 'Adversary_Bane_01.ogg',
  [A.EmpressofShades.value]: 'Adversary_Empress_01.ogg',
  [A.GazeEternal.value]: 'Adversary_Gaze_01.ogg',
  [A.Gravemaw.value]: 'Adversary_Gravemaw_01.ogg',
  [A.IsatheHollow.value]: 'Adversary_Isa_01.ogg',
  [A.LingeringRot.value]: 'Adversary_Rot_03.ogg',
  [A.UtukKu.value]: 'Adversary_Utuk_03.ogg',
  [A.Gleb.value]: 'Ally_Gleb_05.ogg',
  [A.Grigor.value]: 'Ally_Grigor_01.ogg',
  [A.Hakan.value]: 'Ally_Hakan_02.ogg',
  [A.Letha.value]: 'Ally_Letha_02.ogg',
  [A.Miras.value]: 'Ally_Miras_01.ogg',
  [A.Nimet.value]: 'Ally_Nimet_01.ogg',
  [A.Tomas.value]: 'Ally_Tomas_03.ogg',
  [A.Vasa.value]: 'Ally_Vasa_03.ogg',
  [A.Yana.value]: 'Ally_Yana_01.ogg',
  [A.Zaida.value]: 'Ally_Zaida_01.ogg',
  [A.ApplyAdvantage01.value]: 'Battle_Advantage_Applied_01F.ogg',
  [A.ApplyAdvantage02.value]: 'Battle_Advantage_Applied_02.ogg',
  [A.ApplyAdvantage03.value]: 'Battle_Advantage_Applied_03.ogg',
  [A.ApplyAdvantage04.value]: 'Battle_Advantage_Applied_04.ogg',
  [A.ApplyAdvantage05.value]: 'Battle_Advantage_Applied_05.ogg',
  [A.MaxAdvantages.value]: 'Battle_Advantages_Maxed_01.ogg',
  [A.NoAdvantages.value]: 'Battle_Advantages_None_01.ogg',
  [A.AdversaryEscaped.value]: 'Battle_Adversary_Escape_01.ogg',
  [A.BattleButton.value]: 'Battle_Button_01.ogg',
  [A.CardFlip01.value]: 'Battle_Card_Flip_01.ogg',
  [A.CardFlip02.value]: 'Battle_Card_Flip_02.ogg',
  [A.CardFlip03.value]: 'Battle_Card_Flip_03.ogg',
  [A.CardFlipPaper01.value]: 'Battle_Card_Flip_Paper_01.ogg',
  [A.CardFlipPaper02.value]: 'Battle_Card_Flip_Paper_02.ogg',
  [A.CardFlipPaper03.value]: 'Battle_Card_Flip_Paper_03.ogg',
  [A.CardSelect01.value]: 'Battle_Card_Select_01.ogg',
  [A.CardSelect02.value]: 'Battle_Card_Select_02.ogg',
  [A.CardSelect03.value]: 'Battle_Card_Select_03.ogg',
  [A.BattleStart.value]: 'Battle_start_01.ogg',
  [A.BattleVictory.value]: 'Battle_Victory_01.ogg',
  [A.ButtonHoldPressCombo.value]: 'Button_HoldandPressComboDemo.ogg',
  [A.ButtonHold.value]: 'Button_Hold_01.ogg',
  [A.ButtonPress.value]: 'Button_Press_01.ogg',
  [A.ClassicAdvantageApplied.value]: 'Classic_AdvantageApplied.ogg',
  [A.ClassicAttackTower.value]: 'Classic_Attack_Tower.ogg',
  [A.ClassicBazaar.value]: 'Classic_Bazaar.ogg',
  [A.ClassicConfirmation.value]: 'Classic_Confirmation_Beep.ogg',
  [A.ClassicDragons.value]: 'Classic_DragonStrike.ogg',
  [A.ClassicQuestFailed.value]: 'Classic_Quest_Failure.ogg',
  [A.ClassicRetreat.value]: 'Classic_Retreat.ogg',
  [A.ClassicStartMonth.value]: 'Classic_StartOfMonth.ogg',
  [A.ClassicStartDungeon.value]: 'Classic_StartingDungeon.ogg',
  [A.ClassicTowerLost.value]: 'Classic_TowerLost.ogg',
  [A.ClassicUnsure.value]: 'Classic_Unsure_5.ogg',
  [A.DungeonAdvantage01.value]: 'Dungeon_Advantage_01.ogg',
  [A.DungeonAdvantage02.value]: 'Dungeon_Advantage_02.ogg',
  [A.DungeonButton.value]: 'Dungeon_Button_01.ogg',
  [A.DungeonFootsteps.value]: 'Dungeon_Button_Footsteps_01.ogg',
  [A.DungeonCaves.value]: 'Dungeon_Caves_01.ogg',
  [A.DungeonComplete.value]: 'Dungeon_Complete_01.ogg',
  [A.DungeonEncampment.value]: 'Dungeon_Encampment_01.ogg',
  [A.DungeonEscape.value]: 'Dungeon_Escape_01.ogg',
  [A.DungeonFortress.value]: 'Dungeon_Fortress_01.ogg',
  [A.DungeonRuins.value]: 'Dungeon_Ruins_01.ogg',
  [A.DungeonShrine.value]: 'Dungeon_Shrine_01.ogg',
  [A.DungeonTomb.value]: 'Dungeon_Tomb_01.ogg',
  [A.FoeEvent.value]: 'Event_Foe.ogg',
  [A.FoeSpawn.value]: 'Event_Spawn.ogg',
  [A.Brigands.value]: 'Foe_Brigands_03.ogg',
  [A.ClanofNeuri.value]: 'Foe_Clan_01.ogg',
  [A.Dragons.value]: 'Foe_Dragon_01.ogg',
  [A.Lemures.value]: 'Foe_Lemure_01.ogg',
  [A.LeveledUp.value]: 'Foe_Level_Up_01.ogg',
  [A.Mormos.value]: 'Foe_Mormo_01.ogg',
  [A.Oreks.value]: 'Foe_Oreks_01.ogg',
  [A.ShadowWolves.value]: 'Foe_Shadow_01.ogg',
  [A.SpineFiends.value]: 'Foe_Spine_01.ogg',
  [A.Strigas.value]: 'Foe_Striga_01.ogg',
  [A.Titans.value]: 'Foe_Titan_01.ogg',
  [A.FrostTrolls.value]: 'Foe_Troll_01.ogg',
  [A.WidowmadeSpiders.value]: 'Foe_Widowmade_01.ogg',
  [A.AshstriderSpawn.value]: 'MainObjectiveVictory_BossSpawn_Ashstrider.ogg',
  [A.BaneofOmensSpawn.value]: 'MainObjectiveVictory_BossSpawn_Bane.ogg',
  [A.EmpressofShadesSpawn.value]: 'MainObjectiveVictory_BossSpawn_Empress.ogg',
  [A.GazeEternalSpawn.value]: 'MainObjectiveVictory_BossSpawn_Gaze.ogg',
  [A.GravemawSpawn.value]: 'MainObjectiveVictory_BossSpawn_Gravemaw.ogg',
  [A.IsatheHollowSpawn.value]: 'MainObjectiveVictory_BossSpawn_Isa.ogg',
  [A.LingeringRotSpawn.value]: 'MainObjectiveVictory_BossSpawn_Rot.ogg',
  [A.UtukKuSpawn.value]: 'MainObjectiveVictory_BossSpawn_Utuk.ogg',
  [A.QuestComplete.value]: 'Quest_Complete_01.ogg',
  [A.TowerAllGlyphs.value]: 'Tower_All_Glyphs_01.ogg',
  [A.TowerAngry1.value]: 'Tower_Angry_01.ogg',
  [A.TowerAngry2.value]: 'Tower_Angry_02.ogg',
  [A.TowerAngry3.value]: 'Tower_Angry_03.ogg',
  [A.TowerAngry4.value]: 'Tower_Angry_04.ogg',
  [A.TowerConnected.value]: 'Tower_Connected_04.ogg',
  [A.GameStart.value]: 'Tower_Game_Start.ogg',
  [A.TowerGloat1.value]: 'Tower_Gloat_01.ogg',
  [A.TowerGloat2.value]: 'Tower_Gloat_02.ogg',
  [A.TowerGloat3.value]: 'Tower_Gloat_03.ogg',
  [A.TowerGlyph.value]: 'Tower_Glyph_01.ogg',
  [A.TowerIdle1.value]: 'Tower_Idle_01.ogg',
  [A.TowerIdle2.value]: 'Tower_Idle_02.ogg',
  [A.TowerIdle3.value]: 'Tower_Idle_03.ogg',
  [A.TowerIdle4.value]: 'Tower_Idle_04.ogg',
  [A.TowerIdle5.value]: 'Tower_Idle_05.ogg',
  [A.TowerDisconnected.value]: 'Tower_Lost_Connection_04.ogg',
  [A.MonthEnded.value]: 'Tower_Month_End_06.ogg',
  [A.MonthStarted.value]: 'Tower_Month_Start_01.ogg',
  [A.QuestFailed.value]: 'Tower_Quest_Failure.ogg',
  [A.RotateExit.value]: 'Tower_Rotate_Exit.ogg',
  [A.RotateLoop.value]: 'Tower_Rotate_Loop.ogg',
  [A.RotateStart.value]: 'Tower_Rotate_Start.ogg',
  [A.TowerSeal.value]: 'Tower_Seal_01.ogg',
  [A.TowerSkullDropped.value]: 'Tower_Skull_Drop_01.ogg',
};

const samples: Record<number, string> = {
  [A.Ashstrider.value]: new URL('./assets/Adversary_Ashstrider_01.ogg', import.meta.url).href,
  [A.BaneofOmens.value]: new URL('./assets/Adversary_Bane_01.ogg', import.meta.url).href,
  [A.EmpressofShades.value]: new URL('./assets/Adversary_Empress_01.ogg', import.meta.url).href,
  [A.GazeEternal.value]: new URL('./assets/Adversary_Gaze_01.ogg', import.meta.url).href,
  [A.Gravemaw.value]: new URL('./assets/Adversary_Gravemaw_01.ogg', import.meta.url).href,
  [A.IsatheHollow.value]: new URL('./assets/Adversary_Isa_01.ogg', import.meta.url).href,
  [A.LingeringRot.value]: new URL('./assets/Adversary_Rot_03.ogg', import.meta.url).href,
  [A.UtukKu.value]: new URL('./assets/Adversary_Utuk_03.ogg', import.meta.url).href,
  [A.Gleb.value]: new URL('./assets/Ally_Gleb_05.ogg', import.meta.url).href,
  [A.Grigor.value]: new URL('./assets/Ally_Grigor_01.ogg', import.meta.url).href,
  [A.Hakan.value]: new URL('./assets/Ally_Hakan_02.ogg', import.meta.url).href,
  [A.Letha.value]: new URL('./assets/Ally_Letha_02.ogg', import.meta.url).href,
  [A.Miras.value]: new URL('./assets/Ally_Miras_01.ogg', import.meta.url).href,
  [A.Nimet.value]: new URL('./assets/Ally_Nimet_01.ogg', import.meta.url).href,
  [A.Tomas.value]: new URL('./assets/Ally_Tomas_03.ogg', import.meta.url).href,
  [A.Vasa.value]: new URL('./assets/Ally_Vasa_03.ogg', import.meta.url).href,
  [A.Yana.value]: new URL('./assets/Ally_Yana_01.ogg', import.meta.url).href,
  [A.Zaida.value]: new URL('./assets/Ally_Zaida_01.ogg', import.meta.url).href,
  [A.ApplyAdvantage01.value]: new URL('./assets/Battle_Advantage_Applied_01F.ogg', import.meta.url).href,
  [A.ApplyAdvantage02.value]: new URL('./assets/Battle_Advantage_Applied_02.ogg', import.meta.url).href,
  [A.ApplyAdvantage03.value]: new URL('./assets/Battle_Advantage_Applied_03.ogg', import.meta.url).href,
  [A.ApplyAdvantage04.value]: new URL('./assets/Battle_Advantage_Applied_04.ogg', import.meta.url).href,
  [A.ApplyAdvantage05.value]: new URL('./assets/Battle_Advantage_Applied_05.ogg', import.meta.url).href,
  [A.MaxAdvantages.value]: new URL('./assets/Battle_Advantages_Maxed_01.ogg', import.meta.url).href,
  [A.NoAdvantages.value]: new URL('./assets/Battle_Advantages_None_01.ogg', import.meta.url).href,
  [A.AdversaryEscaped.value]: new URL('./assets/Battle_Adversary_Escape_01.ogg', import.meta.url).href,
  [A.BattleButton.value]: new URL('./assets/Battle_Button_01.ogg', import.meta.url).href,
  [A.CardFlip01.value]: new URL('./assets/Battle_Card_Flip_01.ogg', import.meta.url).href,
  [A.CardFlip02.value]: new URL('./assets/Battle_Card_Flip_02.ogg', import.meta.url).href,
  [A.CardFlip03.value]: new URL('./assets/Battle_Card_Flip_03.ogg', import.meta.url).href,
  [A.CardFlipPaper01.value]: new URL('./assets/Battle_Card_Flip_Paper_01.ogg', import.meta.url).href,
  [A.CardFlipPaper02.value]: new URL('./assets/Battle_Card_Flip_Paper_02.ogg', import.meta.url).href,
  [A.CardFlipPaper03.value]: new URL('./assets/Battle_Card_Flip_Paper_03.ogg', import.meta.url).href,
  [A.CardSelect01.value]: new URL('./assets/Battle_Card_Select_01.ogg', import.meta.url).href,
  [A.CardSelect02.value]: new URL('./assets/Battle_Card_Select_02.ogg', import.meta.url).href,
  [A.CardSelect03.value]: new URL('./assets/Battle_Card_Select_03.ogg', import.meta.url).href,
  [A.BattleStart.value]: new URL('./assets/Battle_start_01.ogg', import.meta.url).href,
  [A.BattleVictory.value]: new URL('./assets/Battle_Victory_01.ogg', import.meta.url).href,
  [A.ButtonHoldPressCombo.value]: new URL('./assets/Button_HoldandPressComboDemo.ogg', import.meta.url).href,
  [A.ButtonHold.value]: new URL('./assets/Button_Hold_01.ogg', import.meta.url).href,
  [A.ButtonPress.value]: new URL('./assets/Button_Press_01.ogg', import.meta.url).href,
  [A.ClassicAdvantageApplied.value]: new URL('./assets/Classic_AdvantageApplied.ogg', import.meta.url).href,
  [A.ClassicAttackTower.value]: new URL('./assets/Classic_Attack_Tower.ogg', import.meta.url).href,
  [A.ClassicBazaar.value]: new URL('./assets/Classic_Bazaar.ogg', import.meta.url).href,
  [A.ClassicConfirmation.value]: new URL('./assets/Classic_Confirmation_Beep.ogg', import.meta.url).href,
  [A.ClassicDragons.value]: new URL('./assets/Classic_DragonStrike.ogg', import.meta.url).href,
  [A.ClassicQuestFailed.value]: new URL('./assets/Classic_Quest_Failure.ogg', import.meta.url).href,
  [A.ClassicRetreat.value]: new URL('./assets/Classic_Retreat.ogg', import.meta.url).href,
  [A.ClassicStartMonth.value]: new URL('./assets/Classic_StartOfMonth.ogg', import.meta.url).href,
  [A.ClassicStartDungeon.value]: new URL('./assets/Classic_StartingDungeon.ogg', import.meta.url).href,
  [A.ClassicTowerLost.value]: new URL('./assets/Classic_TowerLost.ogg', import.meta.url).href,
  [A.ClassicUnsure.value]: new URL('./assets/Classic_Unsure_5.ogg', import.meta.url).href,
  [A.DungeonAdvantage01.value]: new URL('./assets/Dungeon_Advantage_01.ogg', import.meta.url).href,
  [A.DungeonAdvantage02.value]: new URL('./assets/Dungeon_Advantage_02.ogg', import.meta.url).href,
  [A.DungeonButton.value]: new URL('./assets/Dungeon_Button_01.ogg', import.meta.url).href,
  [A.DungeonFootsteps.value]: new URL('./assets/Dungeon_Button_Footsteps_01.ogg', import.meta.url).href,
  [A.DungeonCaves.value]: new URL('./assets/Dungeon_Caves_01.ogg', import.meta.url).href,
  [A.DungeonComplete.value]: new URL('./assets/Dungeon_Complete_01.ogg', import.meta.url).href,
  [A.DungeonEncampment.value]: new URL('./assets/Dungeon_Encampment_01.ogg', import.meta.url).href,
  [A.DungeonEscape.value]: new URL('./assets/Dungeon_Escape_01.ogg', import.meta.url).href,
  [A.DungeonFortress.value]: new URL('./assets/Dungeon_Fortress_01.ogg', import.meta.url).href,
  [A.DungeonRuins.value]: new URL('./assets/Dungeon_Ruins_01.ogg', import.meta.url).href,
  [A.DungeonShrine.value]: new URL('./assets/Dungeon_Shrine_01.ogg', import.meta.url).href,
  [A.DungeonTomb.value]: new URL('./assets/Dungeon_Tomb_01.ogg', import.meta.url).href,
  [A.FoeEvent.value]: new URL('./assets/Event_Foe.ogg', import.meta.url).href,
  [A.FoeSpawn.value]: new URL('./assets/Event_Spawn.ogg', import.meta.url).href,
  [A.Brigands.value]: new URL('./assets/Foe_Brigands_03.ogg', import.meta.url).href,
  [A.ClanofNeuri.value]: new URL('./assets/Foe_Clan_01.ogg', import.meta.url).href,
  [A.Dragons.value]: new URL('./assets/Foe_Dragon_01.ogg', import.meta.url).href,
  [A.Lemures.value]: new URL('./assets/Foe_Lemure_01.ogg', import.meta.url).href,
  [A.LeveledUp.value]: new URL('./assets/Foe_Level_Up_01.ogg', import.meta.url).href,
  [A.Mormos.value]: new URL('./assets/Foe_Mormo_01.ogg', import.meta.url).href,
  [A.Oreks.value]: new URL('./assets/Foe_Oreks_01.ogg', import.meta.url).href,
  [A.ShadowWolves.value]: new URL('./assets/Foe_Shadow_01.ogg', import.meta.url).href,
  [A.SpineFiends.value]: new URL('./assets/Foe_Spine_01.ogg', import.meta.url).href,
  [A.Strigas.value]: new URL('./assets/Foe_Striga_01.ogg', import.meta.url).href,
  [A.Titans.value]: new URL('./assets/Foe_Titan_01.ogg', import.meta.url).href,
  [A.FrostTrolls.value]: new URL('./assets/Foe_Troll_01.ogg', import.meta.url).href,
  [A.WidowmadeSpiders.value]: new URL('./assets/Foe_Widowmade_01.ogg', import.meta.url).href,
  [A.AshstriderSpawn.value]: new URL('./assets/MainObjectiveVictory_BossSpawn_Ashstrider.ogg', import.meta.url).href,
  [A.BaneofOmensSpawn.value]: new URL('./assets/MainObjectiveVictory_BossSpawn_Bane.ogg', import.meta.url).href,
  [A.EmpressofShadesSpawn.value]: new URL('./assets/MainObjectiveVictory_BossSpawn_Empress.ogg', import.meta.url).href,
  [A.GazeEternalSpawn.value]: new URL('./assets/MainObjectiveVictory_BossSpawn_Gaze.ogg', import.meta.url).href,
  [A.GravemawSpawn.value]: new URL('./assets/MainObjectiveVictory_BossSpawn_Gravemaw.ogg', import.meta.url).href,
  [A.IsatheHollowSpawn.value]: new URL('./assets/MainObjectiveVictory_BossSpawn_Isa.ogg', import.meta.url).href,
  [A.LingeringRotSpawn.value]: new URL('./assets/MainObjectiveVictory_BossSpawn_Rot.ogg', import.meta.url).href,
  [A.UtukKuSpawn.value]: new URL('./assets/MainObjectiveVictory_BossSpawn_Utuk.ogg', import.meta.url).href,
  [A.QuestComplete.value]: new URL('./assets/Quest_Complete_01.ogg', import.meta.url).href,
  [A.TowerAllGlyphs.value]: new URL('./assets/Tower_All_Glyphs_01.ogg', import.meta.url).href,
  [A.TowerAngry1.value]: new URL('./assets/Tower_Angry_01.ogg', import.meta.url).href,
  [A.TowerAngry2.value]: new URL('./assets/Tower_Angry_02.ogg', import.meta.url).href,
  [A.TowerAngry3.value]: new URL('./assets/Tower_Angry_03.ogg', import.meta.url).href,
  [A.TowerAngry4.value]: new URL('./assets/Tower_Angry_04.ogg', import.meta.url).href,
  [A.TowerConnected.value]: new URL('./assets/Tower_Connected_04.ogg', import.meta.url).href,
  [A.GameStart.value]: new URL('./assets/Tower_Game_Start.ogg', import.meta.url).href,
  [A.TowerGloat1.value]: new URL('./assets/Tower_Gloat_01.ogg', import.meta.url).href,
  [A.TowerGloat2.value]: new URL('./assets/Tower_Gloat_02.ogg', import.meta.url).href,
  [A.TowerGloat3.value]: new URL('./assets/Tower_Gloat_03.ogg', import.meta.url).href,
  [A.TowerGlyph.value]: new URL('./assets/Tower_Glyph_01.ogg', import.meta.url).href,
  [A.TowerIdle1.value]: new URL('./assets/Tower_Idle_01.ogg', import.meta.url).href,
  [A.TowerIdle2.value]: new URL('./assets/Tower_Idle_02.ogg', import.meta.url).href,
  [A.TowerIdle3.value]: new URL('./assets/Tower_Idle_03.ogg', import.meta.url).href,
  [A.TowerIdle4.value]: new URL('./assets/Tower_Idle_04.ogg', import.meta.url).href,
  [A.TowerIdle5.value]: new URL('./assets/Tower_Idle_05.ogg', import.meta.url).href,
  [A.TowerDisconnected.value]: new URL('./assets/Tower_Lost_Connection_04.ogg', import.meta.url).href,
  [A.MonthEnded.value]: new URL('./assets/Tower_Month_End_06.ogg', import.meta.url).href,
  [A.MonthStarted.value]: new URL('./assets/Tower_Month_Start_01.ogg', import.meta.url).href,
  [A.QuestFailed.value]: new URL('./assets/Tower_Quest_Failure.ogg', import.meta.url).href,
  [A.RotateExit.value]: new URL('./assets/Tower_Rotate_Exit.ogg', import.meta.url).href,
  [A.RotateLoop.value]: new URL('./assets/Tower_Rotate_Loop.ogg', import.meta.url).href,
  [A.RotateStart.value]: new URL('./assets/Tower_Rotate_Start.ogg', import.meta.url).href,
  [A.TowerSeal.value]: new URL('./assets/Tower_Seal_01.ogg', import.meta.url).href,
  [A.TowerSkullDropped.value]: new URL('./assets/Tower_Skull_Drop_01.ogg', import.meta.url).href,
  // === END AUTOGEN ===
};

/**
 * The official-game sound pack bundled with this package. Built from the
 * Return to Dark Tower app firmware; samples are extracted Ogg Vorbis.
 * Used as the default by `TowerDisplay.applyAudioConfig` when no `pack`
 * is supplied.
 *
 * © Restoration Games, LLC; used with permission.
 */
export const DEFAULT_TOWER_SOUND_PACK: SoundPack = {
  name: 'Restoration Games — Official',
  description: 'Extracted from the Return to Dark Tower app firmware. © Restoration Games, LLC; used with permission.',
  samples,
};

/**
 * Build a sound pack with the official filenames against a custom base URL.
 * Useful if you want to self-host the same audio (e.g., behind a CDN or
 * proxy) without re-typing all 113 filenames.
 *
 * @param baseUrl Path or URL prefix to which official filenames are appended
 *                (e.g., `'https://cdn.example.com/udt-audio/'`). A trailing
 *                slash is added if missing.
 */
export function buildOfficialSoundPack(baseUrl: string): SoundPack {
  const base = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
  const out: Record<number, string> = {};
  for (const [id, file] of Object.entries(OFFICIAL_AUDIO_FILES)) {
    out[Number(id)] = base + file;
  }
  return {
    name: DEFAULT_TOWER_SOUND_PACK.name,
    description: DEFAULT_TOWER_SOUND_PACK.description,
    samples: out,
  };
}

/**
 * True if the given sample ID has an entry in the default pack. `0` (silence)
 * always returns true so callers can suppress "missing asset" warnings for
 * the no-audio state.
 */
export function hasDefaultAudioAsset(sample: number): boolean {
  if (sample === 0) return true;
  return typeof DEFAULT_TOWER_SOUND_PACK.samples[sample] === 'string';
}
