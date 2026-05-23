import * as THREE from 'three';
import gsap from 'gsap';
import type { TowerState } from 'ultimatedarktower';
import {
  DRUM_LEVELS_BY_INDEX,
  DRUM_RADIANS_PER_SIDE,
  DRUM_ROTATION_DURATION_S,
  DRUM_ROTATION_EASE,
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
      const finalY = ref.currentY + shortestArcDelta(ref.currentY, rawTarget);

      ref.tween?.kill();
      ref.tween = null;

      if (!animate || finalY === ref.currentY) {
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
        duration: DRUM_ROTATION_DURATION_S,
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
