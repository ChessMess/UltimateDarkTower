import type { TowerDisplay, TowerStateReadout } from '../src/index';
import type { TowerState } from 'ultimatedarktower';
import type { DomElements } from './dom';
import { refreshConfigPreview, setConfigPreviewMessage, syncConfigSelectorVisibility } from './configEditor';
import { refreshLightingConfigBox } from './lightingController';
import { armTowerAudioFromUserGesture, is3DViewVisible, getLastState } from './rendererController';
import { createReadmeExampleState, createRandomState, createAllOnState, createSequenceState, createEmptyState, createCalibrationCommandState, SEQUENCE_AUDIO_MAP } from './presets';
import { removeAllSeals, resetSeals, toggleSeal, getTower } from './sealController';
import { clearLedOverrides } from './ledOverrideController';
import { SEQUENCE_METADATA } from '../src/sequences/sequenceMetadata';

const DRUM_INDEX_BY_LEVEL: Record<string, number> = { top: 0, middle: 1, bottom: 2 };

function setStateName(name: string, els: DomElements): void {
  if (els.stateBadge) els.stateBadge.textContent = name;
}

function applyAndShow(
  state: TowerState,
  getDisplay: () => TowerDisplay,
  getReadout: () => TowerStateReadout,
  setLastState: (s: TowerState | null) => void,
  els: DomElements,
  fromUserGesture = true
): void {
  setLastState(state);
  if (fromUserGesture) {
    armTowerAudioFromUserGesture(els);
  }
  clearLedOverrides(getDisplay(), getReadout());
  getDisplay().applyState(state, fromUserGesture);
  getReadout().applyState(state);
  refreshConfigPreview(getDisplay, els);
  refreshDrumRotateActive(state, els);
  if (is3DViewVisible()) {
    refreshLightingConfigBox(getDisplay, els);
  }
}

export function initStateEditor(
  getDisplay: () => TowerDisplay,
  getReadout: () => TowerStateReadout,
  setLastState: (s: TowerState | null) => void,
  els: DomElements
): void {
  if (els.btnReadme) {
    els.btnReadme.addEventListener('click', () => {
      setStateName('readme example', els);
      applyAndShow(createReadmeExampleState(), getDisplay, getReadout, setLastState, els);
    });
  }

  if (els.btnRandom) {
    els.btnRandom.addEventListener('click', () => {
      setStateName('randomized', els);
      applyAndShow(createRandomState(), getDisplay, getReadout, setLastState, els);
    });
  }

  if (els.btnAllOn) {
    els.btnAllOn.addEventListener('click', () => {
      setStateName('all leds on', els);
      applyAndShow(createAllOnState(), getDisplay, getReadout, setLastState, els);
    });
  }

  if (els.btnIdle) {
    els.btnIdle.addEventListener('click', () => {
      setStateName('idle', els);
      setLastState(null);
      clearLedOverrides(getDisplay(), getReadout());
      getDisplay().showIdle();
      getReadout().showIdle();
      setConfigPreviewMessage('Idle view: no state currently rendered.', els);
    });
  }

  if (els.btnRemoveAllSeals) {
    els.btnRemoveAllSeals.addEventListener('click', () => {
      removeAllSeals(getDisplay(), getReadout());
      refreshSealToggleActive(els);
    });
  }

  if (els.btnResetSeals) {
    els.btnResetSeals.addEventListener('click', () => {
      resetSeals(getDisplay(), getReadout());
      refreshSealToggleActive(els);
    });
  }

  if (els.sealToggleGrid) {
    els.sealToggleGrid.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const level = target.dataset.sealLevel;
      const side = target.dataset.sealSide;
      if (!level || !side) return;
      toggleSeal({ side: side as 'north' | 'east' | 'south' | 'west', level: level as 'top' | 'middle' | 'bottom' }, getDisplay(), getReadout());
      refreshSealToggleActive(els);
    });
  }

  if (els.btnEmpty) {
    // `#btn-empty` is the EMPTY baseline trigger for `.claude/skills/darktower-3d-perf`.
    // If you change the handler so a click no longer puts the renderer in a fully-off state, update SKILL.md.
    els.btnEmpty.addEventListener('click', () => {
      setStateName('empty state', els);
      applyAndShow(createEmptyState(), getDisplay, getReadout, setLastState, els);
    });
  }

  if (els.btnCalibrate) {
    els.btnCalibrate.addEventListener('click', () => {
      setStateName('calibrating…', els);
      if (els.calibratingMsg) els.calibratingMsg.hidden = false;
      applyAndShow(createCalibrationCommandState(), getDisplay, getReadout, setLastState, els);
    });
  }

  populateSequenceSelect(els);
  if (els.btnTriggerSequence && els.selSequence) {
    els.btnTriggerSequence.addEventListener('click', () => {
      const sel = els.selSequence;
      if (!sel) return;
      const sequenceId = Number(sel.value);
      if (!Number.isFinite(sequenceId) || sequenceId === 0) return;
      const meta = SEQUENCE_METADATA[sel.options[sel.selectedIndex].dataset.name as keyof typeof SEQUENCE_METADATA];
      const label = meta ? formatSequenceName(meta.name) : `sequence 0x${sequenceId.toString(16)}`;
      setStateName(label, els);
      getDisplay().showIdle();
      getReadout().showIdle();
      applyAndShow(createSequenceState(sequenceId, getLastState() ?? undefined), getDisplay, getReadout, setLastState, els);
    });
  }

  if (els.drumRotateGrid) {
    els.drumRotateGrid.addEventListener('click', (event) => {
      const target = event.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const level = target.dataset.drumLevel;
      const sideAttr = target.dataset.drumSide;
      if (!level || sideAttr === undefined) return;
      const drumIndex = DRUM_INDEX_BY_LEVEL[level];
      const side = Number(sideAttr);
      if (drumIndex === undefined || Number.isNaN(side)) return;

      const base = getLastState() ?? createReadmeExampleState();
      const next: TowerState = {
        ...base,
        drum: base.drum.map((d, i) =>
          i === drumIndex ? { ...d, position: side, calibrated: true } : { ...d },
        ) as TowerState['drum'],
      };
      setStateName(`drum ${level} → ${'NESW'[side]}`, els);
      applyAndShow(next, getDisplay, getReadout, setLastState, els);
      refreshDrumRotateActive(next, els);
    });
  }
}

function formatSequenceName(name: string): string {
  // Split camelCase and insert spaces before uppercase letters or digit runs
  return name
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

function populateSequenceSelect(els: DomElements): void {
  const sel = els.selSequence;
  if (!sel || sel.options.length > 0) return;
  const entries = Object.values(SEQUENCE_METADATA).sort((a, b) => a.id - b.id);
  for (const meta of entries) {
    const opt = document.createElement('option');
    opt.value = String(meta.id);
    opt.dataset.name = meta.name;
    const hasAudio = meta.id in SEQUENCE_AUDIO_MAP;
    opt.textContent = (hasAudio ? '🔊 ' : '') + formatSequenceName(meta.name);
    if (meta.name === 'monthStarted') opt.selected = true;
    sel.appendChild(opt);
  }
}

export function refreshSealToggleActive(els: DomElements): void {
  if (!els.sealToggleGrid) return;
  const broken = getTower().getBrokenSeals();
  const brokenKeys = new Set(broken.map((s) => `${s.side}:${s.level}`));
  const buttons = els.sealToggleGrid.querySelectorAll<HTMLButtonElement>('button[data-seal-level]');
  buttons.forEach((btn) => {
    const level = btn.dataset.sealLevel;
    const side = btn.dataset.sealSide;
    if (!level || !side) return;
    btn.classList.toggle('active', brokenKeys.has(`${side}:${level}`));
  });
}

export function refreshDrumRotateActive(state: TowerState, els: DomElements): void {
  if (!els.drumRotateGrid) return;
  const buttons = els.drumRotateGrid.querySelectorAll<HTMLButtonElement>('button[data-drum-level]');
  buttons.forEach((btn) => {
    const level = btn.dataset.drumLevel;
    const side = Number(btn.dataset.drumSide);
    const idx = level ? DRUM_INDEX_BY_LEVEL[level] : undefined;
    if (idx === undefined || Number.isNaN(side)) return;
    btn.classList.toggle('active', state.drum[idx]?.position === side);
  });
}

export function initInitialState(
  getDisplay: () => TowerDisplay,
  getReadout: () => TowerStateReadout,
  setLastState: (s: TowerState | null) => void,
  els: DomElements
): void {
  syncConfigSelectorVisibility(getDisplay, els);
  if (els.stateBadge) els.stateBadge.textContent = 'empty';
  applyAndShow(createEmptyState(), getDisplay, getReadout, setLastState, els, false);
}
