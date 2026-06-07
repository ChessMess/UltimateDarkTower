import { BoardStateController, createSelectionStore, mountBoardUI } from '../src/index';
import type { SelectionStore } from '../src/index';

function setup(): { controller: BoardStateController; selection: SelectionStore; host: HTMLElement } {
  const controller = new BoardStateController();
  const selection = createSelectionStore();
  const host = document.createElement('div');
  mountBoardUI(host, { controller, selection });
  return { controller, selection, host };
}

const $ = <T extends Element>(host: HTMLElement, sel: string): T => {
  const el = host.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

describe('Inspector', () => {
  it('shows an empty note with no selection', () => {
    const { host } = setup();
    expect(host.querySelector('.udt-inspector-empty')?.textContent).toMatch(/No token selected/);
  });

  it('edits a foe: status + remove call the right commands', () => {
    const { controller, selection, host } = setup();
    controller.spawnFoe('foe-1', 'Brigands', 'Dayside', 'ready');
    selection.set({ kind: 'foe', id: 'foe-1', location: 'Dayside' });

    const status = $<HTMLSelectElement>(host, '.udt-inspector-status');
    status.value = 'lethal';
    status.dispatchEvent(new Event('change'));
    expect(controller.getState().foes['foe-1'].status).toBe('lethal');

    $<HTMLButtonElement>(host, '.udt-inspector-remove').click();
    expect(controller.getState().foes['foe-1']).toBeUndefined();
    // After removal the inspector clears.
    expect(host.querySelector('.udt-inspector-empty')).not.toBeNull();
  });

  it('reflects a controller-driven move of the selected foe', () => {
    const { controller, selection, host } = setup();
    controller.spawnFoe('foe-1', 'Oreks', 'Dayside');
    selection.set({ kind: 'foe', id: 'foe-1', location: 'Dayside' });
    controller.moveFoe('foe-1', 'Radiant Mountains');
    expect($<HTMLSelectElement>(host, '.udt-inspector-move').value).toBe('Radiant Mountains');
  });

  it('edits a building: skull ± and destroy/restore', () => {
    const { controller, selection, host } = setup();
    selection.set({ kind: 'building', id: 'Dayside', location: 'Dayside' });

    $<HTMLButtonElement>(host, '.udt-inspector-skull-add').click();
    expect(controller.getState().buildings['Dayside'].skulls).toBe(1);
    expect($(host, '.udt-inspector-skull-count').textContent).toBe('1');

    $<HTMLButtonElement>(host, '.udt-inspector-destroy').click();
    expect(controller.getState().buildings['Dayside'].destroyed).toBe(true);
    // Now a Restore button replaces Destroy.
    expect(host.querySelector('.udt-inspector-restore')).not.toBeNull();

    const monument = $<HTMLInputElement>(host, '.udt-inspector-monument');
    monument.value = 'argent-oak';
    $<HTMLButtonElement>(host, '.udt-inspector-monument-set').click();
    expect(controller.getState().buildings['Dayside'].monument).toBe('argent-oak');
  });

  it('removes a marker', () => {
    const { controller, selection, host } = setup();
    controller.setSpaceMarker('Broken Lands', 'wasteland', true);
    selection.set({ kind: 'marker', id: 'wasteland', location: 'Broken Lands' });
    $<HTMLButtonElement>(host, '.udt-inspector-remove').click();
    expect(controller.getState().spaceMarkers['Broken Lands']).toBeUndefined();
  });
});
