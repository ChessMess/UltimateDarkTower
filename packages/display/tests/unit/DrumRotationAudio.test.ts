import { DrumRotationAudio } from '../../src/audio/DrumRotationAudio';

// ───── Inline Web Audio mocks ─────────────────────────────────────────────
// jsdom doesn't provide Web Audio. Each test resets these and asserts on the
// recorded mock instances.

class MockAudioParam {
  value = 1;
  cancelScheduledValues = jest.fn<void, [number]>();
  setValueAtTime = jest.fn<void, [number, number]>();
  linearRampToValueAtTime = jest.fn<void, [number, number]>();
}

class MockGainNode {
  gain = new MockAudioParam();
  connect = jest.fn();
}

class MockOscillator {
  type = '';
  frequency = new MockAudioParam();
  connect = jest.fn();
  startCalls = 0;
  stopCalls = 0;
  start(): void { this.startCalls++; }
  stop(_when?: number): void { this.stopCalls++; }
}

class MockBufferSource {
  buffer: unknown = null;
  loop = false;
  connect = jest.fn();
  startCalls = 0;
  stopCalls = 0;
  start(): void { this.startCalls++; }
  stop(_when?: number): void { this.stopCalls++; }
}

class MockAudioContext {
  state: 'running' | 'suspended' | 'closed' = 'running';
  currentTime = 0;
  destination = {};
  resume = jest.fn(() => Promise.resolve());
  close = jest.fn(() => Promise.resolve());
  createGain(): MockGainNode {
    const g = new MockGainNode();
    createdGains.push(g);
    return g;
  }
  createOscillator(): MockOscillator {
    const o = new MockOscillator();
    createdOscillators.push(o);
    return o;
  }
  createBufferSource(): MockBufferSource {
    const s = new MockBufferSource();
    createdBufferSources.push(s);
    return s;
  }
  decodeAudioData(_arr: ArrayBuffer): Promise<AudioBuffer> {
    return Promise.resolve({} as AudioBuffer);
  }
}

let createdContexts: MockAudioContext[] = [];
let createdGains: MockGainNode[] = [];
let createdOscillators: MockOscillator[] = [];
let createdBufferSources: MockBufferSource[] = [];

const ContextSpy = jest.fn(() => {
  const ctx = new MockAudioContext();
  createdContexts.push(ctx);
  return ctx;
});

beforeEach(() => {
  createdContexts = [];
  createdGains = [];
  createdOscillators = [];
  createdBufferSources = [];
  ContextSpy.mockClear();
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = ContextSpy;
});

// ───── Tests ──────────────────────────────────────────────────────────────

describe('DrumRotationAudio', () => {
  it('startRotation is a no-op when disabled (no AudioContext created)', () => {
    const audio = new DrumRotationAudio();
    audio.startRotation();
    expect(createdContexts).toHaveLength(0);
    expect(createdOscillators).toHaveLength(0);
  });

  it('plays a procedural oscillator on first startRotation when enabled', () => {
    const audio = new DrumRotationAudio();
    audio.setEnabled(true);
    audio.startRotation();

    expect(createdContexts).toHaveLength(1);
    expect(createdOscillators).toHaveLength(1);
    const osc = createdOscillators[0];
    expect(osc.type).toBe('sawtooth');
    expect(osc.startCalls).toBe(1);
    expect(osc.connect).toHaveBeenCalled();
  });

  it('with fallbackTone:false and no buffer, startRotation stays silent (no oscillator, no context)', () => {
    const audio = new DrumRotationAudio({ fallbackTone: false });
    audio.setEnabled(true);
    audio.startRotation();

    expect(createdOscillators).toHaveLength(0);
    expect(createdContexts).toHaveLength(0);
  });

  it('plays a loaded buffer non-looping when constructed with { loop: false }', async () => {
    const g = globalThis as unknown as { fetch?: unknown };
    const original = g.fetch;
    g.fetch = jest.fn(() =>
      Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
    );
    try {
      const audio = new DrumRotationAudio({ loop: false });
      audio.setUrl('mock://clip.ogg');
      await audio.whenLoaded();
      audio.setEnabled(true);
      audio.startRotation();

      expect(createdBufferSources).toHaveLength(1);
      expect(createdBufferSources[0].loop).toBe(false);
      expect(createdOscillators).toHaveLength(0); // real buffer → no fallback tone
    } finally {
      g.fetch = original;
    }
  });

  it('starts playback when the buffer finishes decoding mid-rotation (deferred start)', async () => {
    // Reproduces the cold-load case: the same gesture that enables audio also
    // kicks off the decode, so the first rotation begins before the buffer is
    // ready. With no fallback tone it stays silent until the buffer lands, then
    // catches up.
    const g = globalThis as unknown as { fetch?: unknown };
    const original = g.fetch;
    g.fetch = jest.fn(() =>
      Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
    );
    try {
      const audio = new DrumRotationAudio({ fallbackTone: false, loop: false });
      audio.setUrl('mock://clip.ogg'); // decode starts, not yet resolved
      audio.setEnabled(true);
      audio.startRotation(); // buffer not ready → silent, no source yet
      expect(createdBufferSources).toHaveLength(0);

      await audio.whenLoaded(); // decode resolves → deferred start fires
      expect(createdBufferSources).toHaveLength(1);
      expect(createdBufferSources[0].startCalls).toBe(1);
      expect(createdBufferSources[0].loop).toBe(false);
    } finally {
      g.fetch = original;
    }
  });

  it('does not deferred-start if the rotation already ended before the buffer loaded', async () => {
    const g = globalThis as unknown as { fetch?: unknown };
    const original = g.fetch;
    g.fetch = jest.fn(() =>
      Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
    );
    try {
      const audio = new DrumRotationAudio({ fallbackTone: false, loop: false });
      audio.setUrl('mock://clip.ogg');
      audio.setEnabled(true);
      audio.startRotation();
      audio.endRotation(); // rotation finished before decode landed

      await audio.whenLoaded();
      expect(createdBufferSources).toHaveLength(0); // nothing to catch up
    } finally {
      g.fetch = original;
    }
  });

  it('shares one source across overlapping rotations (refcount)', () => {
    const audio = new DrumRotationAudio();
    audio.setEnabled(true);
    audio.startRotation();
    audio.startRotation();
    audio.startRotation();

    expect(createdOscillators).toHaveLength(1);

    audio.endRotation();
    audio.endRotation();
    expect(createdOscillators[0].stopCalls).toBe(0); // still active

    audio.endRotation();
    expect(createdOscillators[0].stopCalls).toBe(1);
  });

  it('endRotation when refcount is already 0 is a safe no-op', () => {
    const audio = new DrumRotationAudio();
    audio.setEnabled(true);
    audio.endRotation();
    expect(createdOscillators).toHaveLength(0);
  });

  it('setEnabled(false) mid-rotation stops the source and resets the refcount', () => {
    const audio = new DrumRotationAudio();
    audio.setEnabled(true);
    audio.startRotation();
    audio.startRotation();

    audio.setEnabled(false);
    expect(createdOscillators[0].stopCalls).toBe(1);

    // After re-enabling, the next startRotation should create a fresh source
    // (refcount went back to 0 with setEnabled(false)).
    audio.setEnabled(true);
    audio.startRotation();
    expect(createdOscillators).toHaveLength(2);
  });

  it('setEnabled(false) when not playing does nothing dangerous', () => {
    const audio = new DrumRotationAudio();
    audio.setEnabled(false);
    expect(createdContexts).toHaveLength(0);
  });

  it('stopWithFade ramps gain to 0 and schedules source.stop', () => {
    const audio = new DrumRotationAudio();
    audio.setEnabled(true);
    audio.startRotation();
    audio.endRotation();

    const gain = createdGains[0];
    expect(gain.gain.linearRampToValueAtTime).toHaveBeenCalled();
    const lastCall = gain.gain.linearRampToValueAtTime.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe(0);
  });

  it('dispose closes the context and stops any in-flight playback', () => {
    const audio = new DrumRotationAudio();
    audio.setEnabled(true);
    audio.startRotation();

    const ctx = createdContexts[0];
    audio.dispose();

    expect(ctx.close).toHaveBeenCalled();
    expect(createdOscillators[0].stopCalls).toBe(1);
  });

  it('dispose without ever starting is a no-op', () => {
    const audio = new DrumRotationAudio();
    audio.dispose();
    expect(createdContexts).toHaveLength(0);
  });

  it('resumes a suspended AudioContext on first play', () => {
    const audio = new DrumRotationAudio();
    audio.setEnabled(true);

    // Make the next-created context start suspended.
    ContextSpy.mockImplementationOnce(() => {
      const ctx = new MockAudioContext();
      ctx.state = 'suspended';
      createdContexts.push(ctx);
      return ctx;
    });

    audio.startRotation();
    expect(createdContexts[0].resume).toHaveBeenCalled();
  });
});
