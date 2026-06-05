// `./plugin` entry (`ultimatedarktowerboard/plugin`) — the 3D board.
//
// This is the ONLY module allowed to depend on `three` / `ultimatedarktowerdisplay`.
// Keeping the imports type-only here means the scaffold build/test needs no
// `three` runtime; flip them to value imports once you start adding meshes.
import type {
  ScenePlugin,
  ScenePluginContext,
  ScenePluginModelInfo,
} from 'ultimatedarktowerdisplay';
import type { BoardState } from '../state/boardState';

export interface Board3DPluginOptions {
  /** Initial board state to render (the plugin reads; the host owns mutations). */
  boardState?: BoardState;
  /** Base URL token/board images are resolved against (not bundled into JS). */
  assetBaseUrl?: string;
}

/**
 * The 3D in-scene board. Implements Display's `ScenePlugin`, so it attaches via
 * `attachScenePlugin(view.view3D, new Board3DPlugin(...))` and replaces the
 * placeholder board texture (call `view.view3D?.setBoardDiscEnabled(false)` first).
 *
 * Scaffold stub: it satisfies the contract and wires the model-loaded hook, but
 * builds no geometry yet. Real token placement needs Display's `anchorToWorld`
 * and UDT's `BOARD_ANCHORS`, neither of which is shipped (spec §2 / §12-Q2).
 */
export class Board3DPlugin implements ScenePlugin {
  readonly id = 'ultimatedarktowerboard:board3d';

  private ctx: ScenePluginContext | null = null;
  private unsubscribeModelLoaded: (() => void) | null = null;
  private readonly options: Board3DPluginOptions;

  constructor(options: Board3DPluginOptions = {}) {
    this.options = options;
  }

  attach(ctx: ScenePluginContext): void {
    this.ctx = ctx;
    // Do board placement once the tower GLB is in the scene.
    this.unsubscribeModelLoaded = ctx.onModelLoaded((info) => this.onModelLoaded(info));
  }

  onModelLoaded(_info: ScenePluginModelInfo): void {
    // TODO(scaffold): build the board group sized/positioned to the loaded tower
    // and place tokens via Display's anchorToWorld + UDT BOARD_ANCHORS.
    void this.options;
  }

  dispose(): void {
    this.unsubscribeModelLoaded?.();
    this.unsubscribeModelLoaded = null;
    this.ctx = null;
  }
}

export type { ScenePlugin } from 'ultimatedarktowerdisplay';
