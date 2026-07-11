// Typed handles to the demo's page-chrome elements (the render stage is owned by
// BoardStageView and mounts itself into #board-stage). One query pass at boot.

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
}

export interface DomElements {
  banner: HTMLElement;
  grid: HTMLElement;
  sidebar: HTMLElement;

  // The stage mounts into here.
  boardStage: HTMLElement;

  // Instructions
  instructions: HTMLElement;
  btnInstructionsToggle: HTMLButtonElement;

  // Presets
  btnSeed: HTMLButtonElement;
  btnRandom: HTMLButtonElement;
  btnClear: HTMLButtonElement;

  // Quick edit
  selQuickFoe: HTMLSelectElement;
  btnAddFoe: HTMLButtonElement;
  btnAddSkull: HTMLButtonElement;
  btnRemoveSkull: HTMLButtonElement;

  // Panel-visibility toggles
  chkPalette: HTMLInputElement;
  chkInspector: HTMLInputElement;

  // Config column
  readout: HTMLElement;
  configPreview: HTMLTextAreaElement;
  btnCopyConfig: HTMLButtonElement;
  btnApplyConfig: HTMLButtonElement;
  btnResetBoard: HTMLButtonElement;
}

export function queryDom(): DomElements {
  return {
    banner: byId('error-banner'),
    grid: document.querySelector('.app-grid') as HTMLElement,
    sidebar: byId('sidebar'),

    boardStage: byId('board-stage'),

    instructions: byId('instructions'),
    btnInstructionsToggle: byId('btn-instructions-toggle'),

    btnSeed: byId('btn-preset-seed'),
    btnRandom: byId('btn-preset-random'),
    btnClear: byId('btn-preset-clear'),

    selQuickFoe: byId('sel-quick-foe'),
    btnAddFoe: byId('btn-quick-add-foe'),
    btnAddSkull: byId('btn-quick-add-skull'),
    btnRemoveSkull: byId('btn-quick-remove-skull'),

    chkPalette: byId('chk-panel-palette'),
    chkInspector: byId('chk-panel-inspector'),

    readout: byId('readout'),
    configPreview: byId('config-preview'),
    btnCopyConfig: byId('btn-copy-config'),
    btnApplyConfig: byId('btn-apply-config'),
    btnResetBoard: byId('btn-reset-board'),
  };
}
