/**
 * Plays decoded tower-sample audio (state.audio.sample / loop / volume).
 *
 * - The library is a sparse map from sample id (TOWER_AUDIO_LIBRARY values,
 *   0x01–0x71) to URL. Unmapped ids warn-once and stop playback.
 * - `sample === 0` means silence; current playback fades out.
 * - volume === 3 is treated as mute (gain 0); all other values play at full
 *   volume (gain 1).
 * - Decoded buffers are cached per sample id. A monotonic decode token is
 *   used to bail out of stale loads when a newer sync supersedes them.
 *
 * Mirrors `DrumRotationAudio` in lifecycle: lazy AudioContext, opt-in via
 * `setEnabled(true)`, single GainNode, short fade on stop to avoid clicks.
 */
const DEFAULT_GAIN = 1.0;
const STOP_FADE_SEC = 0.08;

export class TowerSampleAudio {
  private ctx: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private library: Record<number, string> = {};
  private readonly buffers = new Map<number, AudioBuffer>();
  private readonly warned = new Set<number>();
  private decodeToken = 0;
  private enabled = false;

  private lastSample: number | null = null;
  private lastLoop: boolean | null = null;
  private lastVolume: number | null = null;

  /** Replace the sample-id → URL map. Cached buffers are dropped. */
  setLibrary(library: Record<number, string>): void {
    this.library = library;
    this.buffers.clear();
    this.warned.clear();
  }

  /**
   * Enable or disable playback. Disabled by default. Toggling on while a
   * non-silent sample is the current state will re-play it (so users who
   * enable audio mid-loop hear the loop without waiting for the next state).
   *
   * Eagerly creates and resumes the AudioContext on enable so the consumer's
   * current user-gesture activation is captured. Without this, the first
   * AudioContext creation can happen later in a non-gesture context (e.g.
   * a postMessage handler that calls `playSampleOneShot`), where it may
   * start suspended and never resume.
   */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) {
      this.stop();
      return;
    }
    this.ensureCtx(true);
    if (this.lastSample !== null && this.lastSample !== 0) {
      void this.play(this.lastSample, this.lastLoop ?? false, this.lastVolume ?? 0);
    }
  }

  /**
   * Reconcile playback with the latest decoded state.audio fields.
   *
   * When `force` is true, replay the current sample even if `sample` and
   * `loop` match what was last synced — used by explicit user triggers
   * (e.g. the example app's sequence button) that must re-fire on every
   * click. The default `false` preserves dedup for BLE state-mirror
   * callers, where identical successive packets must not restart playback.
   */
  sync(sample: number, loop: boolean, volume: number, force = false): void {
    const sampleChanged = sample !== this.lastSample;
    const loopChanged = loop !== this.lastLoop;
    const volumeChanged = volume !== this.lastVolume;
    this.lastSample = sample;
    this.lastLoop = loop;
    this.lastVolume = volume;

    if (!this.enabled) return;

    if (sample === 0) {
      this.stop();
      return;
    }

    if (force || sampleChanged || loopChanged) {
      void this.play(sample, loop, volume);
    } else if (volumeChanged) {
      this.applyGain(volume);
    }
  }

  /**
   * Fire a one-shot sample play, independent of the state-driven sync()
   * pipeline. Each call allocates its own AudioBufferSourceNode that is
   * NOT tracked by `this.source`, so `sync(0)`/`stop()` from a subsequent
   * state update won't interrupt it. Use this for transient command-style
   * audio events (e.g. echoing a fire-and-forget BLE sound command); use
   * `sync()` / `applyState()` for state-mirror playback.
   *
   * Side effects:
   * - Polyphony is possible — calling this twice in quick succession plays
   *   both samples in parallel.
   * - For `loop: true`, retain the returned handle and call `stop()` when
   *   done. Looped one-shots have no automatic stop.
   * - Honors the master `enabled` flag and the master `this.gain` for
   *   mute/volume, so the existing volume/mute model still applies.
   *
   * Browser autoplay policy: requires that `setEnabled(true)` was called
   * earlier from a user gesture (which warms the AudioContext via the
   * eager `ensureCtx(true)` there).
   */
  playSampleOneShot(
    sample: number,
    loop: boolean = false,
    volume: number = 0,
  ): { stop: () => void } {
    const noop = { stop: () => { /* no-op */ } };
    if (!this.enabled) return noop;
    if (sample === 0) return noop;

    const url = this.library[sample];
    if (!url) {
      if (!this.warned.has(sample)) {
        this.warned.add(sample);
        // eslint-disable-next-line no-console
        console.warn(`[TowerSampleAudio] no asset mapped for sample 0x${sample.toString(16)}`);
      }
      return noop;
    }

    const ctx = this.ensureCtx(true);
    let stopped = false;
    let src: AudioBufferSourceNode | null = null;
    const handle = {
      stop: () => {
        stopped = true;
        if (src) {
          try { src.stop(); } catch { /* already stopped */ }
        }
      },
    };

    void (async () => {
      let buffer = this.buffers.get(sample);
      if (!buffer) {
        try {
          const res = await fetch(url);
          const arr = await res.arrayBuffer();
          buffer = await ctx.decodeAudioData(arr);
          this.buffers.set(sample, buffer);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('[TowerSampleAudio] one-shot failed to load', url, err);
          return;
        }
      }
      if (stopped) return;

      if (!this.gain) {
        this.gain = ctx.createGain();
        this.gain.connect(ctx.destination);
      }
      // A prior state-driven stop() ramps the shared master gain to 0 and leaves
      // it there. When no state source is currently using it, restore it to unity
      // so this one-shot isn't silenced. Skip the reset while a state source is
      // live so we don't override its volume/mute schedule.
      if (!this.source) {
        const t = ctx.currentTime;
        this.gain.gain.cancelScheduledValues(t);
        this.gain.gain.setValueAtTime(DEFAULT_GAIN, t);
      }
      const target = volume === 3 ? 0.0 : DEFAULT_GAIN;
      // Per-shot gain so simultaneous shots don't fight over the master gain's
      // schedule (sync()'s fades operate on this.gain directly).
      const shotGain = ctx.createGain();
      shotGain.gain.value = target;
      shotGain.connect(this.gain);

      src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = loop;
      src.connect(shotGain);
      src.start();
      // Detach: don't store on this.source. Clean up the per-shot gain when
      // playback ends so we don't leak audio graph nodes.
      src.onended = () => {
        try { shotGain.disconnect(); } catch { /* */ }
      };
    })();

    return handle;
  }

  /** Hard stop with a short fade. Safe to call when nothing is playing. */
  stop(): void {
    if (!this.ctx || !this.gain || !this.source) return;
    const now = this.ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + STOP_FADE_SEC);
    const src = this.source;
    this.source = null;
    try {
      src.stop(now + STOP_FADE_SEC);
    } catch {
      // already stopped — safe to ignore
    }
  }

  dispose(): void {
    this.enabled = false;
    this.decodeToken++;
    this.stopImmediate();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.gain = null;
    this.buffers.clear();
    this.warned.clear();
    this.lastSample = null;
    this.lastLoop = null;
    this.lastVolume = null;
  }

  private async play(sample: number, loop: boolean, volume: number): Promise<void> {
    const url = this.library[sample];
    if (!url) {
      if (!this.warned.has(sample)) {
        this.warned.add(sample);
        // eslint-disable-next-line no-console
        console.warn(`[TowerSampleAudio] no asset mapped for sample 0x${sample.toString(16)}`);
      }
      this.stop();
      return;
    }

    const ctx = this.ensureCtx(true);
    const token = ++this.decodeToken;

    let buffer = this.buffers.get(sample);
    if (!buffer) {
      try {
        const res = await fetch(url);
        const arr = await res.arrayBuffer();
        buffer = await ctx.decodeAudioData(arr);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[TowerSampleAudio] failed to load', url, err);
        return;
      }
      if (token !== this.decodeToken) return;
      this.buffers.set(sample, buffer);
    }

    if (token !== this.decodeToken) return;

    this.stopImmediate();

    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.connect(ctx.destination);
    }
    const now = ctx.currentTime;
    const target = volume === 3 ? 0.0 : DEFAULT_GAIN;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(target, now);

    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;
    src.connect(this.gain);
    src.start();
    this.source = src;
  }

  private stopImmediate(): void {
    if (!this.source) return;
    const src = this.source;
    this.source = null;
    try {
      src.stop();
    } catch {
      // already stopped — safe to ignore
    }
  }

  private applyGain(volume: number): void {
    if (!this.ctx || !this.gain) return;
    const now = this.ctx.currentTime;
    const target = volume === 3 ? 0.0 : DEFAULT_GAIN;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(target, now);
  }

  private ensureCtx(resume: boolean): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
    if (resume && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
    return this.ctx;
  }
}
