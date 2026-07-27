import {
  attachSkullPhysics,
  DEFAULT_PHYSICS,
  type PhysicsConfig,
  type ResolvedPhysicsConfig,
  type SkullPhysicsHandle,
  type SkullSealBuckets,
} from '../src/physics';
import { getDisplay, onViewChange } from './rendererController';
import { notifyPhysicsConfigChanged } from './configEditor';

let handle: SkullPhysicsHandle | null = null;
let countsIntervalId: ReturnType<typeof setInterval> | null = null;
let lastCountsText = '';
let lastBySealText = '';

/**
 * Working `PhysicsConfig` accumulated from slider/JSON edits. We pass this
 * to `attachSkullPhysics` every time the renderer is recreated so the user's
 * tuning survives a 2D⇄3D switch.
 */
let workingConfig: PhysicsConfig = {};

export function getPhysicsHandle(): SkullPhysicsHandle | null {
  return handle;
}

function isThreeDActive(): boolean {
  return getDisplay().view3D !== null;
}

/** Read the current value of the 3D Options' Board Size slider. */
function readVisualBoardRadius(): number {
  const rng = document.getElementById('rng-board-size') as HTMLInputElement | null;
  return rng ? Number(rng.value) : DEFAULT_PHYSICS.board.radiusFactor;
}

/** Updaters invoked by `syncSlidersFromConfig` to mirror a resolved config into the UI. */
const sliderSyncers: Array<(cfg: ResolvedPhysicsConfig) => void> = [];

function wireSlider(
  rangeId: string,
  labelId: string,
  decimals: number,
  defaultValue: number,
  onChange: (value: number) => void,
  read: (cfg: ResolvedPhysicsConfig) => number,
): void {
  const rng = document.getElementById(rangeId) as HTMLInputElement | null;
  const lbl = document.getElementById(labelId);
  if (!rng || !lbl) return;
  lbl.textContent = Number(rng.value).toFixed(decimals);
  lbl.style.cursor = 'pointer';
  lbl.title = `Click to reset to ${defaultValue.toFixed(decimals)}`;

  const apply = (v: number, fire: boolean): void => {
    rng.value = String(v);
    lbl.textContent = v.toFixed(decimals);
    if (fire) onChange(v);
  };

  rng.addEventListener('input', () => apply(Number(rng.value), true));
  lbl.addEventListener('click', () => apply(defaultValue, true));

  sliderSyncers.push((cfg) => apply(read(cfg), false));
}

/**
 * Mirror a resolved physics config into every slider/label in the toolbar.
 * Called by `configEditor` after the user applies JSON, so the slider UI
 * stays in lockstep with the canonical config.
 */
export function syncSlidersFromConfig(cfg: ResolvedPhysicsConfig): void {
  for (const sync of sliderSyncers) sync(cfg);
}

/** Apply a partial config to both the live handle and our working config. */
function applyConfig(partial: PhysicsConfig): void {
  workingConfig = mergePartial(workingConfig, partial);
  handle?.applyPhysicsConfig(partial);
  // Keep the JSON preview in sync if the user is looking at the physics
  // config type. No-op otherwise.
  notifyPhysicsConfigChanged();
}

/**
 * Shallow-merge each top-level domain (skull, drum, etc.) one level deep.
 * Sufficient because the `PhysicsConfig` shape is exactly two levels.
 */
function mergePartial(base: PhysicsConfig, patch: PhysicsConfig): PhysicsConfig {
  const out: PhysicsConfig = { ...base };
  for (const key of Object.keys(patch) as Array<keyof PhysicsConfig>) {
    const baseSection = base[key];
    const patchSection = patch[key];
    if (baseSection && patchSection) {
      out[key] = { ...baseSection, ...patchSection } as PhysicsConfig[typeof key];
    } else if (patchSection) {
      out[key] = patchSection as PhysicsConfig[typeof key];
    }
  }
  return out;
}

function reattach(): void {
  detach();
  const view = getDisplay().view3D;
  if (!view) return;
  // Ensure the board collider matches the current visual disc size before
  // colliders are built — the live slider's value is the source of truth
  // for board.radiusFactor while running in the example app.
  workingConfig = mergePartial(workingConfig, {
    board: { radiusFactor: readVisualBoardRadius() },
  });
  handle = attachSkullPhysics(view, workingConfig);
  refreshSkullCountsReadout();
}

function detach(): void {
  if (handle) {
    handle.dispose();
    handle = null;
  }
  refreshSkullCountsReadout();
}

/** Level abbreviation for the compact `#skull-by-seal` readout. */
function levelAbbr(level: 'top' | 'middle' | 'bottom'): string {
  return level === 'middle' ? 'mid' : level === 'bottom' ? 'bot' : 'top';
}

/** One chip's worth of data for the `#skull-by-seal-chips` readout. */
interface SealChip {
  text: string;
  open: boolean;
  loose: boolean;
}

/** Flatten `getSkullsBySeal()`'s buckets into one chip per non-empty entry. */
function sealBreakdownChips(buckets: SkullSealBuckets): SealChip[] {
  const chips: SealChip[] = buckets.bySeal
    .filter((b) => b.ids.length > 0)
    .map((b) => ({
      text: `${b.side[0].toUpperCase()}·${levelAbbr(b.level)} ${b.ids.length}`,
      open: b.broken,
      loose: false,
    }));
  if (buckets.unattributed.length > 0) {
    chips.push({ text: `${buckets.unattributed.length} loose`, open: false, loose: true });
  }
  return chips;
}

function makeChip(text: string, extraClass?: 'open' | 'loose'): HTMLSpanElement {
  const el = document.createElement('span');
  el.className = extraClass ? `skull-seal-chip ${extraClass}` : 'skull-seal-chip';
  el.textContent = text;
  return el;
}

/** Every skull id sitting behind an already-broken seal, plus every unattributed one. */
function stuckSkullIds(buckets: SkullSealBuckets): number[] {
  return buckets.bySeal
    .filter((b) => b.broken)
    .flatMap((b) => b.ids)
    .concat(buckets.unattributed);
}

/**
 * Poll `getSkullCounts()` / `getSkullsBySeal()` and mirror them into the
 * `#skull-counts` label and the `#skull-by-seal` chip readout, and
 * enable/disable the Shake Stuck Skulls button. Only touches the DOM when
 * the underlying text/chips actually changed.
 */
function refreshSkullCountsReadout(): void {
  const el = document.getElementById('skull-counts');
  if (el) {
    const counts = handle?.getSkullCounts();
    let text: string;
    if (!counts) {
      text = 'Skulls: —';
    } else {
      text = `Skulls: ${counts.total} total · ${counts.inTower} tower · ${counts.onBoard} board`;
      if (counts.inTransit > 0) text += ` · ${counts.inTransit} transit`;
      if (counts.pending > 0) text += ` · ${counts.pending} queued`;
    }
    if (text !== lastCountsText) {
      lastCountsText = text;
      el.textContent = text;
    }
  }

  const modeEl = document.getElementById('skull-by-seal-mode');
  const chipsEl = document.getElementById('skull-by-seal-chips');
  const btnShakeStuck = document.getElementById(
    'btn-shake-stuck-skulls',
  ) as HTMLButtonElement | null;
  const buckets = handle?.getSkullsBySeal();
  const stuckIds = buckets ? stuckSkullIds(buckets) : [];
  if (btnShakeStuck) {
    btnShakeStuck.disabled = stuckIds.length === 0;
    btnShakeStuck.textContent =
      stuckIds.length > 0 ? `Shake Stuck Skulls (${stuckIds.length})` : 'Shake Stuck Skulls';
  }
  if (modeEl && chipsEl) {
    const chips = buckets ? sealBreakdownChips(buckets) : [];
    const modeText = buckets ? `Behind seals — ${buckets.mode} mode` : 'Behind seals: —';
    // Signature covers both the header and the chip contents, so a single
    // comparison still gates the (slightly pricier) chip rebuild below.
    const signature = modeText + '|' + chips.map((c) => `${c.text}:${c.open}:${c.loose}`).join(',');
    if (signature !== lastBySealText) {
      lastBySealText = signature;
      modeEl.textContent = modeText;
      chipsEl.replaceChildren(
        ...(chips.length > 0
          ? chips.map((c) => makeChip(c.text, c.open ? 'open' : c.loose ? 'loose' : undefined))
          : [makeChip('none')]),
      );
    }
  }
}

export function initPhysicsController(): void {
  const btnDrop = document.getElementById('btn-drop-skull') as HTMLButtonElement | null;
  const chkDebug = document.getElementById('chk-physics-debug') as HTMLInputElement | null;

  if (btnDrop) {
    btnDrop.addEventListener('click', () => {
      if (!handle && isThreeDActive()) reattach();
      handle?.dropSkull();
      refreshSkullCountsReadout();
    });
  }

  const btnClear = document.getElementById('btn-clear-skulls') as HTMLButtonElement | null;
  if (btnClear) {
    btnClear.addEventListener('click', () => {
      handle?.clearSkulls();
      refreshSkullCountsReadout();
    });
  }

  // Two independent shake calls (per the physics handle / view split):
  // Shake Skulls impulses every currently-inTower skull body; Shake Tower
  // rattles the drum rings. Either can be clicked on its own.
  const btnShakeSkulls = document.getElementById('btn-shake-skulls') as HTMLButtonElement | null;
  if (btnShakeSkulls) {
    btnShakeSkulls.addEventListener('click', () => {
      handle?.shakeSkulls();
    });
  }

  const btnShakeTower = document.getElementById('btn-shake-tower') as HTMLButtonElement | null;
  if (btnShakeTower) {
    btnShakeTower.addEventListener('click', () => {
      getDisplay().view3D?.shakeTower();
    });
  }

  // Targeted variant of Shake Skulls: only the skulls `getSkullsBySeal()`
  // reports as behind an already-broken seal (or unattributed), rather than
  // every inTower skull.
  const btnShakeStuck = document.getElementById(
    'btn-shake-stuck-skulls',
  ) as HTMLButtonElement | null;
  if (btnShakeStuck) {
    btnShakeStuck.addEventListener('click', () => {
      const buckets = handle?.getSkullsBySeal();
      if (buckets) handle?.shakeSelectedSkull(stuckSkullIds(buckets));
    });
  }

  const chkShakeOnSealRemoval = document.getElementById(
    'chk-shake-on-seal-removal',
  ) as HTMLInputElement | null;
  if (chkShakeOnSealRemoval) {
    chkShakeOnSealRemoval.addEventListener('change', () => {
      applyConfig({ seal: { shakeSkullsOnSealRemoval: chkShakeOnSealRemoval.checked } });
    });
    sliderSyncers.push((cfg) => {
      // The resolved leaf may also be an object (mode/shake overrides) when
      // set via the JSON config editor — the checkbox only reflects on/off.
      chkShakeOnSealRemoval.checked = cfg.seal.shakeSkullsOnSealRemoval !== false;
    });
  }

  const chkClickToShake = document.getElementById('chk-click-to-shake') as HTMLInputElement | null;
  if (chkClickToShake) {
    chkClickToShake.addEventListener('change', () => {
      applyConfig({ skull: { clickToShake: chkClickToShake.checked } });
    });
    sliderSyncers.push((cfg) => {
      chkClickToShake.checked = cfg.skull.clickToShake;
    });
  }

  const chkCanSleep = document.getElementById('chk-skull-can-sleep') as HTMLInputElement | null;
  if (chkCanSleep) {
    chkCanSleep.addEventListener('change', () => {
      applyConfig({ skull: { canSleep: chkCanSleep.checked } });
    });
    sliderSyncers.push((cfg) => {
      chkCanSleep.checked = cfg.skull.canSleep;
    });
  }

  // Live counts readout: polled rather than event-driven since positions
  // change every physics step. initPhysicsController() runs once at boot
  // (see example.ts), but the interval is guarded defensively in case that
  // ever changes.
  if (countsIntervalId !== null) clearInterval(countsIntervalId);
  countsIntervalId = setInterval(refreshSkullCountsReadout, 250);
  refreshSkullCountsReadout();

  if (chkDebug) {
    chkDebug.addEventListener('change', () => {
      // The full Rapier debug overlay is built at attach time only, so
      // toggling it later requires a fresh attach.
      applyConfig({ debug: { colliders: chkDebug.checked } });
      if (handle) reattach();
    });
  }

  const chkSealDebug = document.getElementById('chk-seal-debug') as HTMLInputElement | null;
  if (chkSealDebug) {
    chkSealDebug.addEventListener('change', () => {
      applyConfig({ debug: { sealColliders: chkSealDebug.checked } });
    });
  }

  // --- Skull Appearance: Model + Collider dropdowns ---
  const selModel = document.getElementById('sel-skull-model') as HTMLSelectElement | null;
  const selCollider = document.getElementById('sel-skull-collider') as HTMLSelectElement | null;
  if (selModel && selCollider) {
    // Discover available skull GLBs at build time. import.meta.glob returns
    // a map of file paths → resolved URL strings (handled by Vite for both
    // dev and built bundles, so no manual base-URL math is needed). Files
    // not present in src/3d/assets/ simply don't appear in the dropdown.
    const skullModules = import.meta.glob<string>('../src/3d/assets/skull_*.glb', {
      eager: true,
      query: '?url',
      import: 'default',
    });
    for (const [path, url] of Object.entries(skullModules)) {
      const filename = path.split('/').pop() ?? '';
      const stem = filename.replace(/\.glb$/i, '');
      const label = stem.replace(/^skull_?/i, 'Skull #').replace(/_/g, ' ');
      const opt = document.createElement('option');
      opt.value = url;
      opt.text = label;
      selModel.appendChild(opt);
    }

    const syncColliderEnabled = (): void => {
      selCollider.disabled = !selModel.value;
      if (selCollider.disabled) selCollider.value = 'sphere';
    };

    selModel.addEventListener('change', () => {
      syncColliderEnabled();
      applyConfig({
        skull: {
          modelUrl: selModel.value || undefined,
          colliderShape: selCollider.value as 'sphere' | 'hull',
        },
      });
    });

    selCollider.addEventListener('change', () => {
      applyConfig({ skull: { colliderShape: selCollider.value as 'sphere' | 'hull' } });
    });

    syncColliderEnabled();

    // Pre-select skull_1 + hull as the initial defaults if a model is available.
    const firstSkullUrl = Object.values(skullModules)[0] as string | undefined;
    if (firstSkullUrl) {
      selModel.value = firstSkullUrl;
      selCollider.value = 'hull';
      syncColliderEnabled();
      applyConfig({ skull: { modelUrl: firstSkullUrl, colliderShape: 'hull' } });
    }

    // Mirror JSON-paste config edits back into the UI.
    sliderSyncers.push((cfg) => {
      selModel.value = cfg.skull.modelUrl ?? '';
      selCollider.value = cfg.skull.colliderShape ?? 'sphere';
      syncColliderEnabled();
    });
  }

  // --- Triggers: Auto-drop on state skull count ---
  const chkAutoDrop = document.getElementById('chk-auto-drop-on-state') as HTMLInputElement | null;
  if (chkAutoDrop) {
    chkAutoDrop.addEventListener('change', () => {
      applyConfig({ skull: { autoDropOnSkullCountIncrease: chkAutoDrop.checked } });
    });
    sliderSyncers.push((cfg) => {
      chkAutoDrop.checked = cfg.skull.autoDropOnSkullCountIncrease ?? false;
    });
  }

  wireSlider(
    'rng-skull-radius',
    'lbl-skull-radius',
    3,
    DEFAULT_PHYSICS.skull.radiusFactor,
    (v) => applyConfig({ skull: { radiusFactor: v } }),
    (cfg) => cfg.skull.radiusFactor,
  );
  wireSlider(
    'rng-skull-max',
    'lbl-skull-max',
    0,
    DEFAULT_PHYSICS.skull.maxCount,
    (v) => applyConfig({ skull: { maxCount: v } }),
    (cfg) => cfg.skull.maxCount,
  );
  wireSlider(
    'rng-skull-friction',
    'lbl-skull-friction',
    2,
    DEFAULT_PHYSICS.skull.friction,
    (v) => applyConfig({ skull: { friction: v } }),
    (cfg) => cfg.skull.friction,
  );
  wireSlider(
    'rng-drum-friction',
    'lbl-drum-friction',
    3,
    DEFAULT_PHYSICS.drum.friction,
    (v) => applyConfig({ drum: { friction: v } }),
    (cfg) => cfg.drum.friction,
  );
  wireSlider(
    'rng-seal-friction',
    'lbl-seal-friction',
    3,
    DEFAULT_PHYSICS.seal.friction,
    (v) => applyConfig({ seal: { friction: v } }),
    (cfg) => cfg.seal.friction,
  );
  wireSlider(
    'rng-static-friction',
    'lbl-static-friction',
    3,
    DEFAULT_PHYSICS.static.friction,
    (v) => applyConfig({ static: { friction: v } }),
    (cfg) => cfg.static.friction,
  );
  wireSlider(
    'rng-board-friction',
    'lbl-board-friction',
    3,
    DEFAULT_PHYSICS.board.friction,
    (v) => applyConfig({ board: { friction: v } }),
    (cfg) => cfg.board.friction,
  );

  // The board collider radius mirrors the visual disc's `Board Size` slider
  // in 3D Options. Listening to its input events keeps the physics floor in
  // lockstep with whatever size the user has dialed in.
  const visualBoardSize = document.getElementById('rng-board-size') as HTMLInputElement | null;
  if (visualBoardSize) {
    visualBoardSize.addEventListener('input', () => {
      applyConfig({ board: { radiusFactor: Number(visualBoardSize.value) } });
    });
  }
  wireSlider(
    'rng-restitution',
    'lbl-restitution',
    2,
    DEFAULT_PHYSICS.skull.restitution,
    (v) => applyConfig({ skull: { restitution: v } }),
    (cfg) => cfg.skull.restitution,
  );
  wireSlider(
    'rng-skull-ang-damp',
    'lbl-skull-ang-damp',
    2,
    DEFAULT_PHYSICS.skull.angularDamping,
    (v) => applyConfig({ skull: { angularDamping: v } }),
    (cfg) => cfg.skull.angularDamping,
  );
  wireSlider(
    'rng-skull-lin-damp',
    'lbl-skull-lin-damp',
    2,
    DEFAULT_PHYSICS.skull.linearDamping,
    (v) => applyConfig({ skull: { linearDamping: v } }),
    (cfg) => cfg.skull.linearDamping,
  );
  wireSlider(
    'rng-skull-solver-iters',
    'lbl-skull-solver-iters',
    0,
    DEFAULT_PHYSICS.skull.additionalSolverIterations,
    (v) => applyConfig({ skull: { additionalSolverIterations: v } }),
    (cfg) => cfg.skull.additionalSolverIterations,
  );
  wireSlider(
    'rng-shake-strength',
    'lbl-shake-strength',
    1,
    DEFAULT_PHYSICS.skull.shakeStrength,
    (v) => applyConfig({ skull: { shakeStrength: v } }),
    (cfg) => cfg.skull.shakeStrength,
  );
  wireSlider(
    'rng-shake-horizontal',
    'lbl-shake-horizontal',
    2,
    DEFAULT_PHYSICS.skull.shakeHorizontalFactor,
    (v) => applyConfig({ skull: { shakeHorizontalFactor: v } }),
    (cfg) => cfg.skull.shakeHorizontalFactor,
  );
  wireSlider(
    'rng-shake-upward',
    'lbl-shake-upward',
    2,
    DEFAULT_PHYSICS.skull.shakeUpwardFactor,
    (v) => applyConfig({ skull: { shakeUpwardFactor: v } }),
    (cfg) => cfg.skull.shakeUpwardFactor,
  );
  wireSlider(
    'rng-seal-removal-delay',
    'lbl-seal-removal-delay',
    2,
    DEFAULT_PHYSICS.seal.shakeSkullsOnSealRemovalDelaySeconds,
    (v) => applyConfig({ seal: { shakeSkullsOnSealRemovalDelaySeconds: v } }),
    (cfg) => cfg.seal.shakeSkullsOnSealRemovalDelaySeconds,
  );

  // When the user switches renderers (e.g. from 2D-only to 3D), refresh
  // attachment so the physics hooks point at the current Tower3DView.
  onViewChange(() => {
    if (isThreeDActive()) {
      reattach();
    } else {
      detach();
    }
  });

  // Initial attach if 3D is already active at boot.
  if (isThreeDActive()) reattach();
}
