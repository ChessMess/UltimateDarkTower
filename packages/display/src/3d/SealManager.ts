import * as THREE from 'three';
import type { SealIdentifier } from 'ultimatedarktower';
import type { ResolvedLightingConfig } from './types';
import { LIGHTS_PER_LAYER, RING_LEVEL_BY_LAYER_INDEX, SIDES, BLOOM_LAYER } from './constants';
import { computeSealLedPose, applyHdrColor } from './utils';

const SEAL_NAME_PREFIX = 'seal_';
const SEAL_SIDES = ['north', 'south', 'east', 'west'] as const;
const SEAL_LEVELS = ['top', 'middle', 'bottom'] as const;

function sealKey(side: string, level: string): string {
  return `${side}:${level}`;
}

export interface SealBacklightRef {
  /** Bright proxy mesh — the directly-visible "LED bulb" seen through cutouts. */
  proxyMesh: THREE.Mesh;
  /** Soft additive halo sprite around the proxy. */
  haloSprite: THREE.Sprite;
  sealNode: THREE.Object3D;
  driver: { v: number };
}

/**
 * Manages the 12 seal mesh nodes (4 sides × 3 ring levels) and their
 * corresponding inside-the-drum LED proxies (proxy mesh + halo sprite +
 * optional accent PointLight). Three.js depth testing naturally handles
 * glyph/chute alignment: the proxy is occluded by solid drum surfaces and
 * visible through real cutout holes — no manual alignment logic needed.
 *
 * All LED visuals are parented to the model root (not the seal node) so they
 * remain at fixed cardinal positions while drums rotate.
 */
export class SealManager {
  readonly sealNodes: Map<string, THREE.Object3D> = new Map();
  readonly sealBacklights: Map<string, SealBacklightRef> = new Map();

  private debugHelpers: THREE.Mesh[] = [];
  private gradientTexture: THREE.CanvasTexture | null = null;
  private sealListeners: Set<(broken: SealIdentifier[]) => void> = new Set();

  /**
   * Register a callback that fires after every `applySeals` call with the
   * broken-seals list. Returns an unsubscribe function. Used by external
   * integrations (e.g. physics colliders) that need to mirror seal state.
   */
  onSealsApplied(cb: (broken: SealIdentifier[]) => void): () => void {
    this.sealListeners.add(cb);
    return () => { this.sealListeners.delete(cb); };
  }

  /** @internal — exposed for tests; equals `sealListeners.size`. */
  get sealListenerCount(): number {
    return this.sealListeners.size;
  }

  /** Walk the loaded GLTF root and register every seal_<side>_<level> node. */
  buildSealNodes(root: THREE.Object3D): void {
    root.traverse((child) => {
      if (child.name.startsWith(SEAL_NAME_PREFIX)) {
        const rest = child.name.slice(SEAL_NAME_PREFIX.length);
        const underscore = rest.indexOf('_');
        if (underscore > 0) {
          const side = rest.slice(0, underscore);
          const level = rest.slice(underscore + 1);
          this.sealNodes.set(sealKey(side, level), child);
        }
      }
    });
  }

  /**
   * Create one proxy mesh + halo sprite (+ optional accent PointLight) per
   * registered seal node. All attached to `model` (root) — not to the seal
   * node — so they stay at fixed cardinal positions when drums rotate.
   * Must be called after `buildSealNodes`.
   */
  buildSealBacklights(
    model: THREE.Object3D,
    modelRadius: number,
    lighting: ResolvedLightingConfig,
  ): void {
    const cfg = lighting.leds.sealBacklights;
    const gradTex = this.getOrCreateGradientTexture();

    for (let layer = 0; layer < 3; layer++) {
      const level = RING_LEVEL_BY_LAYER_INDEX[layer];
      for (let lightIdx = 0; lightIdx < LIGHTS_PER_LAYER; lightIdx++) {
        const side = SIDES[lightIdx];
        const key = sealKey(side, level);
        const sealNode = this.sealNodes.get(key);
        if (!sealNode) continue;

        const pose = computeSealLedPose(layer, lightIdx, modelRadius, cfg.radiusFactor);
        const { x, y, z } = pose.position;

        // Proxy mesh — bright "LED bulb" visible through aligned cutout holes.
        // The color is pushed into HDR (× HDR_PROXY_SCALE) so that
        // `material.color × driver.v opacity` crosses the bloom threshold
        // (1.0) at peak driver values. `toneMapped: false` keeps the HDR
        // value intact through the render pipeline so the bloom selector
        // sees it.
        const proxyRadius = modelRadius * cfg.proxy.sizeFactor;
        const proxyGeo = new THREE.SphereGeometry(proxyRadius, 8, 6);
        const proxyMat = new THREE.MeshBasicMaterial({
          transparent: true,
          opacity: 0,
          depthWrite: false,
          toneMapped: false,
        });
        applyHdrColor(proxyMat.color, cfg.color);
        const proxyMesh = new THREE.Mesh(proxyGeo, proxyMat);
        proxyMesh.position.set(x, y, z);
        proxyMesh.layers.enable(BLOOM_LAYER);
        proxyMesh.renderOrder = 2;
        proxyMesh.castShadow = false;
        proxyMesh.receiveShadow = false;
        proxyMesh.visible = false;
        model.add(proxyMesh);

        // Halo sprite — soft additive glow, also depth-tested so it's occluded
        // by solid drum surfaces like the proxy. HDR-scaled for the same
        // reason as the proxy.
        const haloMat = new THREE.SpriteMaterial({
          map: gradTex,
          transparent: true,
          opacity: 0,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        });
        applyHdrColor(haloMat.color, cfg.color);
        const haloSprite = new THREE.Sprite(haloMat);
        const haloScale = modelRadius * cfg.halo.sizeFactor;
        haloSprite.scale.setScalar(haloScale);
        haloSprite.position.set(x, y, z);
        haloSprite.layers.enable(BLOOM_LAYER);
        haloSprite.renderOrder = 3;
        haloSprite.visible = false;
        model.add(haloSprite);

        // The HDR-bright proxy + halo (crossing the raised bloom threshold)
        // provide the seal's glow; there is no atmospheric accent PointLight.
        this.sealBacklights.set(key, {
          proxyMesh,
          haloSprite,
          sealNode,
          driver: { v: 0 },
        });
      }
    }
  }

  /**
   * Drive proxy + halo opacity from `driverV` (0–1). This is the single write
   * path — both the LedEffectAnimator (effect changes) and applySeals
   * (broken-list changes) call through here.
   */
  setSealLed(key: string, driverV: number, lighting: ResolvedLightingConfig): void {
    const ref = this.sealBacklights.get(key);
    if (!ref) return;
    const cfg = lighting.leds.sealBacklights;

    if (!cfg.enabled) {
      ref.proxyMesh.visible = false;
      ref.haloSprite.visible = false;
      return;
    }

    ref.driver.v = driverV;
    const on = driverV > 0.001;

    if (cfg.proxy.enabled) {
      (ref.proxyMesh.material as THREE.MeshBasicMaterial).opacity = driverV;
      ref.proxyMesh.visible = on;
    } else {
      ref.proxyMesh.visible = false;
    }

    if (cfg.halo.enabled) {
      (ref.haloSprite.material as THREE.SpriteMaterial).opacity = driverV * cfg.halo.opacity;
      ref.haloSprite.visible = on;
    } else {
      ref.haloSprite.visible = false;
    }
  }

  /**
   * Show/hide seal nodes according to the broken list. When a seal is broken, the
   * backlight is also updated: if `backlightWhenBroken` is false, the LED is forced
   * off; if true (default), the LED keeps its current driver state.
   */
  applySeals(brokenSeals: SealIdentifier[], lighting?: ResolvedLightingConfig): void {
    if (this.sealNodes.size === 0) {
      this.notifySealListeners(brokenSeals);
      return;
    }
    const broken = new Set(brokenSeals.map(s => sealKey(s.side, s.level)));
    for (const [key, node] of this.sealNodes) {
      const isBroken = broken.has(key);
      node.visible = !isBroken;
      if (isBroken && lighting) {
        const ref = this.sealBacklights.get(key);
        const keepOn = lighting.leds.sealBacklights.backlightWhenBroken;
        const driverV = keepOn ? (ref?.driver.v ?? 0) : 0;
        this.setSealLed(key, driverV, lighting);
      }
    }
    this.notifySealListeners(brokenSeals);
  }

  private notifySealListeners(brokenSeals: SealIdentifier[]): void {
    for (const cb of this.sealListeners) {
      try {
        cb(brokenSeals);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error('[SealManager] seal listener threw', err);
      }
    }
  }

  /** Reapply lighting config to all seal LED visuals. */
  updateLighting(lighting: ResolvedLightingConfig, modelRadius: number): void {
    const cfg = lighting.leds.sealBacklights;

    for (const [key, ref] of this.sealBacklights) {
      const pose = computeSealLedPose(
        this.layerFromKey(key),
        this.lightIndexFromKey(key),
        modelRadius,
        cfg.radiusFactor,
      );
      const { x, y, z } = pose.position;

      ref.proxyMesh.position.set(x, y, z);
      applyHdrColor((ref.proxyMesh.material as THREE.MeshBasicMaterial).color, cfg.color);
      const proxyRadius = modelRadius * cfg.proxy.sizeFactor;
      ref.proxyMesh.scale.setScalar(proxyRadius / (ref.proxyMesh.geometry as THREE.SphereGeometry).parameters.radius);

      ref.haloSprite.position.set(x, y, z);
      applyHdrColor((ref.haloSprite.material as THREE.SpriteMaterial).color, cfg.color);
      const haloScale = modelRadius * cfg.halo.sizeFactor;
      ref.haloSprite.scale.setScalar(haloScale);

      this.setSealLed(key, ref.driver.v, lighting);
    }
  }

  /** Emit a console warning for any expected seal nodes absent from the model. */
  warnOnMissing(): void {
    const missing: string[] = [];
    for (const side of SEAL_SIDES) {
      for (const level of SEAL_LEVELS) {
        if (!this.sealNodes.has(sealKey(side, level))) {
          missing.push(`${SEAL_NAME_PREFIX}${side}_${level}`);
        }
      }
    }
    if (missing.length === 0) return;
    // eslint-disable-next-line no-console
    console.warn(
      `[Tower3DView] ${missing.length} seal node(s) missing from the loaded model; ` +
      `applySeals will be a no-op for them. Missing: ${missing.join(', ')}. ` +
      `Found: ${Array.from(this.sealNodes.keys()).sort().join(', ') || '(none)'}.`,
    );
  }

  /**
   * Show/hide small yellow debug spheres at each proxy position.
   * Enabled by the `debug3D` flag so placement can be validated against the real GLB.
   */
  setDebug(enabled: boolean, parent: THREE.Object3D): void {
    this.disposeDebugHelpers();

    if (!enabled) return;

    const debugMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    for (const ref of this.sealBacklights.values()) {
      const geo = new THREE.SphereGeometry(
        (ref.proxyMesh.geometry as THREE.SphereGeometry).parameters.radius * 0.8,
        6, 4,
      );
      const mesh = new THREE.Mesh(geo, debugMat);
      mesh.position.copy(ref.proxyMesh.position);
      mesh.renderOrder = 10;
      parent.add(mesh);
      this.debugHelpers.push(mesh);
    }
  }

  /** Remove all LED visuals from their parents and clear both maps. */
  dispose(): void {
    for (const ref of this.sealBacklights.values()) {
      ref.proxyMesh.geometry.dispose();
      (ref.proxyMesh.material as THREE.Material).dispose();
      ref.proxyMesh.removeFromParent();
      (ref.haloSprite.material as THREE.Material).dispose();
      ref.haloSprite.removeFromParent();
    }
    this.sealBacklights.clear();
    this.sealNodes.clear();

    this.disposeDebugHelpers();

    this.gradientTexture?.dispose();
    this.gradientTexture = null;

    this.sealListeners.clear();
  }

  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Remove every debug helper mesh, disposing each geometry and every distinct
   * material once (all helpers share a single material, so dedup avoids
   * disposing it N times).
   */
  private disposeDebugHelpers(): void {
    const materials = new Set<THREE.Material>();
    for (const helper of this.debugHelpers) {
      helper.removeFromParent();
      helper.geometry.dispose();
      materials.add(helper.material as THREE.Material);
    }
    for (const mat of materials) mat.dispose();
    this.debugHelpers = [];
  }

  private getOrCreateGradientTexture(): THREE.CanvasTexture {
    if (this.gradientTexture) return this.gradientTexture;

    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const center = size / 2;
      const gradient = ctx.createRadialGradient(center, center, 0, center, center, center);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }

    this.gradientTexture = new THREE.CanvasTexture(canvas);
    return this.gradientTexture;
  }

  private layerFromKey(key: string): number {
    const level = key.split(':')[1] as 'top' | 'middle' | 'bottom';
    const idx = RING_LEVEL_BY_LAYER_INDEX.indexOf(level);
    return idx >= 0 ? idx : 0;
  }

  private lightIndexFromKey(key: string): number {
    const side = key.split(':')[0];
    const idx = SIDES.indexOf(side as typeof SIDES[number]);
    return idx >= 0 ? idx : 0;
  }
}
