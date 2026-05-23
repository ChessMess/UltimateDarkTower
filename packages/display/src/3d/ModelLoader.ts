import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';

export interface ModelLoadResult {
  /** The centered GLTF scene root, ready to be added to the Three.js scene. */
  root: THREE.Group;
  /** Bounding-sphere radius of the loaded model. */
  modelRadius: number;
  /** Y coordinate of the model's bottom edge (world space, after centering). */
  modelBottomY: number;
  /** Y coordinate of the model's top edge (world space, after centering). */
  modelTopY: number;
}

/**
 * Load and centre a DRACO-compressed GLB model.
 *
 * The root is translated so its bounding-box centre sits at the world origin.
 * Shadow casting/receiving is enabled on every mesh in the hierarchy.
 *
 * @param url              URL of the `.glb` asset.
 * @param dracoDecoderPath URL prefix for the Draco WASM/JS decoder files.
 * @param onLoaded         Called with the processed result on success.
 * @param onError          Called with a structured error details object on failure.
 */
export function loadTowerModel(
  url: string,
  dracoDecoderPath: string,
  onLoaded: (result: ModelLoadResult) => void,
  onError: (details: Record<string, unknown>) => void,
): void {
  const loader = new GLTFLoader();
  const dracoLoader = new DRACOLoader();
  dracoLoader.setDecoderPath(dracoDecoderPath);
  loader.setDRACOLoader(dracoLoader);

  loader.load(
    url,
    (gltf) => {
      dracoLoader.dispose();

      const root = gltf.scene;

      // Centre the model on the world origin and measure its extents.
      const box = new THREE.Box3().setFromObject(root);
      const center = new THREE.Vector3();
      const size = new THREE.Vector3();
      box.getCenter(center);
      box.getSize(size);
      root.position.sub(center);

      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      const modelRadius = sphere.radius || 1;
      const modelBottomY = -size.y / 2;
      const modelTopY = size.y / 2;

      // Enable shadows on every mesh in the hierarchy.
      root.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });

      onLoaded({ root, modelRadius, modelBottomY, modelTopY });
    },
    undefined,
    (err) => {
      dracoLoader.dispose();
      onError(describeLoadError(url, dracoDecoderPath, err));
    },
  );
}

function describeLoadError(
  url: string,
  dracoDecoderPath: string,
  err: unknown,
): Record<string, unknown> {
  const details: Record<string, unknown> = {
    url,
    dracoDecoderPath,
    errorType: typeof err,
  };

  if (err instanceof Error) {
    details.name = err.name;
    details.message = err.message;
    if (err.stack) details.stack = err.stack;

    if (err.message.includes('KHR_draco_mesh_compression')) {
      details.hint =
        'Model requires Draco decoding; ensure decoder files are reachable from dracoDecoderPath.';
    }
  }

  if (err && typeof err === 'object') {
    const e = err as {
      type?: unknown;
      message?: unknown;
      target?: unknown;
      currentTarget?: unknown;
    };

    if (typeof e.type === 'string') details.eventType = e.type;
    if (typeof e.message === 'string') details.eventMessage = e.message;

    const target = e.target ?? e.currentTarget;
    if (target && typeof target === 'object') {
      const xhr = target as {
        status?: unknown;
        statusText?: unknown;
        responseURL?: unknown;
        readyState?: unknown;
      };

      if (typeof xhr.status === 'number') details.httpStatus = xhr.status;
      if (typeof xhr.statusText === 'string') details.httpStatusText = xhr.statusText;
      if (typeof xhr.responseURL === 'string') details.responseURL = xhr.responseURL;
      if (typeof xhr.readyState === 'number') details.readyState = xhr.readyState;
    }
  }

  return details;
}
