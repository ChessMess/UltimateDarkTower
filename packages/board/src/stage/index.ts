// `./stage` entry (`ultimatedarktowerboard/stage`) — the batteries-included
// `BoardStageView`. Three-free in its STATIC graph: the 3D tower (Display + `three`)
// is reached only via a dynamic `import('../plugin/stageTower')`, so a 2D-only app
// can use this entry without ever loading `three`. The CI three-free guard passes
// unchanged (nothing here statically imports `three`/Display).

export { BoardStageView } from './boardStageView';
export type { BoardStageViewOptions } from './boardStageView';
export type { DisplayMode } from './displayMode';
export { BOARD_STAGE_CSS, injectStageStyles } from './styles';

// 3D adapter types surfaced for advanced wiring (the values live behind the `./plugin`
// entry / the lazy import; only the types are re-exported here).
export type { BoardTower3DOptions, BoardTower3DHandle } from '../plugin/stageTower';
