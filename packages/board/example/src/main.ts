import { BoardRenderView, mountBoardUI, applyBoardCommand } from '../../src/index';

const container = document.getElementById('app');
if (!container) throw new Error('#app not found');

// Headless board state + deterministic readout — works with zero 3D deps.
const board = new BoardRenderView();

// Seed a couple of tokens so the readout shows something.
board.controller.dispatch({
  type: 'addToken',
  token: { id: 'hero-1', kind: 'hero', location: 'Broken Lands' },
});

const pre = document.createElement('pre');
pre.textContent = board.readout.getText();
container.appendChild(pre);

mountBoardUI(container, board.controller);

// `applyBoardCommand` is re-exported for hosts that want the pure reducer.
void applyBoardCommand;

// ---------------------------------------------------------------------------
// 3D path — uncomment once you supply a tower `modelUrl` and the Display release
// carrying `anchorToWorld` lands (spec §2 / §7 / §12-Q2). It pulls in three +
// ultimatedarktowerdisplay, so it is intentionally off in the scaffold demo.
//
// import { TowerRenderView, attachScenePlugin } from 'ultimatedarktowerdisplay';
// import { Board3DPlugin } from '../../src/plugin/index';
//
// const view = new TowerRenderView({ container, modelUrl: '/tower.glb', overlay: true });
// view.view3D?.setBoardDiscEnabled(false); // hide Display's board texture (disc mesh stays)
// if (view.view3D) {
//   attachScenePlugin(
//     view.view3D,
//     new Board3DPlugin({ boardState: board.controller.getState(), assetBaseUrl: '/tokens/' })
//   );
// }
// ---------------------------------------------------------------------------
