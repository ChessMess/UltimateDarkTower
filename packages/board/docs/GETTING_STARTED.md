# Getting Started

> Scaffold stub.

```bash
npm install
npm run ci
npm run dev:example
```

```ts
import { BoardRenderView } from 'ultimatedarktowerboard';

const board = new BoardRenderView();
board.controller.dispatch({
  type: 'addToken',
  token: { id: 'hero-1', kind: 'hero', location: 'Broken Lands' },
});
console.log(board.readout.getText());
```

The `.` entry pulls **no** `three` / Display. For the 3D board see
[DISPLAY_INTEGRATION.md](./DISPLAY_INTEGRATION.md).
