import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Where to fetch the Draco decoder WASM/JS from. Matches the default used
 * by the tower model loader (`src/3d/ModelLoader.ts`) so consumers don't
 * need to host the decoder twice. Override via `loadSkullModel(url, { ..., dracoDecoderPath })`.
 */
const DEFAULT_DRACO_DECODER_PATH = 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/';

/**
 * A loaded, normalized skull model ready to be cloned per spawn.
 *
 * The template is pre-centered on its bounding-sphere center and scaled so
 * that the sphere radius equals 1 — `SkullSpawner.cloneSkullMesh` then
 * applies the per-spawn `scale.setScalar(radius)` so a single template
 * works across any `skull.radiusFactor`.
 */
export interface SkullTemplate {
  /** Pre-centered, unit-bounding-sphere-scaled `Object3D` cloned per spawn. */
  template: THREE.Object3D;
  /** Convex-hull point cloud in unit-sphere coordinates; ~150–300 points. */
  hullPoints: Float32Array;
  /**
   * Density that approximately normalizes hull-skull mass to a unit-radius
   * sphere with default Rapier density (1.0). Used when `colliderShape` is
   * `'hull'`. Consumer can override via `skull.density`.
   */
  density: number;
}

/**
 * Module-level cache so attach/detach cycles, 2D⇄3D toggles, and concurrent
 * loads of the same URL share a single `Promise<SkullTemplate>`. Cleared
 * only by `clearSkullModelCache()` (intended for tests).
 */
const cache = new Map<string, Promise<SkullTemplate>>();

/** Default material applied to the loaded mesh — matches the sphere look. */
const DEFAULT_MATERIAL_PROPS = {
  color: 0xeeeeee,
  roughness: 0.6,
  metalness: 0.1,
};

/**
 * Load a `.glb` (preferred) or `.stl` skull model from `url` and return a
 * normalized template. Idempotent across concurrent and repeated calls.
 *
 * Loads run to completion even if the caller aborts — the cached promise
 * remains useful for subsequent callers. Only the caller's local promise
 * rejects on abort.
 */
export interface LoadSkullModelOptions {
  signal?: AbortSignal;
  /**
   * Where to fetch the Draco decoder from. Defaults to the same gstatic
   * URL used by the tower model loader. Pass `null` to disable Draco entirely
   * (e.g. when shipping uncompressed GLBs).
   */
  dracoDecoderPath?: string | null;
}

export function loadSkullModel(
  url: string,
  signalOrOptions?: AbortSignal | LoadSkullModelOptions,
): Promise<SkullTemplate> {
  const opts: LoadSkullModelOptions =
    signalOrOptions instanceof AbortSignal ? { signal: signalOrOptions } : (signalOrOptions ?? {});
  const signal = opts.signal;
  const dracoDecoderPath =
    opts.dracoDecoderPath === undefined ? DEFAULT_DRACO_DECODER_PATH : opts.dracoDecoderPath;

  const cached = cache.get(url);
  const load = cached ?? loadAndNormalize(url, dracoDecoderPath);
  if (!cached) cache.set(url, load);

  if (!signal) return load;

  return new Promise<SkullTemplate>((resolve, reject) => {
    const onAbort = (): void => {
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (signal.aborted) {
      onAbort();
      return;
    }
    signal.addEventListener('abort', onAbort, { once: true });
    load.then(
      (t) => {
        signal.removeEventListener('abort', onAbort);
        resolve(t);
      },
      (err) => {
        signal.removeEventListener('abort', onAbort);
        reject(err);
      },
    );
  });
}

/** Clear the URL→template cache. For tests only. */
export function clearSkullModelCache(): void {
  cache.clear();
}

async function loadAndNormalize(
  url: string,
  dracoDecoderPath: string | null,
): Promise<SkullTemplate> {
  const lower = url.toLowerCase();
  let geometry: THREE.BufferGeometry;

  if (lower.endsWith('.stl')) {
    // eslint-disable-next-line no-console
    console.warn(
      `[ultimatedarktowerdisplay/physics] loading STL directly (${url}). ` +
        'STLs are heavy and unindexed — re-export to a Draco-compressed .glb ' +
        '(Blender: File → Export → glTF 2.0, enable Geometry Compression) ' +
        'for a 10×+ smaller download.',
    );
    const { STLLoader } = await import('three/examples/jsm/loaders/STLLoader.js');
    geometry = await loadWithLoader(new STLLoader(), url);
  } else {
    const gltfLoader = new GLTFLoader();
    let dracoLoader: DRACOLoader | null = null;
    if (dracoDecoderPath !== null) {
      dracoLoader = new DRACOLoader();
      dracoLoader.setDecoderPath(dracoDecoderPath);
      gltfLoader.setDRACOLoader(dracoLoader);
    }
    try {
      const gltf = await loadWithLoader(gltfLoader, url);
      geometry = extractFirstMeshGeometry(gltf as { scene: THREE.Object3D });
    } finally {
      dracoLoader?.dispose();
    }
  }

  const normalized = normalizeGeometry(geometry);
  const material = new THREE.MeshStandardMaterial(DEFAULT_MATERIAL_PROPS);
  const mesh = new THREE.Mesh(normalized, material);
  mesh.castShadow = true;

  const hullPoints = await loadHullPoints(url, normalized);
  const density = approximateDensity(normalized);

  return { template: mesh, hullPoints, density };
}

interface ThreeLoader<R> {
  load(
    url: string,
    onLoad: (result: R) => void,
    onProgress: ((event: ProgressEvent) => void) | undefined,
    onError: (err: unknown) => void,
  ): void;
}

function loadWithLoader<R>(loader: ThreeLoader<R>, url: string): Promise<R> {
  return new Promise<R>((resolve, reject) => {
    loader.load(url, resolve, undefined, (err) => reject(err));
  });
}

function extractFirstMeshGeometry(gltf: { scene: THREE.Object3D }): THREE.BufferGeometry {
  let found: THREE.BufferGeometry | null = null;
  gltf.scene.traverse((obj) => {
    if (found) return;
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) found = mesh.geometry;
  });
  if (!found) {
    throw new Error('[ultimatedarktowerdisplay/physics] GLB contains no mesh geometry');
  }
  return found;
}

function normalizeGeometry(input: THREE.BufferGeometry): THREE.BufferGeometry {
  // mergeVertices dedupes co-located corners and is a no-op when already deduped.
  // Some authoring tools emit triangle soup with thousands of duplicate verts.
  const merged = BufferGeometryUtils.mergeVertices(input, 1e-5);
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  const sphere = merged.boundingSphere;
  if (!sphere || sphere.radius <= 0) {
    throw new Error('[ultimatedarktowerdisplay/physics] skull mesh has invalid bounds');
  }
  // Center on bounding-sphere center so the visual origin matches the ball
  // collider's reference frame; scale uniformly so the radius is 1 (the
  // spawner multiplies by the per-spawn radius).
  merged.translate(-sphere.center.x, -sphere.center.y, -sphere.center.z);
  const s = 1 / sphere.radius;
  merged.scale(s, s, s);
  merged.computeBoundingSphere();
  return merged;
}

/**
 * Look for a `<basename>.hull.json` sidecar emitted by the preprocess
 * script. Falls back to a stride-sampled position attribute when the
 * sidecar is missing (404). Always returns a fresh `Float32Array`.
 */
async function loadHullPoints(
  modelUrl: string,
  geometry: THREE.BufferGeometry,
): Promise<Float32Array> {
  const sidecarUrl = modelUrl.replace(/\.(glb|stl)$/i, '.hull.json');
  try {
    const res = await fetch(sidecarUrl);
    if (res.ok) {
      const body = (await res.json()) as { hullPoints?: number[] };
      if (Array.isArray(body.hullPoints) && body.hullPoints.length >= 12) {
        return new Float32Array(body.hullPoints);
      }
    }
  } catch {
    // fall through to derived hull points
  }
  return derivedHullPoints(geometry);
}

function derivedHullPoints(geometry: THREE.BufferGeometry): Float32Array {
  const pos = geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
  if (!pos) return new Float32Array();
  const vertexCount = pos.count;
  const targetCount = Math.min(vertexCount, 300);
  const stride = Math.max(1, Math.floor(vertexCount / targetCount));
  const sampled = new Float32Array(targetCount * 3);
  for (let i = 0, j = 0; j < targetCount && i < vertexCount; i += stride, j++) {
    sampled[j * 3] = pos.getX(i);
    sampled[j * 3 + 1] = pos.getY(i);
    sampled[j * 3 + 2] = pos.getZ(i);
  }
  return sampled;
}

/**
 * Heuristic density that brings hull mass into the same ballpark as a unit
 * sphere with default Rapier density (1.0). Uses bounding-box volume × 0.55
 * as a stand-in for hull volume — true hull volume would require a
 * tetrahedralization pass we don't ship in the lib. Consumers can override
 * via `skull.density` for precise tuning.
 */
function approximateDensity(geometry: THREE.BufferGeometry): number {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box) return 1;
  const size = new THREE.Vector3();
  box.getSize(size);
  const boxVolume = size.x * size.y * size.z;
  const hullVolume = boxVolume * 0.55;
  // Unit-sphere volume = (4/3)·π ≈ 4.19. Density of 1.0 there gives mass ≈ 4.19.
  // We want hull mass to land near 4.19 — so density ≈ 4.19 / hullVolume.
  const SPHERE_VOLUME = (4 / 3) * Math.PI;
  if (hullVolume <= 0) return 1;
  return SPHERE_VOLUME / hullVolume;
}
