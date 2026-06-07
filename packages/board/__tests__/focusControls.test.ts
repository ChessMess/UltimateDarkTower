import { mountFocusControls, syncFocusControls, DEFAULT_FOCUS } from '../src/index';
import type { BoardFocus } from '../src/index';

function clickButton(host: HTMLElement, label: string): void {
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === label);
  if (!button) throw new Error(`button "${label}" not found`);
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('mountFocusControls', () => {
  it('emits the new focus on a kingdom + angle click (composing via syncFocusControls)', () => {
    const host = document.createElement('div');
    const changes: BoardFocus[] = [];
    mountFocusControls(host, {
      focus: DEFAULT_FOCUS,
      // Mimic the facade's fan-back so the controls' internal focus composes.
      onChange: (next) => {
        changes.push(next);
        syncFocusControls(host, next);
      },
    });

    clickButton(host, 'N');
    clickButton(host, 'Isometric');

    expect(changes[0]).toEqual({ kingdom: 'north', angle: 'overhead' });
    expect(changes[1]).toEqual({ kingdom: 'north', angle: 'isometric' });
  });

  it('reflects the active focus as pressed and unmounts cleanly', () => {
    const host = document.createElement('div');
    const unmount = mountFocusControls(host, {
      focus: { kingdom: 'east', angle: 'overhead' },
      onChange: () => {},
    });
    const east = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'E');
    expect(east?.getAttribute('aria-pressed')).toBe('true');

    unmount();
    expect(host.querySelector('.udt-focus-controls')).toBeNull();
  });
});
