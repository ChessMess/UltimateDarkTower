# Audio

This library plays decoded tower-state audio out of the box: 113 Ogg Vorbis samples extracted from the official Return to Dark Tower app firmware ship in the npm package. Consumers do not need to host any assets to get the default behaviour — one user gesture is enough.

## Licensing

The bundled samples are © Restoration Games, LLC and are used with permission. See the project [LICENSE](../LICENSE). Redistribution outside this package may require its own permission grant.

## Quick start

```ts
import { TowerDisplay } from 'ultimatedarktowerdisplay';

const display = new TowerDisplay({ container, renderers: '3d-view', modelUrl });

document.getElementById('audio-on')!.addEventListener('click', () => {
  display.applyAudioConfig({ enabled: true });
});

display.applyState(decodedTowerState);
```

The default sound pack is wired in by the constructor; `enabled` defaults to `false` (browsers block AudioContext until a user gesture). After enabling, `applyState` will play whatever sample is in `state.audio.sample`.

## `AudioConfig`

```ts
interface AudioConfig {
  /** Sound pack used for sample playback. Defaults to DEFAULT_TOWER_SOUND_PACK. */
  pack?: SoundPack;
  /** Master enable. Defaults to false. */
  enabled?: boolean;
  /** When true, applyState() auto-fills state.audio.sample from the sequence map
   *  if the state has a known sequence but no explicit sample. Default false. */
  bindSequenceToSample?: boolean;
  /** Override of sequence-id → sample-id binding. Resolution order:
   *  config.sequenceMap ?? pack.sequenceMap ?? DEFAULT_SEQUENCE_AUDIO_MAP. */
  sequenceMap?: Record<number, number>;
  /** Drum rotation loop URL, or null for the procedural fallback. Default null. */
  drumRotationUrl?: string | null;
}
```

All fields are optional. `applyAudioConfig(config)` sparse-merges — fields you don't set are left alone. `getAudioConfig()` returns the fully-resolved `Required<AudioConfig>` so you can serialise and restore.

## `SoundPack`

A pack is a plain serialisable object:

```ts
interface SoundPack {
  name: string;
  description?: string;
  version?: string;
  /** sample-id → fully-resolved URL */
  samples: Record<number, string>;
  /** optional sequence-id → sample-id override */
  sequenceMap?: Record<number, number>;
}
```

Sample IDs are `TOWER_AUDIO_LIBRARY[name].value` from `ultimatedarktower` (0x01–0x71).

### Swapping in a custom pack

```ts
import { DEFAULT_TOWER_SOUND_PACK } from 'ultimatedarktowerdisplay';

const myPack: SoundPack = {
  name: 'My Custom Voices',
  samples: {
    ...DEFAULT_TOWER_SOUND_PACK.samples,           // start from the official pack
    [TOWER_AUDIO_LIBRARY.Ashstrider.value]: '/audio/my-ashstrider.ogg', // override one
  },
};
display.applyAudioConfig({ pack: myPack });
```

### Re-hosting the official pack

If you want the same files served from your own infrastructure (CDN, proxy, offline app):

```ts
import { buildOfficialSoundPack } from 'ultimatedarktowerdisplay';

display.applyAudioConfig({
  pack: buildOfficialSoundPack('https://cdn.example.com/udt-audio/'),
});
```

The 113 official filenames are concatenated after your base URL. Copy `node_modules/ultimatedarktowerdisplay/dist/audio/assets/` to the chosen location.

## Sequence → sample binding

Light sequences and audio samples are **decoupled by default** — you control them independently via `state.led_sequence` and `state.audio.sample`. To have the library fill in the audio sample for known sequences automatically, opt in:

```ts
display.applyAudioConfig({ bindSequenceToSample: true });
```

Now applying a state with `led_sequence` set but `audio.sample = 0` plays the mapped sample. **Also affects [`playSequence`](API.md#one-shot-transient-led-sequence-playsequence--070) (0.7.0+)** — when `bindSequenceToSample` is true, `playSequence(id)` also fires the bound sample via `playSampleOneShot`, matching the real tower's firmware behavior of playing both light and sound for every light-override command. The default binding (`DEFAULT_SEQUENCE_AUDIO_MAP`) matches the official-game cues. Override per pack or per call:

```ts
import { buildSequenceAudioMap } from 'ultimatedarktowerdisplay';

const map = buildSequenceAudioMap({
  victory: 'TowerGloat1',
  defeat:  'ClassicTowerLost',
});
display.applyAudioConfig({ sequenceMap: map, bindSequenceToSample: true });
```

## One-shot transient playback (`playSample`)

The default audio path is **state-driven**: `applyState(state)` reads `state.audio.sample` and `TowerSampleAudio` syncs playback to it, including a `lastSample` dedup so identical successive packets do not restart playback. This is correct for BLE state-mirror consumers and for the example app's "Trigger Sequence" buttons (which pass `force=true` to re-fire on the same sample).

It is **not** correct for consumers driving the display from fire-and-forget command events. The clearest example: the `ultimatedarktower` framework treats audio as transient — `playSoundStateful(N)` sends BLE bytes but does not persist `audio` in tower state, and the response handler explicitly resets `audio.sample = 0`. A consumer that posts that state to the display would see `sync(N)` then `sync(0)` ~50ms later, which `stop()`s the just-started sample (~80ms fade).

For that use case, call `playSample` directly:

```ts
// On every fire-and-forget audio command from the framework:
display.playSample(sampleId, { loop: false, volume: 0 });
```

`playSample` is available on `TowerRenderView`, `TowerDisplay`, and `Tower3DView`. It bypasses `sync()` / `stop()` entirely — each call allocates its own `AudioBufferSourceNode` independent of the sync-managed source, so subsequent state-driven `sync(0)` calls only affect sync-initiated plays.

### Trade-offs

- **Polyphony**: two `playSample` calls in quick succession play in parallel. Use the state-driven path if you want monophonic behavior.
- **Looped one-shots**: pass `{ loop: true }` and retain the returned `{ stop }` handle — there is no automatic stop. For unbounded loops, prefer the state-driven path.
- **Master volume / mute still apply**: per-shot gain feeds into the same master gain node the sync() path uses, so `applyAudioConfig` mute/volume changes affect both.
- **Dedup does not apply**: `playSample(N)` followed by `playSample(N)` plays the sample twice (sequence-binding and `lastSample` are untouched).

### When to use which

| Driver | API |
| --- | --- |
| BLE state-mirror notification carrying `audio.sample` | `applyState(state)` |
| App preset or "trigger sequence" button (re-fire same sample) | `applyState(state, true)` (force=true) |
| Auto-derive sample from `state.led_sequence` | `applyAudioConfig({ bindSequenceToSample: true })` then `applyState` |
| Fire-and-forget command event (emulator, framework, custom UI) | `display.playSample(id, opts?)` |
| Fire-and-forget light-override command (also auto-plays bound audio when `bindSequenceToSample`) | `display.playSequence(id, opts?)` — see [API.md](API.md#one-shot-transient-led-sequence-playsequence--070) |

`playSample` still requires `applyAudioConfig({ enabled: true })` from a user gesture (browsers' autoplay policy). The eager AudioContext creation on `setEnabled(true)` captures that gesture so subsequent `playSample` calls from non-gesture contexts (e.g. postMessage handlers) work correctly.

## Calibration sound

The calibration command (`applyState` with `command === TOWER_COMMANDS.calibration`) plays a bundled recording of the real tower's calibration sweep — `drumCalibration.ogg`, exported as `CALIBRATION_SOUND_URL`. It runs on its own audio handle, deliberately separate from the drum-rotation audio (`drumRotationUrl`), so it is heard **only** during calibration and never on ordinary drum rotations. Two differences from that handle: it does **not** loop (it's a finite one-shot of the whole sweep, so it plays through once instead of restarting if the visible sweep runs long), and it has **no** placeholder tone (a missing/failed load stays silent rather than buzzing). The `GameStart` sample plays once the sweep finishes.

Keep the recording aligned with the on-screen sweep via two constants in [`src/3d/constants.ts`](../src/3d/constants.ts): `DRUM_SECONDS_PER_REVOLUTION` (drum spin speed) and `DRUM_CALIBRATION_BEEP_PAUSE_S` (the pause held after each drum for the tower's post-rotation beep). See [API.md → Calibration command](API.md#calibration-command).

## Autoplay policy

Browsers block AudioContext until a user gesture (click, key, touch). Set `enabled: true` from a click/keydown handler — not on page load. The example app does this via the toolbar **Audio** checkbox.

Since v0.6.0, `applyAudioConfig({ enabled: true })` eagerly creates and resumes the AudioContext during the call itself, capturing the gesture activation immediately. This matters if your consumer code calls `playSample` later from a non-gesture context (e.g. a `postMessage` or WebSocket handler) — without the eager creation, the AudioContext could be lazily created at that point in a suspended state with no gesture available to resume it.

## Bundler compatibility

The library references each `.ogg` via its own literal `new URL('./assets/<filename>.ogg', import.meta.url)` expression. Most modern bundlers detect this pattern at build time and emit the asset alongside their output, rewriting the expression to point at the emitted file.

### Bundlers that detect the pattern automatically

| Bundler | Setup |
| --- | --- |
| **Vite** | Nothing — the published dist already resolves URLs via Vite's lib build. Consumers using Vite themselves see emitted .ogg files in their build. |
| **Webpack 5+** | Add a rule: `{ test: /\.ogg$/, type: 'asset/resource' }`. |
| **Rollup** | Use `@rollup/plugin-url` (or equivalent) and include `.ogg` in its match list. |
| **Parcel** | Works out of the box. |

### esbuild

esbuild does **not** detect `new URL(literal, import.meta.url)` patterns at build time and does not emit assets for them. The pattern is preserved verbatim and resolved at runtime against `import.meta.url`, which means:

- **ESM target**: `import.meta.url` resolves to the bundle's URL at runtime. Audio URLs resolve correctly if you ship `dist/audio/assets/` (from the package) alongside your bundle output at the matching relative path.
- **CJS target**: esbuild stubs `import.meta`, so URLs break. Configure `define: { 'import.meta.url': '__filename' }` in your esbuild config, and host the audio at a path resolvable from the bundle file.
- **IIFE target**: `import.meta` is unavailable in IIFE entirely. Either configure `define` to point `import.meta.url` at a runtime value (e.g. `'document.currentScript.src'`) and host the audio at the matching base URL, **or** use the [self-hosting fallback](#self-hosting-fallback) below — this is usually the simplest path.

### Self-hosting fallback

If you'd rather host the audio yourself (CDN, custom asset pipeline, etc.) — or if you're in an environment where bundler asset emission isn't an option — copy `node_modules/ultimatedarktowerdisplay/dist/audio/assets/` into your app's public asset directory and use `buildOfficialSoundPack('/your-public-path/')` instead of the default pack. The dist filenames are stable (unhashed) so paths stay predictable across package upgrades.

## Audio Sample Catalog

All 113 bundled files are **Ogg Vorbis, stereo (2-channel)**. Sample rates are either 22 kHz or 48 kHz; bitrates range from ~100 to ~220 kbps. Every file is mapped to a `TOWER_AUDIO_LIBRARY` ID and accessible via the default sound pack.

### Adversary voices

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `Ashstrider` | Adversary_Ashstrider_01.ogg | 3.3s | 48 | 52 KB |
| `BaneofOmens` | Adversary_Bane_01.ogg | 3.4s | 48 | 47 KB |
| `EmpressofShades` | Adversary_Empress_01.ogg | 4.9s | 48 | 71 KB |
| `GazeEternal` | Adversary_Gaze_01.ogg | 4.5s | 48 | 64 KB |
| `Gravemaw` | Adversary_Gravemaw_01.ogg | 5.3s | 48 | 72 KB |
| `IsatheHollow` | Adversary_Isa_01.ogg | 3.1s | 48 | 51 KB |
| `LingeringRot` | Adversary_Rot_03.ogg | 2.4s | 48 | 38 KB |
| `UtukKu` | Adversary_Utuk_03.ogg | 3.1s | 48 | 44 KB |

### Ally voices

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `Gleb` | Ally_Gleb_01.ogg | 2.0s | 22 | 44 KB |
| `Grigor` | Ally_Grigor_01.ogg | 2.8s | 22 | 49 KB |
| `Hakan` | Ally_Hakan_02.ogg | 3.2s | 48 | 49 KB |
| `Letha` | Ally_Letha_02.ogg | 3.2s | 48 | 58 KB |
| `Miras` | Ally_Miras_01.ogg | 2.1s | 22 | 45 KB |
| `Nimet` | Ally_Nimet_01.ogg | 5.7s | 22 | 138 KB |
| `Tomas` | Ally_Tomas_03.ogg | 2.4s | 48 | 37 KB |
| `Vasa` | Ally_Vasa_03.ogg | 3.4s | 48 | 52 KB |
| `Yana` | Ally_Yana_01.ogg | 3.7s | 22 | 69 KB |
| `Zaida` | Ally_Zaida_01.ogg | 5.1s | 22 | 115 KB |

### Battle sounds

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `ApplyAdvantage01` | Battle_Advantage_Applied_01.ogg | 1.8s | 22 | 37 KB |
| `ApplyAdvantage02` | Battle_Advantage_Applied_02.ogg | 1.6s | 22 | 33 KB |
| `ApplyAdvantage03` | Battle_Advantage_Applied_03.ogg | 2.2s | 22 | 47 KB |
| `ApplyAdvantage04` | Battle_Advantage_Applied_04.ogg | 2.2s | 22 | 45 KB |
| `ApplyAdvantage05` | Battle_Advantage_Applied_05.ogg | 2.2s | 22 | 43 KB |
| `MaxAdvantages` | Battle_Advantages_Maxed_01.ogg | 4.2s | 22 | 89 KB |
| `NoAdvantages` | Battle_Advantages_None_01.ogg | 3.6s | 48 | 50 KB |
| `AdversaryEscaped` | Battle_Adversary_Escape_01.ogg | 5.0s | 48 | 68 KB |
| `BattleButton` | Battle_Button_01.ogg | 1.4s | 22 | 28 KB |
| `CardFlip01` | Battle_Card_Flip_01.ogg | 0.6s | 22 | 13 KB |
| `CardFlip02` | Battle_Card_Flip_02.ogg | 0.7s | 22 | 15 KB |
| `CardFlip03` | Battle_Card_Flip_03.ogg | 0.7s | 22 | 16 KB |
| `CardFlipPaper01` | Battle_Card_Flip_Paper_01.ogg | 0.6s | 48 | 13 KB |
| `CardFlipPaper02` | Battle_Card_Flip_Paper_02.ogg | 0.6s | 48 | 13 KB |
| `CardFlipPaper03` | Battle_Card_Flip_Paper_03.ogg | 0.6s | 48 | 13 KB |
| `CardSelect01` | Battle_Card_Select_01.ogg | 0.6s | 22 | 15 KB |
| `CardSelect02` | Battle_Card_Select_02.ogg | 0.6s | 22 | 15 KB |
| `CardSelect03` | Battle_Card_Select_03.ogg | 0.7s | 22 | 15 KB |
| `BattleStart` | Battle_start_01.ogg | 4.4s | 22 | 88 KB |
| `BattleVictory` | Battle_Victory_01.ogg | 4.9s | 22 | 96 KB |

### Button sounds

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `ButtonHold` | Button_Hold_01.ogg | 3.9s | 22 | 59 KB |
| `ButtonHoldPressCombo` | Button_HoldandPressComboDemo.ogg | 4.3s | 48 | 72 KB |
| `ButtonPress` | Button_Press_01.ogg | 1.5s | 22 | 33 KB |

### Classic sounds

Recreations of sounds from the original 1981 Dark Tower game.

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `ClassicAdvantageApplied` | Classic_AdvantageApplied.ogg | 1.0s | 48 | 20 KB |
| `ClassicAttackTower` | Classic_Attack_Tower.ogg | 2.9s | 48 | 51 KB |
| `ClassicBazaar` | Classic_Bazaar.ogg | 2.9s | 48 | 56 KB |
| `ClassicConfirmation` | Classic_Confirmation_Beep.ogg | 0.3s | 48 | 8 KB |
| `ClassicDragons` | Classic_DragonStrike.ogg | 2.1s | 48 | 39 KB |
| `ClassicQuestFailed` | Classic_Quest_Failure.ogg | 2.6s | 48 | 51 KB |
| `ClassicRetreat` | Classic_Retreat.ogg | 1.7s | 48 | 28 KB |
| `ClassicStartMonth` | Classic_StartOfMonth.ogg | 5.0s | 48 | 91 KB |
| `ClassicStartDungeon` | Classic_StartingDungeon.ogg | 4.3s | 48 | 90 KB |
| `ClassicTowerLost` | Classic_TowerLost.ogg | 1.6s | 48 | 33 KB |
| `ClassicUnsure` | Classic_Unsure_5.ogg | 1.1s | 48 | 23 KB |

### Dungeon sounds

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `DungeonAdvantage01` | Dungeon_Advantage_01.ogg | 2.5s | 22 | 50 KB |
| `DungeonAdvantage02` | Dungeon_Advantage_02.ogg | 2.7s | 48 | 43 KB |
| `DungeonButton` | Dungeon_Button_01.ogg | 2.4s | 48 | 34 KB |
| `DungeonFootsteps` | Dungeon_Button_Footsteps_01.ogg | 3.7s | 22 | 75 KB |
| `DungeonCaves` | Dungeon_Caves_01.ogg | 5.7s | 22 | 141 KB |
| `DungeonComplete` | Dungeon_Complete_01.ogg | 6.4s | 22 | 108 KB |
| `DungeonEncampment` | Dungeon_Encampment_01.ogg | 4.9s | 22 | 95 KB |
| `DungeonEscape` | Dungeon_Escape_01.ogg | 6.9s | 22 | 131 KB |
| `DungeonFortress` | Dungeon_Fortress_01.ogg | 5.0s | 22 | 95 KB |
| `DungeonRuins` | Dungeon_Ruins_01.ogg | 4.5s | 22 | 104 KB |
| `DungeonShrine` | Dungeon_Shrine_01.ogg | 5.3s | 22 | 104 KB |
| `DungeonTomb` | Dungeon_Tomb_01.ogg | 5.7s | 22 | 117 KB |

### Events

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `FoeEvent` | Event_Foe.ogg | 6.0s | 22 | 100 KB |
| `FoeSpawn` | Event_Spawn.ogg | 5.2s | 22 | 98 KB |

### Foe sounds

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `Brigands` | Foe_Brigands_03.ogg | 1.3s | 48 | 23 KB |
| `ClanofNeuri` | Foe_Clan_01.ogg | 2.6s | 48 | 40 KB |
| `Dragons` | Foe_Dragon_01.ogg | 2.5s | 48 | 41 KB |
| `Lemures` | Foe_Lemure_01.ogg | 3.2s | 48 | 45 KB |
| `LeveledUp` | Foe_Level_Up_01.ogg | 4.8s | 48 | 64 KB |
| `Mormos` | Foe_Mormo_01.ogg | 2.0s | 48 | 30 KB |
| `Oreks` | Foe_Oreks_01.ogg | 2.3s | 48 | 35 KB |
| `ShadowWolves` | Foe_Shadow_01.ogg | 4.5s | 48 | 61 KB |
| `SpineFiends` | Foe_Spine_01.ogg | 2.3s | 48 | 35 KB |
| `Strigas` | Foe_Striga_01.ogg | 3.2s | 48 | 44 KB |
| `Titans` | Foe_Titan_01.ogg | 3.5s | 48 | 58 KB |
| `FrostTrolls` | Foe_Troll_01.ogg | 2.4s | 48 | 36 KB |
| `WidowmadeSpiders` | Foe_Widowmade_01.ogg | 3.4s | 48 | 54 KB |

### Boss spawn announcements

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `AshstriderSpawn` | MainObjectiveVictory_BossSpawn_Ashstrider.ogg | 10.7s | 48 | 153 KB |
| `BaneofOmensSpawn` | MainObjectiveVictory_BossSpawn_Bane.ogg | 10.5s | 48 | 146 KB |
| `EmpressofShadesSpawn` | MainObjectiveVictory_BossSpawn_Empress.ogg | 11.4s | 48 | 163 KB |
| `GazeEternalSpawn` | MainObjectiveVictory_BossSpawn_Gaze.ogg | 11.3s | 48 | 159 KB |
| `GravemawSpawn` | MainObjectiveVictory_BossSpawn_Gravemaw.ogg | 11.4s | 48 | 159 KB |
| `IsatheHollowSpawn` | MainObjectiveVictory_BossSpawn_Isa.ogg | 10.4s | 48 | 153 KB |
| `LingeringRotSpawn` | MainObjectiveVictory_BossSpawn_Rot.ogg | 9.6s | 48 | 137 KB |
| `UtukKuSpawn` | MainObjectiveVictory_BossSpawn_Utuk.ogg | 10.5s | 48 | 149 KB |

### Tower sounds

| Library key | Filename | Duration | kHz | Size |
|---|---|---:|---:|---:|
| `QuestComplete` | Quest_Complete_01.ogg | 6.3s | 22 | 113 KB |
| `TowerAllGlyphs` | Tower_All_Glyphs_01.ogg | 4.7s | 48 | 59 KB |
| `TowerAngry1` | Tower_Angry_01.ogg | 4.9s | 48 | 63 KB |
| `TowerAngry2` | Tower_Angry_02.ogg | 4.4s | 48 | 56 KB |
| `TowerAngry3` | Tower_Angry_03.ogg | 4.3s | 48 | 55 KB |
| `TowerAngry4` | Tower_Angry_04.ogg | 4.2s | 48 | 58 KB |
| `TowerConnected` | Tower_Connected_04.ogg | 1.8s | 48 | 31 KB |
| `GameStart` | Tower_Game_Start.ogg | 8.0s | 48 | 105 KB |
| `TowerGloat1` | Tower_Gloat_01.ogg | 4.0s | 48 | 56 KB |
| `TowerGloat2` | Tower_Gloat_02.ogg | 4.0s | 48 | 52 KB |
| `TowerGloat3` | Tower_Gloat_03.ogg | 4.7s | 48 | 60 KB |
| `TowerGlyph` | Tower_Glyph_01.ogg | 13.6s | 48 | 197 KB |
| `TowerIdle1` | Tower_Idle_01.ogg | 5.8s | 48 | 76 KB |
| `TowerIdle2` | Tower_Idle_02.ogg | 5.6s | 48 | 73 KB |
| `TowerIdle3` | Tower_Idle_03.ogg | 6.8s | 48 | 83 KB |
| `TowerIdle4` | Tower_Idle_04.ogg | 5.5s | 48 | 72 KB |
| `TowerIdle5` | Tower_Idle_05.ogg | 6.2s | 48 | 80 KB |
| `TowerDisconnected` | Tower_Lost_Connection_04.ogg | 2.1s | 48 | 32 KB |
| `MonthEnded` | Tower_Month_End_06.ogg | 4.7s | 48 | 61 KB |
| `MonthStarted` | Tower_Month_Start_01.ogg | 8.7s | 48 | 131 KB |
| `QuestFailed` | Tower_Quest_Failure.ogg | 5.4s | 48 | 71 KB |
| `RotateExit` | Tower_Rotate_Exit.ogg | 2.2s | 48 | 32 KB |
| `RotateLoop` | Tower_Rotate_Loop.ogg | 9.0s | 48 | 122 KB |
| `RotateStart` | Tower_Rotate_Start.ogg | 3.9s | 48 | 58 KB |
| `TowerSeal` | Tower_Seal_01.ogg | 9.3s | 48 | 130 KB |
| `TowerSkullDropped` | Tower_Skull_Drop_01.ogg | 3.9s | 48 | 53 KB |

## See also

- [API](API.md) — full signatures for `applyAudioConfig`, `getAudioConfig`, and the public audio classes.
- [EXAMPLE](EXAMPLE.md) — how the example app's audio panel is wired.
- [SEQUENCE_AUTHORING](SEQUENCE_AUTHORING.md) — adding new light sequences (and their default audio bindings).
