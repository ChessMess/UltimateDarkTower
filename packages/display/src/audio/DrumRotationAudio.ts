/**
 * Plays a looping sound while drums are rotating in the 3D view.
 *
 * - When a URL is set, fetches and decodes the asset; that buffer is looped
 *   for the lifetime of each rotation burst.
 * - When no URL is set, falls back to a procedural sawtooth oscillator —
 *   audible placeholder until the real recorded asset is wired in.
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

  /** Pass null to clear the asset and use the procedural fallback. Decode runs in the background. */
  setUrl(url: string | null): void {
    this.url = url;
    if (url === null) {
      this.buffer = null;
      return;
    }
    void this.loadUrl(url);
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
    } catch (err) {
      // eslint-disable-next-line no-console
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
      src.loop = true;
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
