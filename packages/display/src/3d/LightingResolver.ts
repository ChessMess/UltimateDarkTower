import type { LightingConfig, ResolvedLightingConfig } from './types';

export const DEFAULT_LIGHTING: ResolvedLightingConfig = {
  scene: {
    background: 0x000000,
    skyboxUrl: '',
    hemisphere: { color: 0xffffff, ground: 0x000000, intensity: 0.04 },
    key: {
      color: 0xffffff,
      intensity: 1.6,
      position: [3, 4.5, -1],
      shadow: {
        mapSize: 2048,
        bias: -0.0003,
        normalBias: 0.02,
        frustumRadiusFactor: 1.3,
        farFactor: 10,
      },
    },
    fill: {
      color: 0xffffff,
      intensity: 5.0,
      width: 1.5,
      height: 2.5,
      position: [-4, 1.5, -8],
    },
    exposure: 0.7,
    bloom: {
      enabled: true,
      strength: 1.5,
      radius: 0.5,
      // Only HDR-bright pixels bloom: the LED proxy/halo materials are scaled
      // by HDR_PROXY_SCALE (toneMapped: false) so `material.color × driver.v
      // opacity` crosses 1.0 at peak. Bloom — not per-LED PointLights — is what
      // drives the perceived LED brightness.
      threshold: 1.0,
      resolutionScale: 0.5,
    },
  },
  leds: {
    sealBacklights: {
      enabled: true,
      color: 0xff2020,
      // Radial placement inside the drum (fraction of bounding-sphere radius).
      // 0.15 puts the proxy between the central axis and the drum inner wall so
      // light traverses drum-interior → glyph/chute → seal → camera correctly.
      radiusFactor: 0.15,
      backlightWhenBroken: true,
      proxy: {
        enabled: true,
        sizeFactor: 0.025,
        geometry: 'sphere',
      },
      halo: {
        enabled: true,
        sizeFactor: 0.14,
        opacity: 0.75,
      },
    },
    ledgeLeds: {
      enabled: true,
      color: 0xff2020,
      proxy: {
        enabled: true,
        sizeFactor: 0.025,
      },
      halo: {
        enabled: true,
        sizeFactor: 0.14,
        opacity: 0.75,
      },
    },
    baseLeds: {
      enabled: true,
      color: 0xff2020,
      proxy: {
        enabled: true,
        sizeFactor: 0.025,
      },
      halo: {
        enabled: true,
        sizeFactor: 0.14,
        opacity: 0.75,
      },
    },
  },
  animation: {
    idleBreathe: { peakFactor: 1.08, durationS: 4 },
  },
  entrance: {
    peakKeyFactor: 2.5,
    beats: {
      silhouetteHemiFactor: 0.25,
      silhouetteExposureFactor: 0.15,
      silhouetteDurationS: 1.4,
      keyArc1DurationS: 0.9,
      keyArc1DelayS: 1.2,
      keyPunchDurationS: 0.6,
      keyPunchDelayS: 1.5,
      exposureInDurationS: 1.2,
      keyArc2DurationS: 1.0,
      keyArc2DelayS: 2.1,
      keySettleDurationS: 1.2,
      keySettleDelayS: 2.3,
      fillInDurationS: 1.1,
      fillInDelayS: 2.6,
      hemiInDurationS: 1.1,
      hemiInDelayS: 2.8,
    },
  },
  groundDisc: {
    color: 0x050505,
    roughness: 0.92,
    metalness: 0,
    radiusFactor: 3,
    undersideLightIntensity: 0.15,
  },
  boardDisc: {
    enabled: true,
    opacity: 0.9,
    source: 'image',
    northKingdom: 0,
    brightness: 1,
    thicknessFactor: 0.06,
    edgeColor: 0x5c3318,
    bottomCap: true,
  },
};

export function resolveLighting(
  user?: LightingConfig,
  base: ResolvedLightingConfig = DEFAULT_LIGHTING,
): ResolvedLightingConfig {
  const out: ResolvedLightingConfig = {
    scene: {
      background: user?.scene?.background ?? base.scene.background,
      skyboxUrl: user?.scene?.skyboxUrl ?? base.scene.skyboxUrl,
      hemisphere: {
        color: user?.scene?.hemisphere?.color ?? base.scene.hemisphere.color,
        ground: user?.scene?.hemisphere?.ground ?? base.scene.hemisphere.ground,
        intensity: user?.scene?.hemisphere?.intensity ?? base.scene.hemisphere.intensity,
      },
      key: {
        color: user?.scene?.key?.color ?? base.scene.key.color,
        intensity: user?.scene?.key?.intensity ?? base.scene.key.intensity,
        position: user?.scene?.key?.position ?? base.scene.key.position,
        shadow: {
          mapSize: user?.scene?.key?.shadow?.mapSize ?? base.scene.key.shadow.mapSize,
          bias: user?.scene?.key?.shadow?.bias ?? base.scene.key.shadow.bias,
          normalBias: user?.scene?.key?.shadow?.normalBias ?? base.scene.key.shadow.normalBias,
          frustumRadiusFactor:
            user?.scene?.key?.shadow?.frustumRadiusFactor ??
            base.scene.key.shadow.frustumRadiusFactor,
          farFactor: user?.scene?.key?.shadow?.farFactor ?? base.scene.key.shadow.farFactor,
        },
      },
      fill: {
        color: user?.scene?.fill?.color ?? base.scene.fill.color,
        intensity: user?.scene?.fill?.intensity ?? base.scene.fill.intensity,
        width: user?.scene?.fill?.width ?? base.scene.fill.width,
        height: user?.scene?.fill?.height ?? base.scene.fill.height,
        position: user?.scene?.fill?.position ?? base.scene.fill.position,
      },
      exposure: user?.scene?.exposure ?? base.scene.exposure,
      bloom: {
        enabled: user?.scene?.bloom?.enabled ?? base.scene.bloom.enabled,
        strength: user?.scene?.bloom?.strength ?? base.scene.bloom.strength,
        radius: user?.scene?.bloom?.radius ?? base.scene.bloom.radius,
        threshold: user?.scene?.bloom?.threshold ?? base.scene.bloom.threshold,
        resolutionScale: user?.scene?.bloom?.resolutionScale ?? base.scene.bloom.resolutionScale,
      },
    },
    leds: {
      sealBacklights: {
        enabled: user?.leds?.sealBacklights?.enabled ?? base.leds.sealBacklights.enabled,
        color: user?.leds?.sealBacklights?.color ?? base.leds.sealBacklights.color,
        radiusFactor:
          user?.leds?.sealBacklights?.radiusFactor ?? base.leds.sealBacklights.radiusFactor,
        backlightWhenBroken:
          user?.leds?.sealBacklights?.backlightWhenBroken ??
          base.leds.sealBacklights.backlightWhenBroken,
        proxy: {
          enabled:
            user?.leds?.sealBacklights?.proxy?.enabled ?? base.leds.sealBacklights.proxy.enabled,
          sizeFactor:
            user?.leds?.sealBacklights?.proxy?.sizeFactor ??
            base.leds.sealBacklights.proxy.sizeFactor,
          geometry:
            user?.leds?.sealBacklights?.proxy?.geometry ?? base.leds.sealBacklights.proxy.geometry,
        },
        halo: {
          enabled:
            user?.leds?.sealBacklights?.halo?.enabled ?? base.leds.sealBacklights.halo.enabled,
          sizeFactor:
            user?.leds?.sealBacklights?.halo?.sizeFactor ??
            base.leds.sealBacklights.halo.sizeFactor,
          opacity:
            user?.leds?.sealBacklights?.halo?.opacity ?? base.leds.sealBacklights.halo.opacity,
        },
      },
      ledgeLeds: {
        enabled: user?.leds?.ledgeLeds?.enabled ?? base.leds.ledgeLeds.enabled,
        color: user?.leds?.ledgeLeds?.color ?? base.leds.ledgeLeds.color,
        proxy: {
          enabled: user?.leds?.ledgeLeds?.proxy?.enabled ?? base.leds.ledgeLeds.proxy.enabled,
          sizeFactor:
            user?.leds?.ledgeLeds?.proxy?.sizeFactor ?? base.leds.ledgeLeds.proxy.sizeFactor,
        },
        halo: {
          enabled: user?.leds?.ledgeLeds?.halo?.enabled ?? base.leds.ledgeLeds.halo.enabled,
          sizeFactor:
            user?.leds?.ledgeLeds?.halo?.sizeFactor ?? base.leds.ledgeLeds.halo.sizeFactor,
          opacity: user?.leds?.ledgeLeds?.halo?.opacity ?? base.leds.ledgeLeds.halo.opacity,
        },
      },
      baseLeds: {
        enabled: user?.leds?.baseLeds?.enabled ?? base.leds.baseLeds.enabled,
        color: user?.leds?.baseLeds?.color ?? base.leds.baseLeds.color,
        proxy: {
          enabled: user?.leds?.baseLeds?.proxy?.enabled ?? base.leds.baseLeds.proxy.enabled,
          sizeFactor:
            user?.leds?.baseLeds?.proxy?.sizeFactor ?? base.leds.baseLeds.proxy.sizeFactor,
        },
        halo: {
          enabled: user?.leds?.baseLeds?.halo?.enabled ?? base.leds.baseLeds.halo.enabled,
          sizeFactor: user?.leds?.baseLeds?.halo?.sizeFactor ?? base.leds.baseLeds.halo.sizeFactor,
          opacity: user?.leds?.baseLeds?.halo?.opacity ?? base.leds.baseLeds.halo.opacity,
        },
      },
    },
    animation: {
      idleBreathe: {
        peakFactor:
          user?.animation?.idleBreathe?.peakFactor ?? base.animation.idleBreathe.peakFactor,
        durationS: user?.animation?.idleBreathe?.durationS ?? base.animation.idleBreathe.durationS,
      },
    },
    entrance: {
      peakKeyFactor: user?.entrance?.peakKeyFactor ?? base.entrance.peakKeyFactor,
      beats: { ...base.entrance.beats, ...user?.entrance?.beats },
    },
    groundDisc: {
      color: user?.groundDisc?.color ?? base.groundDisc.color,
      roughness: user?.groundDisc?.roughness ?? base.groundDisc.roughness,
      metalness: user?.groundDisc?.metalness ?? base.groundDisc.metalness,
      radiusFactor: user?.groundDisc?.radiusFactor ?? base.groundDisc.radiusFactor,
      undersideLightIntensity:
        user?.groundDisc?.undersideLightIntensity ?? base.groundDisc.undersideLightIntensity,
    },
    boardDisc: {
      enabled: user?.boardDisc?.enabled ?? base.boardDisc.enabled,
      opacity: user?.boardDisc?.opacity ?? base.boardDisc.opacity,
      source: user?.boardDisc?.source ?? base.boardDisc.source,
      northKingdom: user?.boardDisc?.northKingdom ?? base.boardDisc.northKingdom,
      brightness: user?.boardDisc?.brightness ?? base.boardDisc.brightness,
      thicknessFactor: user?.boardDisc?.thicknessFactor ?? base.boardDisc.thicknessFactor,
      edgeColor: user?.boardDisc?.edgeColor ?? base.boardDisc.edgeColor,
      bottomCap: user?.boardDisc?.bottomCap ?? base.boardDisc.bottomCap,
    },
  };

  return out;
}
