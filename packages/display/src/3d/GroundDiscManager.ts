import * as THREE from 'three';
import type { ResolvedLightingConfig } from './types';
import { buildBoardTexture } from './GameBoardTexture';
import { buildBoardTextureFromImage, getBoardTextureRotation } from './GameBoardImageTexture';

/**
 * Manages the noir shadow-catching ground disc and the optional game board
 * texture that sits on top of it. The board texture can be either the real
 * board art (`board.png`) or the procedural canvas fallback, selected via
 * `lighting.boardDisc.source`. Owns the Three.js Mesh and textures so their
 * lifecycle is isolated from Tower3DView.
 */
export class GroundDiscManager {
  private disc: THREE.Mesh | null = null;
  private proceduralTexture: THREE.CanvasTexture | null = null;
  private imageTexture: THREE.Texture | null = null;
  private imageLoad: Promise<THREE.Texture | null> | null = null;
  private imageLoadFailed = false;
  private readonly maxAnisotropy: number;

  constructor(
    private readonly scene: THREE.Scene,
    maxAnisotropy = 1,
  ) {
    this.maxAnisotropy = maxAnisotropy;
  }

  /**
   * Create the disc and add it to the scene. Idempotent — subsequent calls
   * are ignored if the disc already exists. Must be called after the model
   * is loaded so that modelRadius and modelBottomY are accurate.
   */
  build(
    modelRadius: number,
    modelBottomY: number,
    lighting: ResolvedLightingConfig,
  ): void {
    if (this.disc) return;

    const { roughness, metalness, radiusFactor } = lighting.groundDisc;
    const { thicknessFactor, edgeColor, bottomCap } = lighting.boardDisc;
    const h = Math.max(modelRadius * thicknessFactor, 1e-4);
    const geom = new THREE.CylinderGeometry(modelRadius * radiusFactor, modelRadius * radiusFactor, h, 64);

    const boardTex = lighting.boardDisc.enabled
      ? this.ensureBoardTexture(lighting)
      : null;

    const emissive = new THREE.Color(0xffe8c8);
    const emissiveIntensity = lighting.groundDisc.undersideLightIntensity;

    // CylinderGeometry material groups: 0 = side wall, 1 = top cap, 2 = bottom cap
    const sideMat = new THREE.MeshStandardMaterial({
      color: edgeColor,
      roughness: 0.85,
      metalness: 0,
      emissive,
      emissiveIntensity,
    });
    const topMat = boardTex
      ? new THREE.MeshStandardMaterial({
        map: boardTex,
        color: new THREE.Color().setScalar(lighting.boardDisc.brightness),
        roughness: 0.95,
        metalness: 0,
        opacity: lighting.boardDisc.opacity,
        transparent: lighting.boardDisc.opacity < 1,
      })
      : new THREE.MeshStandardMaterial({
        color: lighting.groundDisc.color,
        roughness,
        metalness,
      });
    const bottomMat = new THREE.MeshStandardMaterial({
      color: edgeColor,
      roughness: 0.85,
      metalness: 0,
      emissive,
      emissiveIntensity,
      opacity: bottomCap ? 1 : 0,
      transparent: !bottomCap,
      depthWrite: bottomCap,
    });

    const mesh = new THREE.Mesh(geom, [sideMat, topMat, bottomMat]);
    mesh.position.y = modelBottomY - modelRadius * 0.002 - h / 2;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    this.disc = mesh;
  }

  /** Toggle disc visibility, building it lazily if it does not yet exist. */
  setVisible(
    visible: boolean,
    modelRadius: number,
    modelBottomY: number,
    lighting: ResolvedLightingConfig,
  ): void {
    if (visible && !this.disc) {
      this.build(modelRadius, modelBottomY, lighting);
    }
    if (this.disc) this.disc.visible = visible;
  }

  /** Toggle the board texture on the disc. */
  setBoardDiscEnabled(
    enabled: boolean,
    lighting: ResolvedLightingConfig,
  ): void {
    if (!this.disc) return;
    const mats = this.disc.material as THREE.MeshStandardMaterial[];
    const topMat = mats[1];

    if (enabled) {
      const tex = this.ensureBoardTexture(lighting);
      if (tex) {
        this.applyBoardMaterial(topMat, tex, lighting);
      }
    } else {
      topMat.map = null;
      topMat.color.setHex(lighting.groundDisc.color);
      topMat.roughness = lighting.groundDisc.roughness;
      topMat.metalness = lighting.groundDisc.metalness;
      topMat.opacity = 1;
      topMat.transparent = false;
      topMat.needsUpdate = true;
    }
  }

  /** Reapply the full lighting config to the disc material and geometry. */
  updateLighting(
    lighting: ResolvedLightingConfig,
    modelRadius: number,
    modelBottomY: number,
  ): void {
    if (!this.disc) return;
    const mats = this.disc.material as THREE.MeshStandardMaterial[];
    const [sideMat, topMat, bottomMat] = mats;
    const { thicknessFactor, edgeColor, bottomCap } = lighting.boardDisc;

    // Update top cap (board surface)
    if (lighting.boardDisc.enabled) {
      const tex = this.ensureBoardTexture(lighting);
      if (tex) this.applyBoardMaterial(topMat, tex, lighting);
    } else {
      topMat.map = null;
      topMat.color.setHex(lighting.groundDisc.color);
      topMat.roughness = lighting.groundDisc.roughness;
      topMat.metalness = lighting.groundDisc.metalness;
      topMat.opacity = 1;
      topMat.transparent = false;
      topMat.needsUpdate = true;
    }

    // Update side wall and bottom cap colors/transparency/emissive
    const emissiveIntensity = lighting.groundDisc.undersideLightIntensity;
    sideMat.color.setHex(edgeColor);
    sideMat.emissiveIntensity = emissiveIntensity;
    sideMat.needsUpdate = true;
    bottomMat.color.setHex(edgeColor);
    bottomMat.emissiveIntensity = emissiveIntensity;
    bottomMat.opacity = bottomCap ? 1 : 0;
    bottomMat.transparent = !bottomCap;
    bottomMat.depthWrite = bottomCap;
    bottomMat.needsUpdate = true;

    const h = Math.max(modelRadius * thicknessFactor, 1e-4);
    this.disc.geometry.dispose();
    this.disc.geometry = new THREE.CylinderGeometry(
      modelRadius * lighting.groundDisc.radiusFactor,
      modelRadius * lighting.groundDisc.radiusFactor,
      h,
      64,
    );
    this.disc.position.y = modelBottomY - modelRadius * 0.002 - h / 2;

  }

  dispose(): void {
    if (this.disc) {
      this.disc.geometry?.dispose();
      const mat = this.disc.material;
      if (Array.isArray(mat)) {
        for (const m of mat) m.dispose();
      } else {
        mat?.dispose();
      }
      this.disc.removeFromParent();
      this.disc = null;
    }
    if (this.proceduralTexture) {
      this.proceduralTexture.dispose();
      this.proceduralTexture = null;
    }
    if (this.imageTexture) {
      this.imageTexture.dispose();
      this.imageTexture = null;
    }
    this.imageLoad = null;
  }

  /**
   * Pick the correct cached texture for the current `boardDisc.source`.
   * For `'image'`: returns the loaded image if ready, otherwise kicks off the
   * async load and returns the procedural texture as a temporary stand-in. When
   * the image resolves, the material's map is swapped live.
   * For `'procedural'`: always returns the procedural canvas texture.
   */
  private ensureBoardTexture(
    lighting: ResolvedLightingConfig,
  ): THREE.Texture | null {
    const source = lighting.boardDisc.source;

    if (source === 'image' && !this.imageLoadFailed) {
      if (this.imageTexture) {
        this.imageTexture.rotation = getBoardTextureRotation(lighting.boardDisc.northKingdom);
        return this.imageTexture;
      }
      this.startImageLoad(lighting);
      return this.ensureProceduralTexture();
    }

    return this.ensureProceduralTexture();
  }

  private ensureProceduralTexture(): THREE.CanvasTexture | null {
    if (!this.proceduralTexture) this.proceduralTexture = buildBoardTexture();
    return this.proceduralTexture;
  }

  private startImageLoad(lighting: ResolvedLightingConfig): void {
    if (this.imageLoad) return;
    this.imageLoad = buildBoardTextureFromImage(
      this.maxAnisotropy,
      lighting.boardDisc.northKingdom,
    ).then((tex) => {
      if (!tex) {
        this.imageLoadFailed = true;
        return null;
      }
      this.imageTexture = tex;
      this.swapMaterialMap(tex, lighting);
      return tex;
    });
  }

  private swapMaterialMap(
    tex: THREE.Texture,
    lighting: ResolvedLightingConfig,
  ): void {
    if (!this.disc) return;
    if (!lighting.boardDisc.enabled) return;
    if (lighting.boardDisc.source !== 'image') return;
    const mats = this.disc.material as THREE.MeshStandardMaterial[];
    this.applyBoardMaterial(mats[1], tex, lighting);
  }

  private applyBoardMaterial(
    mat: THREE.MeshStandardMaterial,
    tex: THREE.Texture,
    lighting: ResolvedLightingConfig,
  ): void {
    mat.map = tex;
    mat.color.setScalar(lighting.boardDisc.brightness);
    mat.roughness = 0.95;
    mat.metalness = 0;
    mat.opacity = lighting.boardDisc.opacity;
    mat.transparent = lighting.boardDisc.opacity < 1;
    mat.needsUpdate = true;
  }
}
