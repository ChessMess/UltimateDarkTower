import { BoardStateController, createSelectionStore, createLocationPickStore, mountBoardUI } from '../src/index';

function setup() {
  const controller = new BoardStateController();
  const selection = createSelectionStore();
  const locationPick = createLocationPickStore();
  const host = document.createElement('div');
  const handle = mountBoardUI(host, { controller, selection, locationPick });
  return { controller, selection, locationPick, host, handle };
}

const $ = <T extends Element>(host: HTMLElement, sel: string): T => {
  const el = host.querySelector<T>(sel);
  if (!el) throw new Error(`missing ${sel}`);
  return el;
};

describe('Palette', () => {
  it('adds a foe only on Confirm, with the chosen type/status/location', () => {
    const { controller, host } = setup();
    const kind = $<HTMLSelectElement>(host, '.udt-palette-kind');
    kind.value = 'foe';
    kind.dispatchEvent(new Event('change'));
    $<HTMLSelectElement>(host, '.udt-palette-foe-type').value = 'Brigands';
    $<HTMLSelectElement>(host, '.udt-palette-foe-status').value = 'savage';

    $<HTMLButtonElement>(host, '.udt-palette-add').click();
    expect(Object.keys(controller.getState().foes)).toHaveLength(0); // no mutation before Confirm

    $<HTMLSelectElement>(host, '.udt-palette-location').value = 'Dayside';
    $<HTMLButtonElement>(host, '.udt-palette-confirm-btn').click();

    const foes = Object.values(controller.getState().foes);
    expect(foes).toEqual([{ foe: 'Brigands', location: 'Dayside', status: 'savage' }]);
  });

  it('a board-pick fills the location select; Confirm uses it', () => {
    const { controller, locationPick, host } = setup();
    $<HTMLButtonElement>(host, '.udt-palette-add').click(); // arms (default kind = foe)
    expect(locationPick.isArmed()).toBe(true);

    locationPick.pick('Radiant Mountains'); // simulate a 2D/3D space click
    expect($<HTMLSelectElement>(host, '.udt-palette-location').value).toBe('Radiant Mountains');

    $<HTMLButtonElement>(host, '.udt-palette-confirm-btn').click();
    expect(Object.values(controller.getState().foes)[0].location).toBe('Radiant Mountains');
    expect(locationPick.isArmed()).toBe(false); // disarmed after confirm
  });

  it('Cancel disarms with no mutation', () => {
    const { controller, locationPick, host } = setup();
    $<HTMLButtonElement>(host, '.udt-palette-add').click();
    $<HTMLButtonElement>(host, '.udt-palette-cancel-btn').click();
    expect(locationPick.isArmed()).toBe(false);
    expect(Object.keys(controller.getState().foes)).toHaveLength(0);
  });

  it('adds an adversary (select + place) on Confirm', () => {
    const { controller, host } = setup();
    const kind = $<HTMLSelectElement>(host, '.udt-palette-kind');
    kind.value = 'adversary';
    kind.dispatchEvent(new Event('change'));
    $<HTMLSelectElement>(host, '.udt-palette-adversary-id').value = "Utuk'Ku";
    $<HTMLButtonElement>(host, '.udt-palette-add').click();
    $<HTMLSelectElement>(host, '.udt-palette-location').value = 'Upper Ice Fangs';
    $<HTMLButtonElement>(host, '.udt-palette-confirm-btn').click();
    expect(controller.getState().adversary).toEqual({ id: "Utuk'Ku", location: 'Upper Ice Fangs' });
  });

  it('skull add targets only building spaces', () => {
    const { controller, host } = setup();
    const kind = $<HTMLSelectElement>(host, '.udt-palette-kind');
    kind.value = 'skull';
    kind.dispatchEvent(new Event('change'));
    $<HTMLButtonElement>(host, '.udt-palette-add').click();
    const loc = $<HTMLSelectElement>(host, '.udt-palette-location');
    // Only building locations present → no non-building space like "Broken Lands".
    const options = Array.from(loc.querySelectorAll('option')).map((o) => o.value);
    expect(options).toContain('Dayside'); // a Bazaar
    expect(options).not.toContain('Broken Lands'); // not a building
    loc.value = 'Dayside';
    $<HTMLButtonElement>(host, '.udt-palette-confirm-btn').click();
    expect(controller.getState().buildings['Dayside'].skulls).toBe(1);
  });

  it('Setup section dispatches setSelections', () => {
    const { controller, host } = setup();
    $<HTMLSelectElement>(host, '.udt-setup-difficulty').value = 'Heroic';
    $<HTMLInputElement>(host, '.udt-setup-allies').value = 'Gleb, Yana';
    $<HTMLButtonElement>(host, '.udt-setup-apply').click();
    expect(controller.getState().selections).toEqual({ difficulty: 'Heroic', allies: ['Gleb', 'Yana'] });
  });

  it('generateId mints non-colliding foe ids', () => {
    const { controller, host } = setup();
    controller.spawnFoe('foe-1', 'Oreks', 'Dayside');
    $<HTMLButtonElement>(host, '.udt-palette-add').click();
    $<HTMLSelectElement>(host, '.udt-palette-location').value = 'Dayside';
    $<HTMLButtonElement>(host, '.udt-palette-confirm-btn').click();
    expect(Object.keys(controller.getState().foes).sort()).toEqual(['foe-1', 'foe-2']);
  });
});
