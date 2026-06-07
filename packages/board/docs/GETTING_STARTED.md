# Getting Started

```bash
npm install
npm run ci
npm run dev:example
```

```ts
import { BoardRenderView } from 'ultimatedarktowerboard';

const board = new BoardRenderView();

// React to state changes (the firehose):
board.controller.on('change', ({ state }) => console.log(state));

// Mutate via named methods (or board.controller.dispatch({ type: 'placeHero', ... })):
board.controller.placeHero('hero-1', 'Broken Lands');

console.log(board.readout.getText());
```

## Editing UI (optional)

Mount the dockable palette / inspector / summary panels — they call only the controller's public command
API, so removing them changes nothing else:

```ts
const mapHost = document.querySelector('#map')!;
const uiHost = document.querySelector('#ui')!; // any element — or Display's getOverlayContainer()

const board = new BoardRenderView({ mapContainer: mapHost, uiContainer: uiHost });
// board.selection / board.locationPick are shared by the map and the UI.
```

Or standalone (bring your own stores):

```ts
import { BoardStateController, createSelectionStore, createLocationPickStore, mountBoardUI } from 'ultimatedarktowerboard';

const controller = new BoardStateController();
const ui = mountBoardUI(uiHost, { controller, selection: createSelectionStore(), locationPick: createLocationPickStore() });
```

The `.` entry — including the UI — pulls **no** `three` / Display. For the 3D board see
[DISPLAY_INTEGRATION.md](./DISPLAY_INTEGRATION.md).
