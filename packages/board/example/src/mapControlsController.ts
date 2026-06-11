// N / E / S / W + All control bar stacked above the 2D map, matching the 3D
// view's built-in bar (same look + active-state behaviour via createControlBar).
// N/E/S/W zoom the map to that kingdom; All restores the whole-board view. These
// drive the shared focus, so the readout and the 3D camera follow.
import type { BoardFocus, BoardKingdom, BoardRenderView } from '../../src/index';
import { createControlBar } from './controlBar';
import type { DomElements } from './dom';

const BUTTONS: { label: string; value: BoardKingdom | 'all' }[] = [
  { label: 'N', value: 'north' },
  { label: 'E', value: 'east' },
  { label: 'S', value: 'south' },
  { label: 'W', value: 'west' },
  { label: 'All', value: 'all' },
];

export interface MapControlsHandle {
  /** Re-render the pressed state when the focus changes elsewhere. */
  reflect(focus: BoardFocus): void;
}

export function initMapControls(els: DomElements, view: BoardRenderView): MapControlsHandle {
  const bar = createControlBar(
    els.mapControls,
    BUTTONS.map(({ label, value }) => ({
      key: value,
      label,
      onClick: () => {
        // Clear any manual wheel/drag zoom so the kingdom (or whole board) frames cleanly.
        view.setFocus({ ...view.focus, kingdom: value });
        view.map2d?.resetView();
      },
    }))
  );

  bar.setActive(view.focus.kingdom);
  return { reflect: (focus) => bar.setActive(focus.kingdom) };
}
