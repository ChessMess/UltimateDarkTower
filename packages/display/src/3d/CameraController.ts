import * as THREE from 'three';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import type { TowerSide } from '../types';
import type { CameraConfig, ApplyCameraConfigOptions } from './types';
import { SIDE_AZIMUTH } from './constants';
import { polarToXZ } from './utils';
import { SideButtons } from '../shared/SideButtons';

interface CameraState {
  position: THREE.Vector3;
  target: THREE.Vector3;
}

const SIDE_SNAP_DURATION_S = 0.4;
const SIDE_SNAP_ZOOM_DIP = 0.08;
const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export class CameraController {
  private defaultCamera: CameraState | null = null;
  private currentSide: TowerSide | null = null;
  private activeTween: gsap.core.Animation | null = null;
  private modelRadius = 1;
  private elevationFactor: number;
  private targetHeightFactor: number;
  private distanceFactor: number;
  private zoomToCursor: boolean;
  private preserveViewOnSideSelect: boolean;
  private wheelCleanup: (() => void) | null = null;

  /** Fired when the active side changes, whether via an explicit snap or orbit detection. */
  onSideChange?: (side: TowerSide) => void;

  constructor(
    private readonly camera: THREE.PerspectiveCamera,
    private readonly controls: OrbitControls,
    private readonly sideButtons: SideButtons,
    config: CameraConfig = {},
  ) {
    this.elevationFactor = config.elevationFactor ?? -0.5;
    this.targetHeightFactor = config.targetHeightFactor ?? -0.15;
    this.distanceFactor = config.distanceFactor ?? 1;
    this.zoomToCursor = config.zoomToCursor ?? true;
    this.preserveViewOnSideSelect = config.preserveViewOnSideSelect ?? false;
  }

  fitToModel(
    modelRadius: number,
    debugLog?: (label: string, data: Record<string, unknown>) => void,
  ): void {
    this.modelRadius = modelRadius;
    const distance = this.fitBaseDistance() * this.distanceFactor;
    const targetY = modelRadius * this.targetHeightFactor;

    const minFar = 1000;
    const maxFar = 50000;
    const recommendedFar = Math.max(minFar, distance + modelRadius * 3);
    this.camera.far = Math.min(maxFar, recommendedFar);
    this.camera.updateProjectionMatrix();

    this.camera.position.set(0, modelRadius * this.elevationFactor, distance);
    this.controls.target.set(0, targetY, 0);
    this.camera.lookAt(0, targetY, 0);
    this.controls.update();

    debugLog?.('fitToView', {
      radius: modelRadius,
      distance,
      elevationFactor: this.elevationFactor,
      targetHeightFactor: this.targetHeightFactor,
      distanceFactor: this.distanceFactor,
      cameraPosition: this.camera.position.toArray(),
      target: this.controls.target.toArray(),
      near: this.camera.near,
      far: this.camera.far,
    });

    this.defaultCamera = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };

    this.currentSide = 'north';
    this.updateSideButtons();
  }

  getCurrentSide(): TowerSide | null {
    return this.currentSide;
  }

  snapToSide(side: TowerSide): void {
    this.currentSide = side;
    this.updateSideButtons();
    if (!this.defaultCamera) return; // tween deferred; currentSide updated for re-entry guard

    const sourceState: CameraState = {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };

    const cameraState = this.getSnapSourceCameraState();
    const dx = cameraState.position.x - cameraState.target.x;
    const dy = cameraState.position.y - cameraState.target.y;
    const dz = cameraState.position.z - cameraState.target.z;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const azimuth = SIDE_AZIMUTH[side];
    const vertical = dy;
    const horiz = Math.sqrt(Math.max(0, distance * distance - vertical * vertical));
    const xz = polarToXZ(azimuth, horiz);

    this.tweenCameraAlongOrbit(sourceState, {
      position: new THREE.Vector3(
        cameraState.target.x + xz.x,
        cameraState.target.y + vertical,
        cameraState.target.z + xz.z,
      ),
      target: cameraState.target.clone(),
    });
  }

  resetView(): void {
    if (!this.defaultCamera) return;

    this.currentSide = 'north';
    this.updateSideButtons();

    const p = this.defaultCamera.position;
    const t = this.defaultCamera.target;
    this.tweenCameraTo({ x: p.x, y: p.y, z: p.z }, { x: t.x, y: t.y, z: t.z });
  }

  /**
   * Re-center the tower in the frame while preserving the current orbit angle,
   * elevation, and zoom distance. Moves the orbit target back onto the tower
   * axis (the default framing point) and translates the camera by the same
   * delta, so the camera-to-target offset — and therefore the framing — is
   * unchanged; only the off-center pan is removed. Unlike {@link resetView},
   * this keeps the viewpoint the user has orbited/zoomed to (and the active
   * side, since the azimuth is preserved).
   */
  centerView(): void {
    if (!this.defaultCamera) return;

    const targetY = this.modelRadius * this.targetHeightFactor;
    // Preserve the camera-to-target offset (angle + zoom); only recenter the target.
    const offsetX = this.camera.position.x - this.controls.target.x;
    const offsetY = this.camera.position.y - this.controls.target.y;
    const offsetZ = this.camera.position.z - this.controls.target.z;

    this.tweenCameraTo(
      { x: offsetX, y: targetY + offsetY, z: offsetZ },
      { x: 0, y: targetY, z: 0 },
    );
  }

  getCameraConfig(): Required<CameraConfig> {
    return {
      elevationFactor: this.elevationFactor,
      targetHeightFactor: this.targetHeightFactor,
      distanceFactor: this.distanceFactor,
      zoomToCursor: this.zoomToCursor,
      preserveViewOnSideSelect: this.preserveViewOnSideSelect,
    };
  }

  /**
   * Express the current *live* camera framing as the three preset factors
   * (eye height, target height, distance multiplier). Reading these back after
   * a hand orbit/zoom lets a developer tune by eye, then paste the numbers into
   * a `CameraConfig`. Azimuth is dropped — re-applying these factors snaps the
   * camera back to the north face at the same height/distance framing, which is
   * exactly the board-facing preset semantics.
   */
  getLiveCameraFactors(): Pick<
    Required<CameraConfig>,
    'elevationFactor' | 'targetHeightFactor' | 'distanceFactor'
  > {
    const base = this.fitBaseDistance();
    const dx = this.camera.position.x - this.controls.target.x;
    const dz = this.camera.position.z - this.controls.target.z;
    const horizontalDist = Math.sqrt(dx * dx + dz * dz);
    return {
      elevationFactor: this.camera.position.y / this.modelRadius,
      targetHeightFactor: this.controls.target.y / this.modelRadius,
      distanceFactor: base > 0 ? horizontalDist / base : 1,
    };
  }

  applyCameraConfig(config: CameraConfig, options: ApplyCameraConfigOptions = {}): void {
    if (config.elevationFactor !== undefined) this.elevationFactor = config.elevationFactor;
    if (config.targetHeightFactor !== undefined)
      this.targetHeightFactor = config.targetHeightFactor;
    if (config.distanceFactor !== undefined) this.distanceFactor = config.distanceFactor;
    if (config.zoomToCursor !== undefined) this.setZoomToCursor(config.zoomToCursor);
    if (config.preserveViewOnSideSelect !== undefined) {
      this.setPreserveViewOnSideSelect(config.preserveViewOnSideSelect);
    }
    if (!this.defaultCamera) return;
    if (options.preserveView) {
      this.reframePreservingView(config);
    } else {
      this.fitToModel(this.modelRadius);
    }
  }

  /**
   * Re-apply the framing factors to the *current* live view instead of the
   * north fit: keep the current azimuth and pan, change only the dimension(s)
   * present in `config`, and leave the others at their live values. This lets a
   * tuning slider update one factor without snapping the camera back to north.
   * The stored north fit (used by {@link resetView} and non-preserving side
   * snaps) is refreshed to the new factors without moving the live camera.
   */
  private reframePreservingView(config: CameraConfig): void {
    const dx = this.camera.position.x - this.controls.target.x;
    const dz = this.camera.position.z - this.controls.target.z;
    const azimuth = Math.atan2(dx, dz);
    const currentHoriz = Math.sqrt(dx * dx + dz * dz);

    const horiz =
      config.distanceFactor !== undefined
        ? this.fitBaseDistance() * this.distanceFactor
        : currentHoriz;
    const cameraY =
      config.elevationFactor !== undefined
        ? this.modelRadius * this.elevationFactor
        : this.camera.position.y;
    const targetY =
      config.targetHeightFactor !== undefined
        ? this.modelRadius * this.targetHeightFactor
        : this.controls.target.y;

    const xz = polarToXZ(azimuth, horiz);
    this.controls.target.set(this.controls.target.x, targetY, this.controls.target.z);
    this.camera.position.set(this.controls.target.x + xz.x, cameraY, this.controls.target.z + xz.z);
    this.camera.lookAt(this.controls.target);
    this.controls.update();

    this.defaultCamera = {
      position: new THREE.Vector3(
        0,
        this.modelRadius * this.elevationFactor,
        this.fitBaseDistance() * this.distanceFactor,
      ),
      target: new THREE.Vector3(0, this.modelRadius * this.targetHeightFactor, 0),
    };
  }

  setZoomToCursor(enabled: boolean): void {
    this.zoomToCursor = enabled;
  }

  setPreserveViewOnSideSelect(enabled: boolean): void {
    this.preserveViewOnSideSelect = enabled;
  }

  /**
   * Called every render frame. Derives the nearest cardinal side from the live
   * camera-to-target azimuth and, when it differs from the stored side, updates
   * the button highlight and fires onSideChange.
   *
   * Guards (in order):
   *   - no-op before the model loads (defaultCamera is null)
   *   - no-op during an active snap tween (avoids flicker mid-animation)
   *   - no-op when the derived side hasn't changed
   */
  tickDerivedSide(): void {
    if (!this.defaultCamera) return;
    if (this.activeTween !== null) return;

    const dx = this.camera.position.x - this.controls.target.x;
    const dz = this.camera.position.z - this.controls.target.z;
    const azimuth = Math.atan2(dx, dz);
    const side = this.nearestSide(azimuth);

    if (side === this.currentSide) return;

    this.currentSide = side;
    this.sideButtons.setActive(side);
    this.onSideChange?.(side);
  }

  dispose(): void {
    if (this.activeTween) {
      this.activeTween.kill();
      this.activeTween = null;
    }
    this.wheelCleanup?.();
    this.wheelCleanup = null;
  }

  private tweenCameraTo(
    position: { x: number; y: number; z: number },
    target: { x: number; y: number; z: number },
  ): void {
    if (this.activeTween) this.activeTween.kill();
    const tl = gsap.timeline({
      onComplete: () => {
        this.activeTween = null;
      },
    });
    tl.to(
      this.camera.position,
      { ...position, duration: SIDE_SNAP_DURATION_S, ease: 'power2.inOut' },
      0,
    );
    tl.to(
      this.controls.target,
      { ...target, duration: SIDE_SNAP_DURATION_S, ease: 'power2.inOut' },
      0,
    );
    this.activeTween = tl;
  }

  private tweenCameraAlongOrbit(source: CameraState, destination: CameraState): void {
    if (this.activeTween) this.activeTween.kill();

    const sourceOffsetX = source.position.x - source.target.x;
    const sourceOffsetY = source.position.y - source.target.y;
    const sourceOffsetZ = source.position.z - source.target.z;
    const destinationOffsetX = destination.position.x - destination.target.x;
    const destinationOffsetY = destination.position.y - destination.target.y;
    const destinationOffsetZ = destination.position.z - destination.target.z;

    const sourceRadius = Math.sqrt(
      sourceOffsetX * sourceOffsetX + sourceOffsetY * sourceOffsetY + sourceOffsetZ * sourceOffsetZ,
    );
    const destinationRadius = Math.sqrt(
      destinationOffsetX * destinationOffsetX +
        destinationOffsetY * destinationOffsetY +
        destinationOffsetZ * destinationOffsetZ,
    );
    const sourceAzimuth = Math.atan2(sourceOffsetX, sourceOffsetZ);
    const destinationAzimuth = Math.atan2(destinationOffsetX, destinationOffsetZ);
    const azimuthDelta = this.shortestAngleDelta(sourceAzimuth, destinationAzimuth);

    const sourceVertical = sourceOffsetY;
    const destinationVertical = destinationOffsetY;

    const tweenState = { t: 0 };
    this.activeTween = gsap.to(tweenState, {
      t: 1,
      duration: SIDE_SNAP_DURATION_S,
      ease: 'power2.inOut',
      onUpdate: () => {
        const t = tweenState.t;

        const target = new THREE.Vector3(
          lerp(source.target.x, destination.target.x, t),
          lerp(source.target.y, destination.target.y, t),
          lerp(source.target.z, destination.target.z, t),
        );
        const vertical = lerp(sourceVertical, destinationVertical, t);
        const baseRadius = lerp(sourceRadius, destinationRadius, t);
        const dip = Math.sin(Math.PI * t) * SIDE_SNAP_ZOOM_DIP;
        const radius = baseRadius * (1 - dip);
        const horizontal = Math.sqrt(Math.max(0, radius * radius - vertical * vertical));
        const azimuth = sourceAzimuth + azimuthDelta * t;
        const xz = polarToXZ(azimuth, horizontal);

        this.controls.target.set(target.x, target.y, target.z);
        this.camera.position.set(target.x + xz.x, target.y + vertical, target.z + xz.z);
        this.controls.update();
      },
      onComplete: () => {
        this.activeTween = null;
      },
    });
  }

  bindZoomTowardCursor(canvas: HTMLCanvasElement): void {
    if (this.wheelCleanup) this.wheelCleanup();

    this.controls.enableZoom = true;

    if (typeof THREE.Raycaster !== 'function' || typeof THREE.Plane !== 'function') {
      this.wheelCleanup = null;
      return;
    }

    const raycaster = new THREE.Raycaster();
    const ndc = new THREE.Vector2();

    const onWheel = (event: WheelEvent): void => {
      // Zoom out (deltaY > 0), or zoom-to-cursor disabled: let OrbitControls handle it natively.
      if (event.deltaY > 0 || !this.zoomToCursor) return;

      event.preventDefault();

      const rect = canvas.getBoundingClientRect();
      ndc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      ndc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(ndc, this.camera);

      // Focal point: intersect the cursor ray with the plane through the orbit
      // target, perpendicular to the camera-to-target direction. This gives the
      // point at the orbit-target depth that the cursor is actually hovering over,
      // regardless of the camera's tilt angle.
      const viewDir = this.controls.target.clone().sub(this.camera.position).normalize();
      const focalPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(
        viewDir,
        this.controls.target,
      );
      const focalPoint = new THREE.Vector3();
      if (!raycaster.ray.intersectPlane(focalPlane, focalPoint)) return;

      // Zoom in: negative deltaY, so scale < 1 (camera moves closer).
      const zoomSpeed = 0.001;
      let scale = 1 + event.deltaY * zoomSpeed;
      // Clamp: never flip through zero, keep at least 10 % of current distance.
      scale = Math.max(0.1, Math.min(scale, 1));

      // Move the camera along the vector from focalPoint to camera, scaled.
      const camToFocal = this.camera.position.clone().sub(focalPoint);
      this.camera.position.copy(focalPoint.clone().addScaledVector(camToFocal, scale));

      // Move the orbit target along the same direction so it stays proportional.
      const targetToFocal = this.controls.target.clone().sub(focalPoint);
      this.controls.target.copy(focalPoint.clone().addScaledVector(targetToFocal, scale));

      this.controls.update();
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    this.wheelCleanup = () => {
      canvas.removeEventListener('wheel', onWheel);
    };
  }

  /**
   * The auto-fit camera distance before `distanceFactor` is applied: the
   * trigonometric "everything in frame" distance for the current FOV and
   * model radius, plus 15% padding. Shared by `fitToModel` (forward) and
   * `getLiveCameraFactors` (inverse) so the snapshot round-trips exactly.
   */
  private fitBaseDistance(): number {
    const fovRad = (this.camera.fov * Math.PI) / 180;
    return (this.modelRadius / Math.sin(fovRad / 2)) * 1.15;
  }

  private updateSideButtons(): void {
    this.sideButtons.setActive(this.currentSide);
  }

  private getSnapSourceCameraState(): CameraState {
    if (!this.preserveViewOnSideSelect) return this.defaultCamera!;

    return {
      position: this.camera.position.clone(),
      target: this.controls.target.clone(),
    };
  }

  /** Map an azimuth (radians, atan2 convention) to the closest N/E/S/W label. */
  private nearestSide(azimuth: number): TowerSide {
    let best: TowerSide = 'north';
    let bestDist = Infinity;
    for (const side of Object.keys(SIDE_AZIMUTH) as TowerSide[]) {
      let diff = Math.abs(azimuth - SIDE_AZIMUTH[side]);
      // Normalise to [0, π] to handle the ±π wraparound.
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      if (diff < bestDist) {
        bestDist = diff;
        best = side;
      }
    }
    return best;
  }

  private shortestAngleDelta(from: number, to: number): number {
    let delta = to - from;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  }
}
