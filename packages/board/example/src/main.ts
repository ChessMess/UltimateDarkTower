import { BoardRenderView } from '../../src/index';
import type { TokenSelection } from '../../src/index';
import { TowerRenderView } from 'ultimatedarktowerdisplay';
import { attachBoard3D } from '../../src/plugin/index';
import type { Board3DHandle } from '../../src/plugin/index';

const app = document.getElementById('app');
if (!app) throw new Error('#app not found');

// Layout: focus controls on top; the 3D board scene (with the docked editing UI as a HUD
// overlay); then the 2D map + readout.
const controls = document.createElement('div');
const scene = document.createElement('div');
scene.className = 'scene';
const columns = document.createElement('div');
columns.className = 'columns';
const mapHost = document.createElement('div');
mapHost.className = 'map';
const side = document.createElement('div');
side.className = 'side';
const selectionInfo = document.createElement('p');
selectionInfo.className = 'selection';
selectionInfo.textContent = 'Click a token (2D or 3D) to select it; use the palette to add one.';
const pre = document.createElement('pre');
side.append(selectionInfo, pre);
columns.append(mapHost, side);
app.append(controls, scene, columns);

const logSelection = (sel: TokenSelection): void => {
  selectionInfo.textContent = `Selected ${sel.kind}: ${sel.id} @ ${sel.location}`;
  // eslint-disable-next-line no-console
  console.log('token selected', sel);
};

// 3D board first so its overlay HUD can host the editing UI (the real docking seam).
const tower = new TowerRenderView({ container: scene, modelUrl: './tower.glb', overlay: true });

// 2D map + readout + shared focus controls + the dockable editing UI (the three-free `.` entry).
// The UI mounts into Display's overlay container — `src/ui` never imports Display; the example
// just passes that element as the host.
const view = new BoardRenderView({
  mapContainer: mapHost,
  controlsContainer: controls,
  uiContainer: tower.view3D ? tower.getOverlayContainer() : undefined,
  ui: {
    panels: {
      palette: { corner: 'tl' },
      inspector: { corner: 'tr' },
      summary: { corner: 'br' },
    },
    // The palette's Hero + Monument categories are roster-driven from UDT's re-exported `HEROES` /
    // `MONUMENTS`; monument art resolves under `tokens/monuments/<kebab(id)>.png` (no hero art exists,
    // so heroes use the programmatic fallback). Pass `ui.rosters` to override either list.
  },
  assetBaseUrl: './tokens/',
  boardImageUrl: './board.png',
  onTokenSelect: logSelection,
  // Fan a focus change from the controls/2D out to the 3D camera, then refresh.
  onFocusChange: (focus) => {
    board3d?.setFocus(focus);
    refresh();
  },
});

const refresh = (): void => {
  pre.textContent = view.readout.getText();
};

// Seed a setup that exercises real art (foes/adversary/monument/skull/wasteland) + the hero fallback.
const board = view.controller;
board.placeHero('hero-1', 'Broken Lands', 'north'); // no hero art → labeled fallback
board.spawnFoe('foe-1', 'Brigands', 'Dayside');
board.spawnFoe('foe-2', 'Dragons', 'Radiant Mountains');
board.spawnFoe('foe-3', 'Frost Trolls', 'Lower Ice Fangs');
board.selectAdversary("Utuk'Ku");
board.placeAdversary('Upper Ice Fangs');
board.addSkull('Dayside', 2);
board.setMonument("Egan's End", 'argent-oak'); // monument shown in place of the building
board.setSpaceMarker('Broken Lands', 'wasteland', true);

let board3d: Board3DHandle | undefined;

// 3D board: a Display ScenePlugin attached to a live Tower3DView. The tower GLB is example-only
// (in example/public/, never bundled into the npm tarball). Token clicks + armed space picks are
// fed into the SAME shared stores the 2D map uses, so the docked UI reacts to both renderers.
if (tower.view3D) {
  board3d = attachBoard3D(tower.view3D, {
    assetBaseUrl: './tokens/',
    boardImageUrl: './board.png', // render our own board (hides Display's placeholder)
    boardState: board.getState(),
    locationPick: view.locationPick, // armed space-pick from the palette works in 3D too
    onTokenSelect: (sel) => {
      view.selection.set(sel); // shared selection → the inspector
      logSelection(sel);
    },
    // The plugin reflects camera side changes here (it's the focus source of truth in 3D). This
    // demo keeps the focus CONTROLS canonical so the 2D/readout can show `all` (the 3D camera
    // always faces a side, which has no `all` equivalent), so we just log them.
    onFocusChange: (focus) => {
      // eslint-disable-next-line no-console
      console.log('3D camera side →', focus.kingdom);
    },
  });
}

// Keep the 3D plugin in sync with the controller (BoardRenderView re-renders the 2D map/readout
// itself; here we also push state into the 3D plugin + refresh the readout text).
view.controller.subscribe((event) => {
  if (event.type !== 'change') return;
  refresh();
  board3d?.setBoardState(event.state);
});

refresh();
