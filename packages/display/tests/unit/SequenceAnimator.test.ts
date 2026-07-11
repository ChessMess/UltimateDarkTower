import { TOWER_LIGHT_SEQUENCES } from 'ultimatedarktower';
import { SequenceAnimator } from '../../src/sequences/SequenceAnimator';
import { RecordingAnimator } from '../helpers/recordingAnimator';
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const gsapMock = require('gsap');

const seededRng = () => 0.42; // deterministic; sequence builders just need a number 0..1

function makeAnimator(): { animator: SequenceAnimator; led: RecordingAnimator } {
  const led = new RecordingAnimator();
  const animator = new SequenceAnimator({
    ledAnimator: led.asLedAnimator(),
    rng: seededRng,
  });
  return { animator, led };
}

// `defeat` is one of the canonical short sequences and is guaranteed by the
// parity test suite to exist in JSON_SEQUENCE_DATA.
const SEQ_DEFEAT = TOWER_LIGHT_SEQUENCES.defeat;
const SEQ_VICTORY = TOWER_LIGHT_SEQUENCES.victory;

beforeEach(() => {
  gsapMock.__reset();
});

describe('SequenceAnimator state-driven apply (existing behavior, unchanged)', () => {
  it('apply(seqId) creates a timeline; apply(0) kills it', () => {
    const { animator } = makeAnimator();
    const active = animator.apply(SEQ_DEFEAT, () => { /* */ });
    expect(active).toBe(true);

    const timelines = gsapMock.__getTimelines();
    expect(timelines.length).toBeGreaterThanOrEqual(1);
    const tl = timelines[timelines.length - 1];
    expect(tl.killed).toBe(false);

    const stillActive = animator.apply(0, () => { /* */ });
    expect(stillActive).toBe(false);
    expect(tl.killed).toBe(true);
  });

  it('same-id reapply is a no-op (returns true, no new timeline)', () => {
    const { animator } = makeAnimator();
    animator.apply(SEQ_DEFEAT, () => { /* */ });
    const before = gsapMock.__getTimelines().length;
    const stillActive = animator.apply(SEQ_DEFEAT, () => { /* */ });
    expect(stillActive).toBe(true);
    expect(gsapMock.__getTimelines().length).toBe(before);
  });

  it('different-id reapply replaces the timeline (old killed, new active)', () => {
    const { animator } = makeAnimator();
    animator.apply(SEQ_DEFEAT, () => { /* */ });
    const firstTl = gsapMock.__getTimelines().at(-1)!;
    animator.apply(SEQ_VICTORY, () => { /* */ });
    const secondTl = gsapMock.__getTimelines().at(-1)!;
    expect(firstTl.killed).toBe(true);
    expect(firstTl).not.toBe(secondTl);
    expect(secondTl.killed).toBe(false);
  });
});

describe('SequenceAnimator transient mode (new in 0.7.0)', () => {
  it('applyTransient(seqId) starts the sequence and returns true', () => {
    const { animator } = makeAnimator();
    const ok = animator.applyTransient(SEQ_DEFEAT);
    expect(ok).toBe(true);
    expect(animator.isActive(SEQ_DEFEAT)).toBe(true);
  });

  it('applyTransient(0) returns false and does nothing', () => {
    const { animator } = makeAnimator();
    const ok = animator.applyTransient(0);
    expect(ok).toBe(false);
    expect(gsapMock.__getTimelines()).toHaveLength(0);
  });

  it('apply(0) does NOT kill a transient-driven sequence (the bug fix)', () => {
    const { animator } = makeAnimator();
    animator.applyTransient(SEQ_DEFEAT);
    const tl = gsapMock.__getTimelines().at(-1)!;
    expect(tl.killed).toBe(false);

    // Simulate the framework's state-mirror reset arriving immediately after.
    const stillActive = animator.apply(0, () => { /* */ });
    expect(stillActive).toBe(true);
    expect(tl.killed).toBe(false);
    expect(animator.isActive(SEQ_DEFEAT)).toBe(true);
  });

  it('after transient sequence completes, normal apply(0) kills it again', () => {
    const { animator } = makeAnimator();
    animator.applyTransient(SEQ_DEFEAT);
    const tl = gsapMock.__getTimelines().at(-1)!;

    // Simulate sequence completion (the wrapped onComplete fires).
    tl.__fireComplete();

    // Animator should be back to idle.
    expect(animator.isActive(SEQ_DEFEAT)).toBe(false);

    // A subsequent state-driven sequence behaves normally now.
    animator.apply(SEQ_VICTORY, () => { /* */ });
    const nextTl = gsapMock.__getTimelines().at(-1)!;
    expect(nextTl.killed).toBe(false);
    animator.apply(0, () => { /* */ });
    expect(nextTl.killed).toBe(true);
  });

  it('applyTransient replaces a different active transient sequence', () => {
    const { animator } = makeAnimator();
    animator.applyTransient(SEQ_DEFEAT);
    const first = gsapMock.__getTimelines().at(-1)!;
    animator.applyTransient(SEQ_VICTORY);
    const second = gsapMock.__getTimelines().at(-1)!;
    expect(first.killed).toBe(true);
    expect(second.killed).toBe(false);
    expect(animator.isActive(SEQ_VICTORY)).toBe(true);
  });

  it('explicit stop() ends a transient sequence even while transient flag is set', () => {
    const { animator } = makeAnimator();
    animator.applyTransient(SEQ_DEFEAT);
    const tl = gsapMock.__getTimelines().at(-1)!;
    animator.stop();
    expect(tl.killed).toBe(true);
    expect(animator.isActive(SEQ_DEFEAT)).toBe(false);
  });

  it('transient onComplete callback fires when the timeline completes', () => {
    const { animator } = makeAnimator();
    const onComplete = jest.fn();
    animator.applyTransient(SEQ_DEFEAT, onComplete);
    const tl = gsapMock.__getTimelines().at(-1)!;
    tl.__fireComplete();
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('applyTransient with an unknown sequence id returns false and starts nothing', () => {
    const { animator } = makeAnimator();
    const ok = animator.applyTransient(0xff);
    expect(ok).toBe(false);
    expect(animator.isActive(0xff)).toBe(false);
  });

  it('state-driven apply(seqId) after a completed transient resumes normal behavior', () => {
    const { animator } = makeAnimator();
    animator.applyTransient(SEQ_DEFEAT);
    const transientTl = gsapMock.__getTimelines().at(-1)!;
    transientTl.__fireComplete();

    // Now a different state-driven sequence should work normally.
    animator.apply(SEQ_VICTORY, () => { /* */ });
    expect(animator.isActive(SEQ_VICTORY)).toBe(true);
  });
});
