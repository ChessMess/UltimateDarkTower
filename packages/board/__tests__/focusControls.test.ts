import { mountFocusControls, DEFAULT_FOCUS } from '../src/index';
import type { BoardFocus } from '../src/index';

function clickButton(host: HTMLElement, label: string): void {
  const button = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === label);
  if (!button) throw new Error(`button "${label}" not found`);
  button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

describe('mountFocusControls', () => {
  it('emits the new focus on a kingdom + angle click (composing via the returned handle)', () => {
    const host = document.createElement('div');
    const changes: BoardFocus[] = [];
    const controls = mountFocusControls(host, {
      focus: DEFAULT_FOCUS,
      // Mimic the facade's fan-back so the controls' internal focus composes.
      onChange: (next) => {
        changes.push(next);
        controls.setFocus(next);
      },
    });

    clickButton(host, 'N');
    clickButton(host, 'Overhead');

    expect(changes[0]).toEqual({ kingdom: 'north', angle: 'isometric' });
    expect(changes[1]).toEqual({ kingdom: 'north', angle: 'overhead' });
  });

  it('reflects the active focus as pressed and unmounts cleanly', () => {
    const host = document.createElement('div');
    const controls = mountFocusControls(host, {
      focus: { kingdom: 'east', angle: 'overhead' },
      onChange: () => {},
    });
    const east = Array.from(host.querySelectorAll('button')).find((b) => b.textContent === 'E');
    expect(east?.getAttribute('aria-pressed')).toBe('true');

    controls.unmount();
    expect(host.querySelector('.udt-focus-controls')).toBeNull();
  });
});
