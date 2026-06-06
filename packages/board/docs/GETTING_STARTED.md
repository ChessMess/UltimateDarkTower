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

The `.` entry pulls **no** `three` / Display. For the 3D board see
[DISPLAY_INTEGRATION.md](./DISPLAY_INTEGRATION.md).
