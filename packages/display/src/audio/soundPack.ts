/**
 * A swappable bundle of audio assets keyed by `TOWER_AUDIO_LIBRARY` sample IDs.
 *
 * The library ships a default pack (`DEFAULT_TOWER_SOUND_PACK`) matching the
 * official Return to Dark Tower app. Consumers can author and apply their own
 * packs at runtime via `TowerDisplay.applyAudioConfig({ pack })`.
 *
 * A pack is plain data — serialisable, fetchable as JSON, hand-authorable.
 */
export interface SoundPack {
  /** Display name shown in selection UI (e.g., "Restoration Games — Official"). */
  name: string;
  /** Optional longer description / attribution / license note. */
  description?: string;
  /** Optional pack version, useful for cache busting and selection UI. */
  version?: string;
  /**
   * Map from sample ID (a `TOWER_AUDIO_LIBRARY[name].value`, e.g. `0x01`) to a
   * fully-resolved audio URL the browser can fetch. Unmapped IDs are silently
   * skipped at playback time with a one-shot warning per ID.
   */
  samples: Record<number, string>;
  /**
   * Optional pack-specific sequence-id → sample-id override. Only consulted
   * when `AudioConfig.bindSequenceToSample` is true. Resolution order is:
   *   `AudioConfig.sequenceMap` ?? `pack.sequenceMap` ?? `DEFAULT_SEQUENCE_AUDIO_MAP`.
   */
  sequenceMap?: Record<number, number>;
}
