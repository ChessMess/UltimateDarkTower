import { TOWER_AUDIO_LIBRARY } from 'ultimatedarktowerdata';
import { audioUrls } from '@udtc/assets/audio';
import type { SoundPack } from './soundPack';

const A = TOWER_AUDIO_LIBRARY;

// This module owns the sample id → filename mapping; `@udtc/assets/audio` owns filename → URL.
// The split is what lets the art package stay dependency-free (the id enum lives in
// `ultimatedarktower`, which the art package must not import) while keeping the .ogg bytes in one
// place. `scripts/extract-audio.mjs` regenerates both halves in one run.
//
// The URL half deliberately keeps the per-file
// `new URL('<literal>.ogg', import.meta.url)` shape rather than a glob: that is the canonical
// pattern recognised by every major bundler (Vite, esbuild, webpack 5+, Rollup, Parcel) and by
// native Node ESM. Each detects the literal filename at build time, emits the asset to its own
// output, and rewrites the expression — which is how all five apps in this repo end up re-emitting
// their own copies. See `packages/assets/src/audio/index.ts` for why a glob is NOT equivalent
// under library mode.
//
// OFFICIAL_AUDIO_FILES is also what `buildOfficialSoundPack` composes against a custom base URL,
// so consumers can self-host the same filenames.

const OFFICIAL_AUDIO_FILES: Record<number, string> = {
  // === BEGIN AUTOGEN (scripts/extract-audio.mjs) ===
  [A.Ashstrider.value]: 'Adversary_Ashstrider_01.ogg',
  [A.BaneofOmens.value]: 'Adversary_Bane_01.ogg',
  [A.EmpressofShades.value]: 'Adversary_Empress_01.ogg',
  [A.GazeEternal.value]: 'Adversary_Gaze_01.ogg',
  [A.Gravemaw.value]: 'Adversary_Gravemaw_01.ogg',
  [A.IsatheExile.value]: 'Adversary_Isa_01.ogg',
  [A.LingeringRot.value]: 'Adversary_Rot_03.ogg',
  [A.UtukKu.value]: 'Adversary_Utuk_03.ogg',
  [A.Gleb.value]: 'Ally_Gleb_01.ogg',
  [A.Grigor.value]: 'Ally_Grigor_01.ogg',
  [A.Hakan.value]: 'Ally_Hakan_02.ogg',
  [A.Letha.value]: 'Ally_Letha_02.ogg',
  [A.Miras.value]: 'Ally_Miras_01.ogg',
  [A.Nimet.value]: 'Ally_Nimet_01.ogg',
  [A.Tomas.value]: 'Ally_Tomas_03.ogg',
  [A.Vasa.value]: 'Ally_Vasa_03.ogg',
  [A.Yana.value]: 'Ally_Yana_01.ogg',
  [A.Zaida.value]: 'Ally_Zaida_01.ogg',
  [A.ApplyAdvantage01.value]: 'Battle_Advantage_Applied_01.ogg',
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
  [A.Striga.value]: 'Foe_Striga_01.ogg',
  [A.Titans.value]: 'Foe_Titan_01.ogg',
  [A.FrostTrolls.value]: 'Foe_Troll_01.ogg',
  [A.WidowmadeSpiders.value]: 'Foe_Widowmade_01.ogg',
  [A.AshstriderSpawn.value]: 'MainObjectiveVictory_BossSpawn_Ashstrider.ogg',
  [A.BaneofOmensSpawn.value]: 'MainObjectiveVictory_BossSpawn_Bane.ogg',
  [A.EmpressofShadesSpawn.value]: 'MainObjectiveVictory_BossSpawn_Empress.ogg',
  [A.GazeEternalSpawn.value]: 'MainObjectiveVictory_BossSpawn_Gaze.ogg',
  [A.GravemawSpawn.value]: 'MainObjectiveVictory_BossSpawn_Gravemaw.ogg',
  [A.IsatheExileSpawn.value]: 'MainObjectiveVictory_BossSpawn_Isa.ogg',
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

const samples: Record<number, string> = Object.fromEntries(
  Object.entries(OFFICIAL_AUDIO_FILES).map(([id, file]) => {
    const url = audioUrls[file];
    // A miss here means the two generated halves have drifted — `OFFICIAL_AUDIO_FILES` names a
    // file `@udtc/assets` no longer ships. Silence would be indistinguishable from a sample that
    // is simply quiet, so fail at import time instead.
    if (!url) {
      throw new Error(
        `ultimatedarktowerdisplay: no bundled audio for '${file}'. Re-run ` +
          'packages/display/scripts/extract-audio.mjs — it regenerates this map and the URL table ' +
          'in @udtc/assets together.',
      );
    }
    return [Number(id), url];
  }),
);

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
  description:
    'Extracted from the Return to Dark Tower app firmware. © Restoration Games, LLC; used with permission.',
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
