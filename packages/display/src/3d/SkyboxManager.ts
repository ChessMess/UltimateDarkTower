import * as THREE from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

/**
 * Loads and manages the equirectangular skybox texture for the scene. Handles
 * LDR (PNG/JPG) and Radiance HDR (.hdr) formats and guards against stale async
 * loads when the URL changes before a previous load completes.
 */
export class SkyboxManager {
  private currentUrl = '';
  private texture: THREE.Texture | null = null;

  constructor(private readonly scene: THREE.Scene) {}

  /**
   * Load `url` as the scene background. Pass an empty string to clear the
   * skybox and restore a solid `bgColor`.
   */
  apply(url: string, bgColor: number): void {
    this.currentUrl = url;

    if (!url) {
      if (this.texture) {
        this.texture.dispose();
        this.texture = null;
      }
      this.scene.background = new THREE.Color(bgColor);
      return;
    }

    const onLoad = (tex: THREE.Texture): void => {
      // Discard if a newer apply() call superseded this one.
      if (this.currentUrl !== url) {
        tex.dispose();
        return;
      }
      tex.mapping = THREE.EquirectangularReflectionMapping;
      if (this.texture) this.texture.dispose();
      this.texture = tex;
      this.scene.background = tex;
    };

    const onError = (): void => {
      console.warn('[Tower3DView] Skybox load failed:', url);
    };

    if (/\.hdr$/i.test(url)) {
      new HDRLoader().load(url, onLoad, undefined, onError);
    } else {
      new THREE.TextureLoader().load(url, onLoad, undefined, onError);
    }
  }

  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
      this.texture = null;
    }
  }
}
