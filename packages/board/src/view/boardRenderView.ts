import { BoardStateController } from '../state/controller';
import type { BoardState } from '../state/boardState';
import { createDefaultBoardState } from '../state/boardState';
import { BoardReadout } from '../renderers/readout';
import { BoardMap2D } from '../renderers/map2d';
import type { TokenSelection } from '../renderers/map2d';
import type { BoardFocus } from '../renderers/shared';
import { DEFAULT_FOCUS, focusEquals } from '../renderers/shared';
import { mountFocusControls, syncFocusControls } from './focusControls';
import {
  createLocationPickStore,
  createSelectionStore,
  mountBoardUI,
  type BoardUIHandle,
  type BoardUIOptions,
  type LocationPickStore,
  type SelectionStore,
} from '../ui';

export interface BoardRenderViewOptions {
  initialState?: BoardState;
  /** Controller ownership mode (default `self`). */
  mode?: 'self' | 'host';
  /** When provided, a `BoardMap2D` is built and rendered into this element. */
  mapContainer?: HTMLElement;
  /** When provided, the shared focus controls are mounted into this element. */
  controlsContainer?: HTMLElement;
  /** When provided, the dockable editing UI is mounted into this element. */
  uiContainer?: HTMLElement;
  /** Config for the editing UI (panels/rosters/etc.); the controller + stores are supplied by the view. */
  ui?: Omit<BoardUIOptions, 'controller' | 'selection' | 'locationPick'>;
  /** Token-art root for the 2D map (loaded at runtime via `assetBaseUrl`). */
  assetBaseUrl?: string;
  /** Base-layer board image for the 2D map. */
  boardImageUrl?: string;
  /** Forwarded to the 2D map: fired when a token is clicked (in addition to updating `selection`). */
  onTokenSelect?: (selection: TokenSelection) => void;
  /** Fired whenever the focus changes (from `setFocus` or a control click). */
  onFocusChange?: (focus: BoardFocus) => void;
}

/**
 * Facade tying the controller to the (three-free) renderers and the shared focus
 * controls. Re-renders the readout + 2D map on every state change, and fans focus
 * changes out to all focus-aware renderers + the controls.
 */
export class BoardRenderView {
  readonly controller: BoardStateController;
  readonly readout = new BoardReadout();
  readonly map2d?: BoardMap2D;
  /** The active token selection — written by the renderers, read by the editing UI. */
  readonly selection: SelectionStore = createSelectionStore();
  /** The armed add-placement channel — shared by the renderers (board click) and the palette. */
  readonly locationPick: LocationPickStore = createLocationPickStore();

  private currentFocus: BoardFocus = DEFAULT_FOCUS;
  private readonly controlsContainer?: HTMLElement;
  private readonly onFocusChange?: (focus: BoardFocus) => void;
  private readonly unsubscribe: () => void;
  private unmountControls?: () => void;
  private ui?: BoardUIHandle;

  constructor(options: BoardRenderViewOptions = {}) {
    this.controller = new BoardStateController({
      initial: options.initialState ?? createDefaultBoardState(),
      mode: options.mode,
    });
    this.onFocusChange = options.onFocusChange;
    this.controlsContainer = options.controlsContainer;

    if (options.mapContainer) {
      this.map2d = new BoardMap2D(options.mapContainer, {
        assetBaseUrl: options.assetBaseUrl,
        boardImageUrl: options.boardImageUrl,
        // Route a token click into the shared selection store AND the user callback.
        onTokenSelect: (selection) => {
          this.selection.set(selection);
          options.onTokenSelect?.(selection);
        },
        // The map drives the armed space-pick directly through the shared store.
        locationPick: this.locationPick,
      });
    }

    if (this.controlsContainer) {
      this.unmountControls = mountFocusControls(this.controlsContainer, {
        focus: this.currentFocus,
        onChange: (next) => this.setFocus(next),
      });
    }

    if (options.uiContainer) {
      this.ui = mountBoardUI(options.uiContainer, {
        controller: this.controller,
        selection: this.selection,
        locationPick: this.locationPick,
        ...options.ui,
      });
    }

    this.unsubscribe = this.controller.subscribe((event) => {
      if (event.type === 'change') this.renderAll(event.state);
    });

    this.renderAll(this.controller.getState());
  }

  get focus(): BoardFocus {
    return this.currentFocus;
  }

  setFocus(focus: BoardFocus): void {
    if (focusEquals(this.currentFocus, focus)) return;
    this.currentFocus = focus;
    this.renderAll(this.controller.getState());
    if (this.controlsContainer) syncFocusControls(this.controlsContainer, focus);
    this.onFocusChange?.(focus);
  }

  dispose(): void {
    this.unsubscribe();
    this.map2d?.dispose();
    this.unmountControls?.();
    this.unmountControls = undefined;
    this.ui?.dispose();
    this.ui = undefined;
  }

  private renderAll(state: BoardState): void {
    this.readout.render(state, this.currentFocus);
    this.map2d?.render(state, this.currentFocus);
  }
}
