import type { BoardStateController } from '../state/controller';

/**
 * Mounts the dockable editing UI (palette / inspector / summary) into a host
 * element. Vanilla TS + DOM, family-consistent with Display's overlay (spec
 * §12-Q5). Scaffold stub: renders a placeholder; returns an unmount function.
 */
export function mountBoardUI(host: HTMLElement, _controller: BoardStateController): () => void {
  const root = document.createElement('div');
  root.className = 'udt-board-ui';
  root.textContent = 'Board UI (scaffold placeholder)';
  host.appendChild(root);
  return () => {
    root.remove();
  };
}
