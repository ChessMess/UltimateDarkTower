// Typed handles to every shell element the controllers touch. One query pass at
// boot; everything downstream reads from this struct.

function byId<T extends HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`#${id} not found`);
  return el as T;
}

export interface DomElements {
  banner: HTMLElement;
  grid: HTMLElement;
  sidebar: HTMLElement;

  // Hero / render stage
  hero: HTMLElement;
  renderedPanel: HTMLElement;
  heroOverlay: HTMLElement;
  scene2d: HTMLElement;
  scene3d: HTMLElement;
  mapHost: HTMLElement;
  mapControls: HTMLElement;

  // Display-mode pills
  btnView2d: HTMLButtonElement;
  btnView3d: HTMLButtonElement;
  btnView2d3d: HTMLButtonElement;
  btnViewPip: HTMLButtonElement;
  btnPipSwap: HTMLButtonElement;
  btnPopOut: HTMLButtonElement;

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

    hero: document.querySelector('.app-hero') as HTMLElement,
    renderedPanel: byId('rendered-panel'),
    heroOverlay: byId('hero-overlay'),
    scene2d: byId('scene-2d'),
    scene3d: byId('scene-3d'),
    mapHost: byId('map-2d-host'),
    mapControls: byId('map-2d-controls'),

    btnView2d: byId('btn-view-2d'),
    btnView3d: byId('btn-view-3d'),
    btnView2d3d: byId('btn-view-2d3d'),
    btnViewPip: byId('btn-view-pip'),
    btnPipSwap: byId('btn-pip-swap'),
    btnPopOut: byId('btn-pop-out'),

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
