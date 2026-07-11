import * as THREE from 'three';
import gsap from 'gsap';
import { LIGHT_EFFECTS } from 'ultimatedarktower';
import type { TowerState } from 'ultimatedarktower';
import type { ResolvedLightingConfig } from './types';
import { TOWER_LAYER_COUNT, LIGHTS_PER_LAYER, RING_LEVEL_BY_LAYER_INDEX, SIDES } from './constants';
import type { SealManager } from './SealManager';
import { FIRMWARE_TICK_HZ } from '../sequences/sequenceMetadata';
import { randomFlickerTarget } from '../sequences/builders/ledMath';

/**
 * Per-LED effect timings, in ticks at 50 Hz, taken directly from the firmware
 * (`Effect_Breathe`, `Effect_BreatheFast`, `Effect_Breathe50` in
 * `light_manager.c`). Half-period values are what GSAP needs for a yoyo tween.
 */
const BREATHE_PERIOD_TICKS = 512;
const BREATHE_FAST_PERIOD_TICKS = 128;
/** 1900 ms / 20 ms-per-tick — load-bearing for sealReveal sound sync. */
const BREATHE_50_PERIOD_TICKS = 95;
const FLICKER_TARGET_UPDATE_PROBABILITY = 0.25;
const FLICKER_LERP_ALPHA = 0.15;

const TICK_S = 1 / FIRMWARE_TICK_HZ;

export interface LedRef {
  driver: { v: number };
  /** The active GSAP animation driving this LED's effect. Holds a Tween for
   *  Breathe/BreatheFast/Breathe50, a Timeline for Flicker, and null for
   *  On/Off (which write instantaneously). */
  tween: gsap.core.Animation | null;
  /** Ball-type proxy sphere mesh — present only for ledge (layer 3) and base (layers 4–5) LEDs. */
  proxyMesh?: THREE.Mesh;
  /** Soft halo sprite — present only for ledge (layer 3) and base (layers 4–5) LEDs. */
  haloSprite?: THREE.Sprite;
}

export class LedEffectAnimator {
  constructor(
    private readonly ledRefs: Map<string, LedRef>,
    private readonly getConfig: () => ResolvedLightingConfig,
    private readonly sealManager?: SealManager,
  ) { }

  private getSealKey(layer: number, light: number): string | null {
    if (layer >= 3 || !this.sealManager) return null;
    const level = RING_LEVEL_BY_LAYER_INDEX[layer];
    const side = SIDES[light];
    return `${side}:${level}`;
  }

  private writeLed(ref: LedRef, layer: number, sealKey: string | null): void {
    const { driver } = ref;
    const cfg = this.getConfig();
    // LEDs render as HDR-bright emissive proxies + halos: `driver.v` drives the
    // proxy/halo material opacity below, and the raised bloom threshold selects
    // those HDR-bright pixels to amplify. There are no per-LED PointLights.

    if (sealKey && this.sealManager) {
      this.sealManager.setSealLed(sealKey, driver.v, cfg);
    }

    const ledgeCfg = cfg.leds.ledgeLeds;
    if (ref.proxyMesh && layer === 3 && ledgeCfg.enabled) {
      if (ledgeCfg.proxy.enabled) {
        (ref.proxyMesh.material as THREE.MeshBasicMaterial).opacity = driver.v;
        ref.proxyMesh.visible = driver.v > 0.001;
      } else {
        ref.proxyMesh.visible = false;
      }
    }
    if (ref.haloSprite && layer === 3 && ledgeCfg.enabled) {
      if (ledgeCfg.halo.enabled) {
        (ref.haloSprite.material as THREE.SpriteMaterial).opacity =
          driver.v * ledgeCfg.halo.opacity;
        ref.haloSprite.visible = driver.v > 0.001;
      } else {
        ref.haloSprite.visible = false;
      }
    }

    const baseCfg = cfg.leds.baseLeds;
    if (ref.proxyMesh && layer >= 4 && baseCfg.enabled) {
      if (baseCfg.proxy.enabled) {
        (ref.proxyMesh.material as THREE.MeshBasicMaterial).opacity = driver.v;
        ref.proxyMesh.visible = driver.v > 0.001;
      } else {
        ref.proxyMesh.visible = false;
      }
    }
    if (ref.haloSprite && layer >= 4 && baseCfg.enabled) {
      if (baseCfg.halo.enabled) {
        (ref.haloSprite.material as THREE.SpriteMaterial).opacity =
          driver.v * baseCfg.halo.opacity;
        ref.haloSprite.visible = driver.v > 0.001;
      } else {
        ref.haloSprite.visible = false;
      }
    }
  }

  private buildLinearYoyo(
    driver: { v: number },
    write: () => void,
    halfPeriodS: number,
    startAtMax: boolean,
  ): gsap.core.Tween {
    driver.v = startAtMax ? 1 : 0;
    write();
    return gsap.to(driver, {
      v: startAtMax ? 0 : 1,
      duration: halfPeriodS,
      ease: 'none',
      yoyo: true,
      repeat: -1,
      onUpdate: write,
    });
  }

  private buildFlickerLoop(
    driver: { v: number },
    write: () => void,
  ): gsap.core.Timeline {
    const flickerTarget = { value: 0 };
    const tl = gsap.timeline({ repeat: -1 });
    tl.call(
      () => {
        if (Math.random() < FLICKER_TARGET_UPDATE_PROBABILITY) {
          flickerTarget.value = randomFlickerTarget();
        }
        driver.v = driver.v * (1 - FLICKER_LERP_ALPHA) + flickerTarget.value * FLICKER_LERP_ALPHA;
        write();
      },
      undefined,
      0,
    );
    tl.to({}, { duration: TICK_S });
    return tl;
  }

  setEffect(layer: number, light: number, effect: number): void {
    const ref = this.ledRefs.get(`${layer}:${light}`);
    if (!ref) return;

    ref.tween?.kill();
    ref.tween = null;

    const { driver } = ref;
    const sealKey = this.getSealKey(layer, light);
    const write = (): void => this.writeLed(ref, layer, sealKey);

    switch (effect) {
      case LIGHT_EFFECTS.on:
        driver.v = 1;
        write();
        break;
      case LIGHT_EFFECTS.breathe:
        ref.tween = this.buildLinearYoyo(driver, write, (BREATHE_PERIOD_TICKS / 2) * TICK_S, false);
        break;
      case LIGHT_EFFECTS.breatheFast:
        ref.tween = this.buildLinearYoyo(
          driver,
          write,
          (BREATHE_FAST_PERIOD_TICKS / 2) * TICK_S,
          false,
        );
        break;
      case LIGHT_EFFECTS.breathe50percent:
        // Firmware Effect_Breathe50: full 0..1 amplitude (NOT half), 1.9 s
        // period, starts at MAX. Used by sealReveal sound sync.
        ref.tween = this.buildLinearYoyo(
          driver,
          write,
          (BREATHE_50_PERIOD_TICKS / 2) * TICK_S,
          true,
        );
        break;
      case LIGHT_EFFECTS.flicker:
        ref.tween = this.buildFlickerLoop(driver, write);
        break;
      case LIGHT_EFFECTS.off:
      default:
        driver.v = 0;
        write();
        break;
    }
  }

  replayAll(state: TowerState): void {
    if (this.ledRefs.size === 0) return;
    for (let layer = 0; layer < TOWER_LAYER_COUNT; layer++) {
      for (let light = 0; light < LIGHTS_PER_LAYER; light++) {
        this.setEffect(layer, light, state.layer[layer].light[light].effect);
      }
    }
  }

  /**
   * Read the LED's current normalized brightness (0–1). Returns 0 for missing
   * refs so callers can iterate without null checks.
   */
  getLevel(layer: number, light: number): number {
    return this.ledRefs.get(`${layer}:${light}`)?.driver.v ?? 0;
  }

  /**
   * Direct level write — bypasses the Effect enum, for sequence animators
   * that drive raw 0–1 brightness on their own timeline. Cancels any tween
   * already attached to the LED.
   */
  setLevel(layer: number, light: number, level: number, durationS = 0): void {
    const ref = this.ledRefs.get(`${layer}:${light}`);
    if (!ref) return;
    ref.tween?.kill();
    ref.tween = null;

    const sealKey = this.getSealKey(layer, light);
    const write = (): void => this.writeLed(ref, layer, sealKey);

    if (durationS <= 0) {
      ref.driver.v = level;
      write();
      return;
    }
    ref.tween = gsap.to(ref.driver, { v: level, duration: durationS, onUpdate: write });
  }

  dispose(): void {
    for (const ref of this.ledRefs.values()) {
      ref.tween?.kill();
      ref.tween = null;
    }
  }
}
