import type { BoardKingdom } from '../data/udtReexports';
import type { BoardFocus, BoardViewAngle } from '../renderers/shared';

export interface FocusControlsOptions {
  /** The currently-active focus, used to render the pressed state. */
  focus: BoardFocus;
  /** Fired when a control changes the focus. */
  onChange: (next: BoardFocus) => void;
}

interface KingdomChoice {
  label: string;
  value: BoardKingdom | 'all';
}
const KINGDOMS: KingdomChoice[] = [
  { label: 'All', value: 'all' },
  { label: 'N', value: 'north' },
  { label: 'E', value: 'east' },
  { label: 'S', value: 'south' },
  { label: 'W', value: 'west' },
];
const ANGLES: { label: string; value: BoardViewAngle }[] = [
  { label: 'Overhead', value: 'overhead' },
  { label: 'Isometric', value: 'isometric' },
];

/**
 * Mounts the shared focus controls (PRD §7.2): a kingdom selector (All / N / E / S / W)
 * and an angle toggle (Overhead / Isometric). Reflects the active focus, emits `onChange`
 * when a click changes it, and returns an unmount function. Vanilla TS + DOM — three-free.
 *
 * The Isometric angle has no visible effect on the 2D map (it is reserved for the 3D camera
 * in M3); it is wired here so the focus surface is stable.
 */
export function mountFocusControls(host: HTMLElement, options: FocusControlsOptions): () => void {
  let focus = options.focus;
  const root = document.createElement('div');
  root.className = 'udt-focus-controls';

  const kingdomGroup = makeGroup('Kingdom');
  const kingdomButtons = KINGDOMS.map((choice) =>
    makeButton(choice.label, () => options.onChange({ ...focus, kingdom: choice.value }))
  );
  kingdomButtons.forEach((b) => kingdomGroup.appendChild(b));

  const angleGroup = makeGroup('View');
  const angleButtons = ANGLES.map((choice) =>
    makeButton(choice.label, () => options.onChange({ ...focus, angle: choice.value }))
  );
  angleButtons.forEach((b) => angleGroup.appendChild(b));

  root.append(kingdomGroup, angleGroup);
  host.appendChild(root);

  const reflect = (next: BoardFocus): void => {
    focus = next;
    KINGDOMS.forEach((choice, i) => setPressed(kingdomButtons[i], choice.value === focus.kingdom));
    ANGLES.forEach((choice, i) => setPressed(angleButtons[i], choice.value === focus.angle));
  };
  reflect(focus);

  // Re-render the pressed state when the focus changes elsewhere (fan-out).
  (root as ControlsRoot).__setFocus = reflect;

  return () => {
    root.remove();
  };
}

/** The view facade calls this to keep the controls' pressed state in sync after a fan-out. */
export function syncFocusControls(host: HTMLElement, focus: BoardFocus): void {
  const root = host.querySelector<HTMLElement>('.udt-focus-controls') as ControlsRoot | null;
  root?.__setFocus?.(focus);
}

interface ControlsRoot extends HTMLElement {
  __setFocus?: (focus: BoardFocus) => void;
}

function makeGroup(label: string): HTMLElement {
  const group = document.createElement('div');
  group.className = 'udt-focus-group';
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', label);
  return group;
}

function makeButton(label: string, onClick: () => void): HTMLButtonElement {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.className = 'udt-focus-button';
  button.addEventListener('click', onClick);
  return button;
}

function setPressed(button: HTMLButtonElement, pressed: boolean): void {
  button.setAttribute('aria-pressed', String(pressed));
  button.classList.toggle('is-active', pressed);
}
