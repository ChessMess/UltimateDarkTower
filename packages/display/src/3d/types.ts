import type { SoundPack } from '../audio/soundPack';

/** Recursively make every property of `T` required. Functions pass through unchanged. */
export type DeepRequired<T> = T extends (...args: never[]) => unknown
  ? T
  : T extends object
    ? { [K in keyof T]-?: DeepRequired<T[K]> }
    : T;

/** RGB hex as a single number (e.g. `0xff2020`). */
export type HexColor = number;
/** XYZ position tuple in three.js world units. */
export type Vec3 = [number, number, number];

/**
 * Core (nested-only) lighting shape. Every value consumed by {@link Tower3DView}
 * lives here: scene-rig intensities/colors/geometry, LED emissive + halo
 * parameters, animation timings, entrance cinematic beats, and the
 * shadow-catching ground disc. All fields optional — unset fields fall back
 * to `DEFAULT_LIGHTING` exported from `Tower3DView`.
 */
export interface LightingConfigCore {
  /** Three-point scene rig + tone mapping + scene background. */
  scene?: {
    /** Scene clear color behind the model. */
    background?: HexColor;
    /** Equirectangular image or .hdr URL to use as a skybox. Clears when set to undefined. */
    skyboxUrl?: string;
    hemisphere?: { color?: HexColor; ground?: HexColor; intensity?: number };
    key?: {
      color?: HexColor;
      intensity?: number;
      /** Camera-local position — the key is parented to the camera so it orbits with the viewer. */
      position?: Vec3;
      shadow?: {
        mapSize?: number;
        bias?: number;
        normalBias?: number;
        /** Shadow camera orthographic half-size, as a factor of modelRadius. */
        frustumRadiusFactor?: number;
        /** Shadow camera far plane, as a factor of modelRadius. */
        farFactor?: number;
      };
    };
    fill?: {
      color?: HexColor;
      intensity?: number;
      width?: number;
      height?: number;
      /** Camera-local position. */
      position?: Vec3;
    };
    /** Renderer tone-mapping exposure. */
    exposure?: number;
    /** Post-process bloom (UnrealBloomPass). Applied at initScene time; `strength: 0` disables visually. */
    bloom?: {
      enabled?: boolean;
      /** Glow intensity (0–3). */
      strength?: number;
      /** Bloom spread radius (0–1). */
      radius?: number;
      /** Luminance threshold — 0 means all bright pixels bloom. */
      threshold?: number;
      /**
       * Fraction of the canvas backing resolution to render bloom at (0–1).
       * Defaults to **0.5** (half-res, ~4× cheaper than full-res). Bloom is
       * intrinsically blurry, so lowering this is visually free; lower it
       * further (e.g. 0.25) on weak GPUs. Set to 1 for full-resolution bloom.
       */
      resolutionScale?: number;
    };
  };

  /** Per-LED emissive + halo parameters. */
  leds?: {
    /**
     * Inside-the-drum LED proxies (12 total, ring layers only). Each LED is a
     * bright proxy mesh + halo sprite positioned at the cardinal azimuth,
     * deep inside the drum (between central axis and drum inner wall). Three.js
     * depth testing naturally handles glyph/chute alignment: the proxy is
     * occluded by solid drum surfaces and visible through cutout holes. The
     * HDR-bright proxy + halo cross the raised bloom threshold so each seal
     * reads as a glowing LED.
     */
    sealBacklights?: {
      /** Master enable/disable for all seal LED visuals. */
      enabled?: boolean;
      /** Color for the proxy mesh and halo sprite. */
      color?: HexColor;
      /**
       * Radial placement of the proxy mesh as a factor of modelRadius.
       * Must be well inside the drum inner wall so light traverses
       * drum-interior → glyph/chute → seal → camera in the correct order.
       */
      radiusFactor?: number;
      /** Keep the backlight on when the seal is broken. Defaults to true. */
      backlightWhenBroken?: boolean;
      /** Bright proxy mesh — the directly-visible "LED bulb." */
      proxy?: {
        enabled?: boolean;
        /** Sphere radius as a factor of modelRadius. */
        sizeFactor?: number;
        geometry?: 'sphere' | 'cylinder';
      };
      /** Soft additive halo sprite around the proxy. */
      halo?: {
        enabled?: boolean;
        /** Sprite scale as a factor of modelRadius. */
        sizeFactor?: number;
        /** Peak opacity at driver=1. */
        opacity?: number;
      };
    };

    /**
     * Ball-type LED visuals for the 4 ledge-ring lights (layer 3).
     * A bright proxy sphere + soft halo sprite are placed at each corner position
     * on the outer tower surface, mirroring the seal backlight approach.
     */
    ledgeLeds?: {
      /** Master enable/disable. */
      enabled?: boolean;
      /** Color for the proxy mesh and halo sprite. */
      color?: HexColor;
      /** Bright proxy sphere — the directly-visible "LED bulb." */
      proxy?: {
        enabled?: boolean;
        /** Sphere radius as a factor of modelRadius. */
        sizeFactor?: number;
      };
      /** Soft additive halo sprite. */
      halo?: {
        enabled?: boolean;
        /** Sprite scale as a factor of modelRadius. */
        sizeFactor?: number;
        /** Peak opacity at driver=1. */
        opacity?: number;
      };
    };

    /**
     * Ball-type LED visuals for the 8 base lights (layers 4–5, BASE1 and BASE2).
     * A bright proxy sphere + soft halo sprite are placed at each corner position,
     * mirroring the ledge LED approach.
     */
    baseLeds?: {
      /** Master enable/disable. */
      enabled?: boolean;
      /** Color for the proxy mesh and halo sprite. */
      color?: HexColor;
      /** Bright proxy sphere — the directly-visible "LED bulb." */
      proxy?: {
        enabled?: boolean;
        /** Sphere radius as a factor of modelRadius. */
        sizeFactor?: number;
      };
      /** Soft additive halo sprite. */
      halo?: {
        enabled?: boolean;
        /** Sprite scale as a factor of modelRadius. */
        sizeFactor?: number;
        /** Peak opacity at driver=1. */
        opacity?: number;
      };
    };
  };

  /** Idle breathing pulse on the key light. Per-LED effect timings are
   *  firmware-fixed (see LedEffectAnimator) and not user-configurable. */
  animation?: {
    idleBreathe?: { peakFactor?: number; durationS?: number };
  };

  /** Cinematic entrance tween (see `Tower3DView.playEntrance`). */
  entrance?: {
    /** How far the key intensity overshoots its target during the flash beat. */
    peakKeyFactor?: number;
    beats?: {
      silhouetteHemiFactor?: number;
      silhouetteExposureFactor?: number;
      silhouetteDurationS?: number;
      keyArc1DurationS?: number;
      keyArc1DelayS?: number;
      keyPunchDurationS?: number;
      keyPunchDelayS?: number;
      exposureInDurationS?: number;
      keyArc2DurationS?: number;
      keyArc2DelayS?: number;
      keySettleDurationS?: number;
      keySettleDelayS?: number;
      fillInDurationS?: number;
      fillInDelayS?: number;
      hemiInDurationS?: number;
      hemiInDelayS?: number;
    };
  };

  /** Noir ground disc that catches the key-light shadow. */
  groundDisc?: {
    color?: HexColor;
    roughness?: number;
    metalness?: number;
    /** Disc radius as a factor of modelRadius. */
    radiusFactor?: number;
    /** Intensity of the upward directional light that fills the board underside. 0 disables it. Defaults to 1.5. */
    undersideLightIntensity?: number;
  };

  /** Game board texture overlaid on the ground disc. */
  boardDisc?: {
    /** Show the board texture on the ground disc. Defaults to `true`. */
    enabled?: boolean;
    /** Material opacity when board texture is active (0–1). Defaults to 0.9. */
    opacity?: number;
    /**
     * Texture source. `'image'` loads `src/3d/assets/board.png` (the real game
     * board art); `'procedural'` uses the stylized canvas-drawn fallback.
     * If the image asset is missing or fails to load, falls back to procedural.
     * Defaults to `'image'`.
     */
    source?: 'image' | 'procedural';
    /**
     * Which of the four kingdoms faces the +Z (camera-forward) direction.
     * Rotates the image texture in 90° steps. Has no effect when
     * `source === 'procedural'`. Defaults to `0`.
     */
    northKingdom?: 0 | 1 | 2 | 3;
    /**
     * Per-board brightness multiplier on top of the scene lighting. `1` is the
     * native texture brightness; `0` is black; up to `2` for over-bright.
     * Implemented as the material's diffuse color scalar so it stacks with
     * scene exposure / key light. Defaults to `1`.
     */
    brightness?: number;
    /**
     * Physical thickness of the board as a fraction of `modelRadius`.
     * Drives the height of a `CylinderGeometry` so the board has a visible edge
     * when viewed at oblique angles. Values in the range `0.01–0.04` look natural;
     * `0` is clamped to a minimum to avoid degenerate geometry. Defaults to `0.018`.
     */
    thicknessFactor?: number;
    /**
     * Color of the board's side-wall (edge). Two common presets:
     * - `0x5c3318` — medium warm wood / cardboard
     * - `0x0e0e0e` — near-black neoprene / rubber mat
     * Defaults to `0x5c3318`.
     */
    edgeColor?: HexColor;
    /**
     * Whether the underside face of the board cylinder is rendered.
     * Normally invisible unless the camera goes below the board. Set to `false`
     * to skip it (saves one draw call; safe when the camera never dips under).
     * Defaults to `true`.
     */
    bottomCap?: boolean;
  };
}

/** Public lighting config — a nested partial of {@link LightingConfigCore}. */
export type LightingConfig = LightingConfigCore;

/**
 * Camera defaults for the 3D view.
 *
 * All factors are multiples of `modelRadius` (the half-size of the loaded GLB),
 * so they scale correctly regardless of the model's physical size.
 */
export interface CameraConfig {
  /**
   * Camera eye height as a fraction of `modelRadius`.
   * Negative values place the eye below the model's geometric centre.
   * Defaults to `-0.5`.
   */
  elevationFactor?: number;
  /**
   * Vertical position of the orbit target (look-at point) as a fraction of
   * `modelRadius`. Negative values aim the camera lower on the model.
   * Defaults to `-0.15`.
   */
  targetHeightFactor?: number;
  /**
   * Multiplies the fitted camera distance (the auto-computed "everything in
   * frame" distance). `1` (default) keeps the standard framing; `>1` pulls the
   * camera back (zooms out), `<1` pushes it in. Lets callers zoom independently
   * of `elevationFactor`/`targetHeightFactor`.
   */
  distanceFactor?: number;
  /**
   * When `true`, scroll-wheel zoom-in moves the camera toward the point under
   * the cursor rather than the orbit target. Zoom-out always uses the standard
   * OrbitControls behavior. Defaults to `true`.
   */
  zoomToCursor?: boolean;
  /**
   * When `true`, selecting a cardinal direction keeps the current orbit target,
   * tilt, pan offset, and zoom distance instead of resetting to the fitted
   * default camera framing. Defaults to `false`.
   */
  preserveViewOnSideSelect?: boolean;
}

/** Options for {@link CameraConfig} application. */
export interface ApplyCameraConfigOptions {
  /**
   * When `true`, apply only the changed framing factor(s) to the *current* live
   * view — preserving the orbit angle (azimuth), pan, and any dimension not being
   * changed — instead of snapping back to the north-facing fitted default.
   * Used by the live tuning sliders so dragging one doesn't reset the viewpoint.
   * Defaults to `false` (snap to the fitted north preset).
   */
  preserveView?: boolean;
}

/** Fully-resolved lighting config (all nested fields required) used internally by Tower3DView. */
export type ResolvedLightingConfig = DeepRequired<LightingConfigCore>;

/**
 * Audio behaviour for the 3D view. All fields optional; `applyAudioConfig`
 * sparse-merges so callers can set any subset. `getAudioConfig()` returns
 * the fully-resolved state via `Required<AudioConfig>`.
 *
 * The simplest use is `display.applyAudioConfig({ enabled: true })` from a
 * user-gesture handler — the default sound pack is already wired in.
 */
export interface AudioConfig {
  /**
   * Sound pack used for sample playback. Defaults to `DEFAULT_TOWER_SOUND_PACK`
   * (the official Restoration Games audio). Swap in your own at runtime to
   * change all samples at once.
   */
  pack?: SoundPack;
  /**
   * Master enable for audio playback. Browsers block AudioContext until a user
   * gesture, so this must be set from a click/keydown handler. Defaults to
   * `false` (silent until the consumer opts in).
   */
  enabled?: boolean;
  /**
   * When true, `applyState()` auto-fills `state.audio.sample` from the active
   * sequence map if the state has a known light sequence but no explicit
   * sample. Defaults to `false` (lights and audio are decoupled — the consumer
   * sets `state.audio.sample` explicitly to trigger audio).
   */
  bindSequenceToSample?: boolean;
  /**
   * Optional override of the sequence-id → sample-id binding used when
   * `bindSequenceToSample` is true. Resolution order:
   *   `config.sequenceMap` ?? `config.pack?.sequenceMap` ?? `DEFAULT_SEQUENCE_AUDIO_MAP`.
   */
  sequenceMap?: Record<number, number>;
  /**
   * URL for the drum-rotation sound, played once per rotation and cut to the
   * rotation's length when the drum settles. Defaults to the bundled
   * `drumRotation.ogg` (`DRUM_ROTATION_SOUND_URL`); pass a custom URL to override,
   * or `null` to disable it (silence — there is no procedural fallback). A
   * missing/failed load is silent.
   */
  drumRotationUrl?: string | null;
}
