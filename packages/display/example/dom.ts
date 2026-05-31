export interface DomElements {
  banner: HTMLElement | null;
  selConfigType: HTMLSelectElement | null;
  configPreview: HTMLTextAreaElement | null;
  btnApplyConfig: HTMLButtonElement | null;
  btnCopyConfig: HTMLButtonElement | null;
  towerContainer: HTMLElement;
  readoutContainer: HTMLElement;
  stateBadge: HTMLElement | null;
  rngHemi: HTMLInputElement | null;
  rngKey: HTMLInputElement | null;
  rngFill: HTMLInputElement | null;
  rngExposure: HTMLInputElement | null;
  rngKeyX: HTMLInputElement | null;
  rngKeyY: HTMLInputElement | null;
  rngKeyZ: HTMLInputElement | null;
  lblHemi: HTMLElement | null;
  lblKey: HTMLElement | null;
  lblFill: HTMLElement | null;
  lblExposure: HTMLElement | null;
  lblKeyX: HTMLElement | null;
  lblKeyY: HTMLElement | null;
  lblKeyZ: HTMLElement | null;
  debug3dCheckbox: HTMLInputElement | null;
  chkGroundDisc: HTMLInputElement | null;
  chkBoardDisc: HTMLInputElement | null;
  inpSkyboxUrl: HTMLInputElement | null;
  chkTowerAudio: HTMLInputElement | null;
  chkZoomToCursor: HTMLInputElement | null;
  chkPreserveViewOnSideSelect: HTMLInputElement | null;
  rngBloomStrength: HTMLInputElement | null;
  rngBloomRadius: HTMLInputElement | null;
  rngBloomThreshold: HTMLInputElement | null;
  lblBloomStrength: HTMLElement | null;
  lblBloomRadius: HTMLElement | null;
  lblBloomThreshold: HTMLElement | null;
  rngUndersideLight: HTMLInputElement | null;
  lblUndersideLight: HTMLElement | null;
  rngBoardSize: HTMLInputElement | null;
  lblBoardSize: HTMLElement | null;
  rngBoardBrightness: HTMLInputElement | null;
  lblBoardBrightness: HTMLElement | null;
  rngBoardThickness: HTMLInputElement | null;
  lblBoardThickness: HTMLElement | null;
  chkBoardBottomCap: HTMLInputElement | null;
  btnBoardEdgeWood: HTMLButtonElement | null;
  btnBoardEdgeNeoprene: HTMLButtonElement | null;
  btnEntrance: HTMLElement | null;
  btnReadme: HTMLElement | null;
  btnRandom: HTMLElement | null;
  btnAllOn: HTMLElement | null;
  btnIdle: HTMLElement | null;
  btnRemoveAllSeals: HTMLElement | null;
  btnResetSeals: HTMLElement | null;
  btnEmpty: HTMLElement | null;
  btnCalibrate: HTMLButtonElement | null;
  calibratingMsg: HTMLElement | null;
  selSequence: HTMLSelectElement | null;
  btnTriggerSequence: HTMLButtonElement | null;
  drumRotateGrid: HTMLElement | null;
  sealToggleGrid: HTMLElement | null;
  renderedPanel: HTMLElement | null;
  toolbarEl: Element | null;
  btnView2d: HTMLButtonElement | null;
  btnView3d: HTMLButtonElement | null;
  btnView2d3d: HTMLButtonElement | null;
  btnPopOut: HTMLButtonElement | null;
}

export function queryDom(): DomElements {
  const towerContainer = document.getElementById('tower');
  const readoutContainer = document.getElementById('readout-container');

  if (!(towerContainer instanceof HTMLElement)) {
    throw new Error('Missing #tower container');
  }
  if (!(readoutContainer instanceof HTMLElement)) {
    throw new Error('Missing #readout-container');
  }

  return {
    banner: document.getElementById('error-banner'),
    selConfigType: document.getElementById('sel-config-type') as HTMLSelectElement | null,
    configPreview: document.getElementById('config-preview') as HTMLTextAreaElement | null,
    btnApplyConfig: document.getElementById('btn-apply-config') as HTMLButtonElement | null,
    btnCopyConfig: document.getElementById('btn-copy-config') as HTMLButtonElement | null,
    towerContainer,
    readoutContainer,
    stateBadge: document.getElementById('state-badge'),
    rngHemi: document.getElementById('rng-hemi') as HTMLInputElement | null,
    rngKey: document.getElementById('rng-key') as HTMLInputElement | null,
    rngFill: document.getElementById('rng-fill') as HTMLInputElement | null,
    rngExposure: document.getElementById('rng-exposure') as HTMLInputElement | null,
    rngKeyX: document.getElementById('rng-key-x') as HTMLInputElement | null,
    rngKeyY: document.getElementById('rng-key-y') as HTMLInputElement | null,
    rngKeyZ: document.getElementById('rng-key-z') as HTMLInputElement | null,
    lblHemi: document.getElementById('lbl-hemi'),
    lblKey: document.getElementById('lbl-key'),
    lblFill: document.getElementById('lbl-fill'),
    lblExposure: document.getElementById('lbl-exposure'),
    lblKeyX: document.getElementById('lbl-key-x'),
    lblKeyY: document.getElementById('lbl-key-y'),
    lblKeyZ: document.getElementById('lbl-key-z'),
    debug3dCheckbox: document.getElementById('chk-debug3d') as HTMLInputElement | null,
    chkGroundDisc: document.getElementById('chk-ground-disc') as HTMLInputElement | null,
    chkBoardDisc: document.getElementById('chk-board-disc') as HTMLInputElement | null,
    inpSkyboxUrl: document.getElementById('inp-skybox-url') as HTMLInputElement | null,
    chkTowerAudio: document.getElementById('chk-tower-audio') as HTMLInputElement | null,
    chkZoomToCursor: document.getElementById('chk-zoom-to-cursor') as HTMLInputElement | null,
    chkPreserveViewOnSideSelect: document.getElementById('chk-preserve-view-on-side-select') as HTMLInputElement | null,
    rngBloomStrength: document.getElementById('rng-bloom-strength') as HTMLInputElement | null,
    rngBloomRadius: document.getElementById('rng-bloom-radius') as HTMLInputElement | null,
    rngBloomThreshold: document.getElementById('rng-bloom-threshold') as HTMLInputElement | null,
    lblBloomStrength: document.getElementById('lbl-bloom-strength'),
    lblBloomRadius: document.getElementById('lbl-bloom-radius'),
    lblBloomThreshold: document.getElementById('lbl-bloom-threshold'),
    rngUndersideLight: document.getElementById('rng-underside-light') as HTMLInputElement | null,
    lblUndersideLight: document.getElementById('lbl-underside-light'),
    rngBoardSize: document.getElementById('rng-board-size') as HTMLInputElement | null,
    lblBoardSize: document.getElementById('lbl-board-size'),
    rngBoardBrightness: document.getElementById('rng-board-brightness') as HTMLInputElement | null,
    lblBoardBrightness: document.getElementById('lbl-board-brightness'),
    rngBoardThickness: document.getElementById('rng-board-thickness') as HTMLInputElement | null,
    lblBoardThickness: document.getElementById('lbl-board-thickness'),
    chkBoardBottomCap: document.getElementById('chk-board-bottom-cap') as HTMLInputElement | null,
    btnBoardEdgeWood: document.getElementById('btn-board-edge-wood') as HTMLButtonElement | null,
    btnBoardEdgeNeoprene: document.getElementById('btn-board-edge-neoprene') as HTMLButtonElement | null,
    btnEntrance: document.getElementById('btn-entrance'),
    btnReadme: document.getElementById('btn-readme'),
    btnRandom: document.getElementById('btn-random'),
    btnAllOn: document.getElementById('btn-allon'),
    btnIdle: document.getElementById('btn-idle'),
    btnRemoveAllSeals: document.getElementById('btn-remove-all-seals'),
    btnResetSeals: document.getElementById('btn-reset-seals'),
    btnEmpty: document.getElementById('btn-empty'),
    btnCalibrate: document.getElementById('btn-calibrate') as HTMLButtonElement | null,
    calibratingMsg: document.getElementById('calibrating-message'),
    selSequence: document.getElementById('sel-sequence') as HTMLSelectElement | null,
    btnTriggerSequence: document.getElementById('btn-trigger-sequence') as HTMLButtonElement | null,
    drumRotateGrid: document.getElementById('drum-rotate-grid'),
    sealToggleGrid: document.getElementById('seal-toggle-grid'),
    renderedPanel: document.getElementById('rendered-panel'),
    toolbarEl: document.getElementById('sidebar'),
    btnView2d: document.getElementById('btn-view-2d') as HTMLButtonElement | null,
    btnView3d: document.getElementById('btn-view-3d') as HTMLButtonElement | null,
    btnView2d3d: document.getElementById('btn-view-2d3d') as HTMLButtonElement | null,
    btnPopOut: document.getElementById('btn-pop-out') as HTMLButtonElement | null,
  };
}
