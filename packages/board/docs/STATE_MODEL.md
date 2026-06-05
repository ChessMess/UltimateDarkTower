# State Model

> Scaffold stub.

- **`BoardState`** — `{ version, tokens, spaceMarkers }`. `spaceMarkers` is the generalized
  form chosen over a `blighted`-only field (spec §12-Q6).
- **Commands** (`BoardCommand`) — `addToken` | `removeToken` | `moveToken` | `reset`.
- **Reducer** — `applyBoardCommand(state, command)`, pure, never mutates.
- **Controller** — `BoardStateController.dispatch(command)`; subscribe via `.on('stateChanged' | 'commandApplied', fn)`.
- **Save/load** — `saveState(state)` / `loadState(json)`, zod-v4 validated, versioned.

Expand the command vocabulary and `BoardState` fields as features land.
