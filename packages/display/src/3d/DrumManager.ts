import * as THREE from 'three';
import gsap from 'gsap';
import type { TowerState } from 'ultimatedarktower';
import {
  DRUM_LEVELS_BY_INDEX,
  DRUM_RADIANS_PER_SIDE,
  DRUM_ROTATION_EPSILON,
  DRUM_ROTATION_EASE,
  drumRotationDurationS,
} from './constants';
import type { DrumRotationAudio } from '../audio/DrumRotationAudio';

const DRUM_NAME_PREFIX = 'drum_';

type DrumLevel = 'top' | 'middle' | 'bottom';

interface DrumRef {
  node: THREE.Object3D;
  /** Last applied Y rotation. Continuous (not modulo'd) so shortest-arc resolution sees the true history. */
  currentY: number;
  tween: gsap.core.Tween | null;
}

interface ApplyOptions {
  /** When false, snap directly to the target rotation with no animation or audio. Defaults to true. */
  animate?: boolean;
}

/**
 * Manages the 3 rotating drum mesh nodes (`drum_top` / `drum_middle` /
 * `drum_bottom`) and animates them to match `state.drum[i].position` whenever
 * a new TowerState is applied. Optionally pings a DrumRotationAudio handle on
 * rotation start/end.
 *
 * `calibrated` and `jammed` are intentionally ignored — the firmware reports
 * a position regardless, and keeping the visual in sync with that report is
 * the right behavior for a display.
 */
export class DrumManager {
  readonly drumRefs: Map<DrumLevel, DrumRef> = new Map();

  constructor(private readonly audio?: DrumRotationAudio) {}

  /** Return the registered drum Object3D for a level, or `null` if absent. */
  getDrumNode(level: DrumLevel): THREE.Object3D | null {
    return this.drumRefs.get(level)?.node ?? null;
  }

  /** Walk the loaded GLTF root and register `drum_top` / `drum_middle` / `drum_bottom`. */
  buildDrumNodes(root: THREE.Object3D): void {
    root.traverse((child) => {
      if (!child.name.startsWith(DRUM_NAME_PREFIX)) return;
      const level = child.name.slice(DRUM_NAME_PREFIX.length);
      if (!isDrumLevel(level)) return;
      this.drumRefs.set(level, {
        node: child,
        currentY: child.rotation.y,
        tween: null,
      });
    });
  }

  /** Log a one-shot warning listing any expected drum nodes absent from the model. */
  warnOnMissing(): void {
    const missing = DRUM_LEVELS_BY_INDEX.filter(level => !this.drumRefs.has(level));
    if (missing.length === 0) return;
    // eslint-disable-next-line no-console
    console.warn(
      `[Tower3DView] ${missing.length} drum node(s) missing from the loaded model; ` +
      `applyDrums will be a no-op for them. Missing: ${missing.map(l => `${DRUM_NAME_PREFIX}${l}`).join(', ')}.`,
    );
  }

  /** Rotate each drum to the position reported by `drums[i]`. */
  applyDrums(drums: TowerState['drum'], opts: ApplyOptions = {}): void {
    if (this.drumRefs.size === 0) return;
    const animate = opts.animate ?? true;

    for (let i = 0; i < DRUM_LEVELS_BY_INDEX.length; i++) {
      const level = DRUM_LEVELS_BY_INDEX[i];
      const ref = this.drumRefs.get(level);
      if (!ref) continue;
      const drum = drums[i];
      if (!drum) continue;

      const rawTarget = drum.position * DRUM_RADIANS_PER_SIDE;
      const delta = shortestArcDelta(ref.currentY, rawTarget);
      const finalY = ref.currentY + delta;

      ref.tween?.kill();
      ref.tween = null;

      // Snap (no tween, no audio) when already there. The epsilon guards against
      // floating-point residue from prior rotations spawning a phantom tween that
      // would ring the rotation audio for an imperceptible move.
      if (!animate || Math.abs(delta) < DRUM_ROTATION_EPSILON) {
        ref.node.rotation.y = finalY;
        ref.currentY = finalY;
        continue;
      }

      const audio = this.audio;
      audio?.startRotation();
      let ended = false;
      const endOnce = (): void => {
        if (ended) return;
        ended = true;
        audio?.endRotation();
      };

      ref.tween = gsap.to(ref, {
        currentY: finalY,
        duration: drumRotationDurationS(delta),
        ease: DRUM_ROTATION_EASE,
        onUpdate: () => { ref.node.rotation.y = ref.currentY; },
        onComplete: () => {
          ref.tween = null;
          endOnce();
        },
        onInterrupt: endOnce,
      });
    }
  }

  /**
   * Calibration homing sweep for a single drum level: spin it to position 0
   * (north), adding one full extra revolution so the motion reads as a
   * deliberate "hunt" even when the drum is already near zero. Resolves when the
   * tween settles. Resolves immediately if the level is not present in the model.
   *
   * `audio` selects which rotation-audio handle to ring for this sweep, defaulting
   * to the shared instance. The calibration command passes a dedicated player so
   * its recording plays without touching the normal drum-rotation audio.
   */
  calibrateDrum(level: DrumLevel, audio: DrumRotationAudio | null = this.audio ?? null): Promise<void> {
    const ref = this.drumRefs.get(level);
    if (!ref) return Promise.resolve();

    // Shortest arc to the position-0 orientation, plus one full turn
    // (4 cardinal steps = ±2π) for a visible sweep.
    const toZero = shortestArcDelta(ref.currentY, 0);
    const fullTurn = DRUM_RADIANS_PER_SIDE * 4;
    const sweep = toZero + fullTurn;
    const finalY = ref.currentY + sweep;

    ref.tween?.kill();
    ref.tween = null;

    audio?.startRotation();

    return new Promise<void>((resolve) => {
      let ended = false;
      const endOnce = (): void => {
        if (ended) return;
        ended = true;
        audio?.endRotation();
        resolve();
      };
      ref.tween = gsap.to(ref, {
        currentY: finalY,
        duration: drumRotationDurationS(sweep),
        ease: DRUM_ROTATION_EASE,
        onUpdate: () => { ref.node.rotation.y = ref.currentY; },
        onComplete: () => {
          ref.tween = null;
          endOnce();
        },
        onInterrupt: endOnce,
      });
    });
  }

  /** Kill in-flight rotations and balance the audio refcount. */
  stopAll(): void {
    for (const ref of this.drumRefs.values()) {
      ref.tween?.kill();
      ref.tween = null;
    }
  }

  dispose(): void {
    this.stopAll();
    this.drumRefs.clear();
  }
}

function isDrumLevel(value: string): value is DrumLevel {
  return value === 'top' || value === 'middle' || value === 'bottom';
}

/** Shortest signed delta from `current` to `target` in radians, in [-π, π]. */
function shortestArcDelta(current: number, target: number): number {
  const TWO_PI = Math.PI * 2;
  let delta = (target - current) % TWO_PI;
  if (delta > Math.PI) delta -= TWO_PI;
  else if (delta < -Math.PI) delta += TWO_PI;
  return delta;
}
