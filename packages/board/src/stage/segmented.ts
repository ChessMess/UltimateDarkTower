// A minimal segmented (radio-style) button group, styled with the same classes as
// the focus bar (`udt-focus-group` / `udt-focus-button`) so the on-map Spin/Pan
// toggle matches the kingdom controls. Display's `SideButtons` is not exported, so
// this small helper is the stage's own — there is no reusable version to share.

export interface SegmentedItem<T extends string> {
  key: T;
  label: string;
}

export interface Segmented<T extends string> {
  readonly el: HTMLElement;
  /** Mark one option active (clearing the rest). Pass `null` to clear all. */
  setActive(key: T | null): void;
}

export function createSegmented<T extends string>(
  host: HTMLElement,
  items: SegmentedItem<T>[],
  onSelect: (key: T) => void
): Segmented<T> {
  host.classList.add('udt-focus-group');
  host.setAttribute('role', 'group');
  const byKey = new Map<T, HTMLButtonElement>();
  for (const { key, label } of items) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'udt-focus-button';
    btn.textContent = label;
    btn.addEventListener('click', () => onSelect(key));
    host.appendChild(btn);
    byKey.set(key, btn);
  }
  return {
    el: host,
    setActive(key) {
      for (const [k, btn] of byKey) btn.classList.toggle('is-active', k === key);
    },
  };
}
