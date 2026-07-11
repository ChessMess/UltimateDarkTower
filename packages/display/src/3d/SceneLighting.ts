import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import gsap from 'gsap';
import type { ResolvedLightingConfig } from './types';

let rectAreaInited = false;
function ensureRectAreaLightUniforms(): void {
  if (rectAreaInited) return;
  if (typeof window === 'undefined' || !('WebGL2RenderingContext' in window)) return;
  RectAreaLightUniformsLib.init();
  rectAreaInited = true;
}

export type SceneLightsPartial = {
  hemi?: number;
  key?: number;
  fill?: number;
  fillY?: number;
  exposure?: number;
  keyX?: number;
  keyY?: number;
  keyZ?: number;
};

export class SceneLighting {
  readonly hemi: THREE.HemisphereLight;
  readonly key: THREE.DirectionalLight;
  readonly fill: THREE.RectAreaLight;
  private breatheTween: gsap.core.Tween | null = null;

  constructor(
    private readonly scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    private readonly renderer: THREE.WebGLRenderer,
    config: ResolvedLightingConfig,
  ) {
    this.hemi = new THREE.HemisphereLight(
      config.scene.hemisphere.color,
      config.scene.hemisphere.ground,
      config.scene.hemisphere.intensity,
    );
    scene.add(this.hemi);

    this.key = new THREE.DirectionalLight(config.scene.key.color, config.scene.key.intensity);
    this.key.position.set(...config.scene.key.position);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(config.scene.key.shadow.mapSize, config.scene.key.shadow.mapSize);
    this.key.shadow.bias = config.scene.key.shadow.bias;
    this.key.shadow.normalBias = config.scene.key.shadow.normalBias;
    // Placeholder frustum — retargetShadows() replaces these after model loads.
    this.key.shadow.camera.left = -2;
    this.key.shadow.camera.right = 2;
    this.key.shadow.camera.top = 2;
    this.key.shadow.camera.bottom = -2;
    this.key.shadow.camera.near = 0.1;
    this.key.shadow.camera.far = 20;
    const keyTarget = new THREE.Object3D();
    keyTarget.position.set(0, 0, -10);
    camera.add(keyTarget);
    this.key.target = keyTarget;
    camera.add(this.key);

    ensureRectAreaLightUniforms();
    this.fill = new THREE.RectAreaLight(
      config.scene.fill.color,
      config.scene.fill.intensity,
      config.scene.fill.width,
      config.scene.fill.height,
    );
    this.fill.position.set(...config.scene.fill.position);
    camera.add(this.fill);
    this.fill.lookAt(0, 0, 0);
  }

  applyLights(config: ResolvedLightingConfig, modelRadius: number): void {
    this.hemi.color.setHex(config.scene.hemisphere.color);
    this.hemi.groundColor.setHex(config.scene.hemisphere.ground);
    this.hemi.intensity = config.scene.hemisphere.intensity;

    this.key.color.setHex(config.scene.key.color);
    this.key.intensity = config.scene.key.intensity;
    this.key.position.set(...config.scene.key.position);
    this.key.shadow.mapSize.set(config.scene.key.shadow.mapSize, config.scene.key.shadow.mapSize);
    this.key.shadow.bias = config.scene.key.shadow.bias;
    this.key.shadow.normalBias = config.scene.key.shadow.normalBias;
    this.retargetShadows(config, modelRadius);

    this.fill.color.setHex(config.scene.fill.color);
    this.fill.intensity = config.scene.fill.intensity;
    this.fill.width = config.scene.fill.width;
    this.fill.height = config.scene.fill.height;
    this.fill.position.set(...config.scene.fill.position);
    this.fill.lookAt(0, 0, 0);

    this.renderer.toneMappingExposure = config.scene.exposure;
  }

  /**
   * Per-frame update. The fill light is parented to the camera, so it must
   * re-aim at world origin every frame as the camera orbits.
   */
  tick(): void {
    this.fill.lookAt(0, 0, 0);
  }

  /** Mutate the live scene from a partial set of light values. */
  applyPartial(opts: SceneLightsPartial, lighting: ResolvedLightingConfig): void {
    if (opts.hemi !== undefined) this.hemi.intensity = opts.hemi;
    if (opts.key !== undefined) {
      this.key.intensity = opts.key;
      if (this.isBreathing) this.startBreathing(opts.key, lighting);
    }
    if (opts.fill !== undefined) this.fill.intensity = opts.fill;
    if (opts.fillY !== undefined) this.fill.position.y = opts.fillY;
    if (opts.exposure !== undefined) this.renderer.toneMappingExposure = opts.exposure;
    if (opts.keyX !== undefined) this.key.position.x = opts.keyX;
    if (opts.keyY !== undefined) this.key.position.y = opts.keyY;
    if (opts.keyZ !== undefined) this.key.position.z = opts.keyZ;
  }

  startBreathing(keyTarget: number, config: ResolvedLightingConfig): void {
    this.breatheTween?.kill();
    const { peakFactor, durationS } = config.animation.idleBreathe;
    this.breatheTween = gsap.to(this.key, {
      intensity: keyTarget * peakFactor,
      duration: durationS,
      yoyo: true,
      repeat: -1,
      ease: 'sine.inOut',
    });
  }

  stopBreathing(): void {
    this.breatheTween?.kill();
    this.breatheTween = null;
  }

  get isBreathing(): boolean {
    return this.breatheTween !== null;
  }

  dispose(): void {
    this.breatheTween?.kill();
    this.breatheTween = null;
  }

  private retargetShadows(config: ResolvedLightingConfig, modelRadius: number): void {
    const { frustumRadiusFactor, farFactor } = config.scene.key.shadow;
    const cam = this.key.shadow.camera;
    const half = modelRadius * frustumRadiusFactor;
    cam.left = -half;
    cam.right = half;
    cam.top = half;
    cam.bottom = -half;
    cam.near = 0.1;
    cam.far = modelRadius * farFactor;
    cam.updateProjectionMatrix();
  }
}
