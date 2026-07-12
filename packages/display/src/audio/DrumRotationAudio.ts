/**
 * Plays a sound while drums are rotating in the 3D view (looping by default).
 *
 * - When a URL is set, fetches and decodes the asset; that buffer is looped
 *   for the lifetime of each rotation burst. Pass `{ loop: false }` for a finite
 *   one-shot clip (e.g. a full calibration recording) that should play through
 *   once and stop rather than restarting if the rotation outlasts it.
 * - When no URL is set, falls back to a procedural sawtooth oscillator —
 *   audible placeholder until the real recorded asset is wired in. Pass
 *   `{ fallbackTone: false }` to disable this (a handle that always has a real
 *   recording, e.g. the calibration sweep, stays silent on a missing/failed
 *   load instead of buzzing).
 * - Multiple drums rotating concurrently share one underlying source via a
 *   start/end refcount; the gain ramps to silence over a short fade when the
 *   refcount returns to zero so playback never clicks off.
 *
 * The AudioContext is created lazily on the first `startRotation` call to
 * avoid the browser autoplay-policy warning. Consumers must opt in via
 * `setEnabled(true)` — that call is also the natural place for a user
 * gesture, which lets the context move out of the `suspended` state.
 */
export class DrumRotationAudio {
  private ctx: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | OscillatorNode | null = null;
  private url: string | null = null;
  private enabled = false;
  private active = 0;
  private loadPromise: Promise<void> | null = null;
  private readonly fallbackTone: boolean;
  private readonly loop: boolean;

  /**
   * @param options.fallbackTone Play the sawtooth placeholder when no buffer is loaded. Default true.
   * @param options.loop Loop the decoded buffer while a rotation is active. Default true; set false for a finite one-shot clip.
   */
  constructor(options: { fallbackTone?: boolean; loop?: boolean } = {}) {
    this.fallbackTone = options.fallbackTone ?? true;
    this.loop = options.loop ?? true;
  }

  /** Pass null to clear the asset and use the procedural fallback. Decode runs in the background. */
  setUrl(url: string | null): void {
    this.url = url;
    if (url === null) {
      this.buffer = null;
      this.loadPromise = null;
      return;
    }
    this.loadPromise = this.loadUrl(url);
  }

  /**
   * Resolve once the current URL's buffer has finished decoding (or immediately
   * if no URL is set or the load failed). Lets callers that must hear the real
   * recording on their first `startRotation` — e.g. the calibration sweep — wait
   * out the background decode instead of racing it and falling back to the tone.
   */
  whenLoaded(): Promise<void> {
    return this.loadPromise ?? Promise.resolve();
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.stopAll();
  }

  /** Increment the refcount; play if this is the first active rotation. */
  startRotation(): void {
    if (!this.enabled) return;
    this.active++;
    if (this.active === 1) this.play();
  }

  /** Decrement the refcount; stop with a short fade when no rotations remain. */
  endRotation(): void {
    if (this.active === 0) return;
    this.active--;
    if (this.active === 0) this.stopWithFade();
  }

  /** Hard reset — used by Tower3DView.showIdle and dispose. */
  stopAll(): void {
    this.active = 0;
    this.stopWithFade();
  }

  dispose(): void {
    this.enabled = false;
    this.stopAll();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
    }
    this.gain = null;
    this.buffer = null;
  }

  private async loadUrl(url: string): Promise<void> {
    try {
      const ctx = this.ensureCtx(false);
      const res = await fetch(url);
      const arr = await res.arrayBuffer();
      if (this.url !== url) return;
      this.buffer = await ctx.decodeAudioData(arr);
      // A rotation that began while the buffer was still decoding stayed silent
      // (no fallback tone, nothing to play yet). Now that the buffer is ready,
      // start it so that in-progress rotation catches up instead of playing
      // nothing — fixes the first rotation after a cold load, where the same
      // gesture that enables audio also kicks off this decode.
      if (this.enabled && this.active > 0 && !this.source) {
        this.play();
      }
    } catch (err) {
       
      console.error('[DrumRotationAudio] failed to load', url, err);
    }
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

  private play(): void {
    // No real buffer and the placeholder is disabled → stay silent rather than
    // buzz. Guarded before ensureCtx so we don't spin up an AudioContext for
    // nothing.
    if (!this.buffer && !this.fallbackTone) return;
    const ctx = this.ensureCtx(true);
    if (!this.gain) {
      this.gain = ctx.createGain();
      this.gain.connect(ctx.destination);
    }
    const now = ctx.currentTime;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(1.0, now);

    let source: AudioBufferSourceNode | OscillatorNode;
    if (this.buffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.buffer;
      src.loop = this.loop;
      source = src;
    } else {
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(70, now);
      source = osc;
    }
    source.connect(this.gain);
    source.start();
    this.source = source;
  }

  private stopWithFade(): void {
    const ctx = this.ctx;
    if (!ctx || !this.gain || !this.source) return;
    const now = ctx.currentTime;
    const fade = 0.08;
    this.gain.gain.cancelScheduledValues(now);
    this.gain.gain.setValueAtTime(this.gain.gain.value, now);
    this.gain.gain.linearRampToValueAtTime(0, now + fade);
    const src = this.source;
    this.source = null;
    try {
      src.stop(now + fade);
    } catch {
      // already stopped — safe to ignore
    }
  }
}
