import { queryDom } from './dom';
import { initRendererController, getDisplay, getReadout, setLastState, onViewChange } from './rendererController';
import { initLightingController } from './lightingController';
import { initCameraTuneController, syncCameraTuneControls } from './cameraTuneController';
import { initStateEditor, initInitialState, refreshDrumRotateActive } from './stateEditor';
import { initConfigEditor, syncConfigSelectorVisibility } from './configEditor';
import { initLayoutManager } from './layoutManager';
import { initPhysicsController, getPhysicsHandle, syncSlidersFromConfig } from './physicsController';
import { initPopOutController } from './popOutController';
import { initPanelCollapseController } from './panelCollapseController';

const els = queryDom();

initRendererController(els);

initConfigEditor(
  getDisplay,
  getReadout,
  setLastState,
  (state) => refreshDrumRotateActive(state, els),
  getPhysicsHandle,
  syncSlidersFromConfig,
  els,
);

initLightingController(getDisplay, els);

initCameraTuneController(getDisplay, els);

initStateEditor(getDisplay, getReadout, setLastState, els);

initPhysicsController();

onViewChange(() => {
  syncConfigSelectorVisibility(getDisplay, els);
  syncCameraTuneControls(getDisplay, els);
});

initInitialState(getDisplay, getReadout, setLastState, els);

initLayoutManager(els);

initPopOutController(els);

initPanelCollapseController();

window.__udtdExampleReady = true;
