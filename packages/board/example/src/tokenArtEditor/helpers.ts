// Shared DOM helpers, icon SVGs, and JSON highlighter used across card components.

export const ICON = {
  img: '<svg class="slot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>',
  model:
    '<svg class="slot-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2 3 7v10l9 5 9-5V7z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg>',
  empty:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="m4 18 5-5 3 3"/><path d="M2 2.5 21.5 22" stroke-width="1.1" opacity=".7"/></svg>',
};

export function el(tag: string, cls?: string): HTMLElement {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  return node;
}

export function makeInput(opts: {
  value?: string;
  placeholder?: string;
  type?: string;
  list?: string;
  step?: string;
}): HTMLInputElement {
  const i = document.createElement('input');
  i.type = opts.type ?? 'text';
  if (opts.value !== undefined) i.value = opts.value;
  if (opts.placeholder) i.placeholder = opts.placeholder;
  if (opts.list) i.setAttribute('list', opts.list);
  if (opts.step) i.step = opts.step;
  return i;
}

export function slotHead(icon: string, name: string, tagClass: string, tag: string): HTMLElement {
  const head = el('div', 'slot-head');
  const ic = el('span');
  ic.innerHTML = icon;
  const nm = el('span', 'slot-name');
  nm.textContent = name;
  const tg = el('span', `slot-tag ${tagClass}`);
  tg.textContent = tag;
  head.append(ic.firstChild!, nm, tg);
  return head;
}

export function field(label: string, input: HTMLElement): HTMLElement {
  const f = el('div', 'field');
  const l = el('label');
  l.textContent = label;
  f.append(l, input);
  return f;
}

export function actions(onClear: () => void): HTMLElement {
  const wrap = el('div', 'slot-actions');
  const btn = el('button', 'btn-link');
  btn.textContent = 'Clear';
  btn.addEventListener('click', onClear);
  wrap.append(btn);
  return wrap;
}

/** Wrap a card's lower elements (fields + actions) so they're inset from the card border. */
export function fieldsWrap(...children: HTMLElement[]): HTMLElement {
  const wrap = el('div', 'slot-fields');
  wrap.append(...children);
  return wrap;
}

export function emptyState(text: string): HTMLElement {
  const node = el('div', 'preview-empty');
  node.innerHTML = `${ICON.empty}<span>${escapeHtml(text)}</span>`;
  return node;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function highlight(json: string): string {
  return escapeHtml(json).replace(
    /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)|([{}[\],])/g,
    (_m, str: string, colon: string, num: string, punct: string) => {
      if (str !== undefined)
        return colon
          ? `<span class="k">${str}</span><span class="p">${colon}</span>`
          : `<span class="s">${str}</span>`;
      if (num !== undefined) return `<span class="n">${num}</span>`;
      if (punct !== undefined) return `<span class="p">${punct}</span>`;
      return _m;
    },
  );
}
