import * as THREE from 'three';
import gsap from 'gsap';
import type { SceneLighting } from './SceneLighting';
import type { ResolvedLightingConfig } from './types';

/**
 * Drives the noir entrance cinematic for the 3D tower view. Owns the GSAP
 * timeline so the lifecycle (play / stop / dispose) is isolated from
 * Tower3DView.
 */
export class EntranceAnimator {
  private tween: gsap.core.Timeline | null = null;

  /**
   * Start the entrance animation. Any in-flight entrance or breathing tween
   * is killed before the new run begins.
   */
  play(
    sl: SceneLighting,
    renderer: THREE.WebGLRenderer,
    lighting: ResolvedLightingConfig,
  ): void {
    this.stop();
    sl.stopBreathing();

    const targets = {
      hemi: sl.hemi.intensity,
      key: sl.key.intensity,
      fill: sl.fill.intensity,
      exposure: renderer.toneMappingExposure,
      keyX: sl.key.position.x,
      keyY: sl.key.position.y,
      keyZ: sl.key.position.z,
    };

    // Black out all lights for the silhouette hold.
    sl.hemi.intensity = 0;
    sl.key.intensity = 0;
    sl.fill.intensity = 0;
    renderer.toneMappingExposure = 0;

    // Snap the key far off to the opposite side and low — the searchlight
    // will arc across the top of the model from there into the target.
    sl.key.position.set(-Math.abs(targets.keyX) * 1.8, targets.keyY * 0.25, targets.keyZ - 8);

    const { peakKeyFactor, beats } = lighting.entrance;
    const peakKey = targets.key * peakKeyFactor;

    const tl = gsap.timeline({
      onComplete: () => sl.startBreathing(targets.key, lighting),
    });

    // Beat 1 — long silhouette hold: exposure + minimal hemi creep in
    // barely enough to suggest a shape in the dark.
    tl.to(renderer, {
      toneMappingExposure: targets.exposure * beats.silhouetteExposureFactor,
      duration: beats.silhouetteDurationS,
      ease: 'power1.in',
    }, 0);
    tl.to(sl.hemi, {
      intensity: targets.hemi * beats.silhouetteHemiFactor,
      duration: beats.silhouetteDurationS,
      ease: 'power1.in',
    }, 0);

    // Beat 2 — key arcs over the top: first leg to an overhead waypoint.
    tl.to(sl.key.position, {
      x: targets.keyX * 0.2,
      y: Math.max(targets.keyY * 1.8, targets.keyY + 3),
      z: targets.keyZ - 3,
      duration: beats.keyArc1DurationS,
      ease: 'power2.in',
    }, beats.keyArc1DelayS);

    // Beat 3 — key punches on during the arc: intensity overshoots past
    // target for the flash beat, exposure climbs to full.
    tl.to(sl.key, {
      intensity: peakKey,
      duration: beats.keyPunchDurationS,
      ease: 'power3.out',
    }, beats.keyPunchDelayS);
    tl.to(renderer, {
      toneMappingExposure: targets.exposure,
      duration: beats.exposureInDurationS,
      ease: 'power2.out',
    }, beats.keyPunchDelayS);

    // Beat 4 — second arc leg: key descends from waypoint to target.
    tl.to(sl.key.position, {
      x: targets.keyX,
      y: targets.keyY,
      z: targets.keyZ,
      duration: beats.keyArc2DurationS,
      ease: 'power2.out',
    }, beats.keyArc2DelayS);

    // Beat 5 — key settles from peak back to its resting intensity.
    tl.to(sl.key, {
      intensity: targets.key,
      duration: beats.keySettleDurationS,
      ease: 'power2.inOut',
    }, beats.keySettleDelayS);

    // Beat 6 — fill + remaining hemi ease in last so the shadow side stays
    // mysterious until the reveal has landed.
    tl.to(sl.fill, {
      intensity: targets.fill,
      duration: beats.fillInDurationS,
      ease: 'power1.out',
    }, beats.fillInDelayS);
    tl.to(sl.hemi, {
      intensity: targets.hemi,
      duration: beats.hemiInDurationS,
      ease: 'power1.out',
    }, beats.hemiInDelayS);

    this.tween = tl;
  }

  /** Kill any in-flight entrance timeline without triggering its onComplete. */
  stop(): void {
    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }
  }

  dispose(): void {
    this.stop();
  }
}
