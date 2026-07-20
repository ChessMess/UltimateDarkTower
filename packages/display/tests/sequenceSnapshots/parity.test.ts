// Snapshot tests need real GSAP — `tests/__mocks__/gsap.js` is a recording
// mock that doesn't actually evaluate timelines. The parity test needs real
// `tl.totalTime(t)` to advance tweens deterministically.
jest.unmock('gsap');

import * as fs from 'fs';
import * as path from 'path';
import { JSON_SEQUENCE_DATA } from '../../src/sequences/jsonSequences';
import * as SequencePlayer from '../../src/sequences/SequencePlayer';
import { mulberry32 } from '../helpers/seededRng';
import { RecordingAnimator } from '../helpers/recordingAnimator';
import { driveSequence } from '../helpers/sequenceDriver';
import { SEQUENCES, SEED, TOLERANCE } from './sequences';

/**
 * Parity tests: for every id in `SEQUENCES`, build the JSON via
 * `SequencePlayer.build` under a fixed RNG seed, drive it through the
 * snapshot driver, and assert per-tick per-LED agreement with the committed
 * baseline within 1/255 PWM. The baselines were originally captured from the
 * TS builders (now archived under `.local/legacy-sequence-system/`) and are
 * the canonical contract going forward.
 *
 * See `tests/sequenceSnapshots/__snapshots__/{name}.snap.json` for the
 * committed baselines (frozen contracts).
 */
const SNAPSHOT_DIR = path.join(__dirname, '__snapshots__');

// Opt-in write mode. These baselines are the frozen golden contract, so
// regeneration is gated behind an explicit env var (never a normal `npm test`)
// and prints a loud banner so an accidental overwrite is obvious in the diff.
const UPDATE_SNAPSHOTS = Boolean(process.env.UPDATE_SNAPSHOTS);
if (UPDATE_SNAPSHOTS) {
  console.warn(
    '\n⚠️  UPDATE_SNAPSHOTS set — REWRITING sequence baselines (the frozen golden contract).\n' +
      '   Review the git diff carefully before committing.\n',
  );
}

interface RecordedSnapshot {
  seed: number;
  driveTicks: number;
  loop: boolean;
  completionTick: number | null;
  samples: number[][];
}

describe('sequence player ↔ TS parity', () => {
  // Completeness gate: with the TS fallback gone, a sequence id missing from
  // JSON_SEQUENCE_DATA renders nothing in production. This test fails loudly
  // before the per-sequence parity tests so a future-added id (e.g. a new
  // entry in TOWER_LIGHT_SEQUENCES upstream) surfaces immediately.
  test('every spec sequence has a JSON entry', () => {
    const missing = SEQUENCES.filter((s) => !JSON_SEQUENCE_DATA.has(s.id)).map((s) => s.name);
    expect(missing).toEqual([]);
  });

  for (const spec of SEQUENCES) {
    const json = JSON_SEQUENCE_DATA.get(spec.id);
    if (!json) continue; // not yet authored

    test(spec.name, () => {
      const animator = new RecordingAnimator();
      const rng = mulberry32(SEED);
      const result = driveSequence(
        (onComplete) =>
          SequencePlayer.build(json, { ledAnimator: animator.asLedAnimator(), rng }, onComplete),
        animator,
        spec.driveTicks,
      );

      const snapshotPath = path.join(SNAPSHOT_DIR, `${spec.name}.snap.json`);

      if (UPDATE_SNAPSHOTS) {
        const recorded: RecordedSnapshot = {
          seed: SEED,
          driveTicks: spec.driveTicks,
          loop: spec.loop,
          completionTick: result.completionTick,
          samples: result.samples,
        };
        // Emit plain JSON; `record-sequence-snapshots` runs prettier --write
        // afterward to canonicalize to the committed format.
        fs.writeFileSync(snapshotPath, JSON.stringify(recorded, null, 2) + '\n');
        console.warn(`  ✎ recorded baseline: ${spec.name}.snap.json`);
        return;
      }

      if (!fs.existsSync(snapshotPath)) {
        throw new Error(
          `Missing baseline ${snapshotPath} (run \`npm run record-sequence-snapshots\` to generate it)`,
        );
      }
      const expected = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as RecordedSnapshot;

      expect(result.samples).toHaveLength(expected.samples.length);
      for (let tick = 0; tick < expected.samples.length; tick++) {
        const exp = expected.samples[tick];
        const got = result.samples[tick];
        for (let led = 0; led < exp.length; led++) {
          const diff = Math.abs(exp[led] - got[led]);
          if (diff > TOLERANCE) {
            const layer = Math.floor(led / 4);
            const light = led % 4;
            throw new Error(
              `${spec.name}: divergence at tick ${tick} LED (${layer},${light}) — ` +
                `TS=${exp[led].toFixed(6)}, JSON=${got[led].toFixed(6)}, diff ${diff.toFixed(6)}`,
            );
          }
        }
      }
    });
  }
});
