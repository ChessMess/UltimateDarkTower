// Main entry (`ultimatedarktowerboard`) — headless core + readout/2D renderers +
// UDT data re-exports. Imports NO `three` and NO `ultimatedarktowerdisplay`.
// The 3D board lives behind the `./plugin` subpath so this entry stays light.
//
// Guard: nothing reachable from here may import `three` or Display. A CI grep
// (see .github/workflows/ci.yml) enforces it.

export * from './state/boardState';
export * from './state/commands';
export * from './state/reducer';
export * from './state/controller';
export * from './state/events';
export * from './state/serialize';
export * from './state/selectors';

export * from './renderers/shared';
export * from './renderers/readout';
export * from './renderers/map2d';

export * from './view/boardRenderView';
export * from './view/focusControls';
export * from './ui';

export * from './data/udtReexports';
export * from './data/boardDefinition';
