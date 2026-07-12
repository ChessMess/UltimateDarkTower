const STORAGE_KEY = 'udtd.configColumn.collapsed.v2';

/** Keys collapsed by default on a user's first visit (no localStorage entry yet). */
const DEFAULT_COLLAPSED = ['lighting', 'physics'];

function readStored(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const seeded = new Set(DEFAULT_COLLAPSED);
      persist(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? new Set(parsed.filter((v) => typeof v === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

function persist(collapsed: Set<string>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...collapsed]));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function initPanelCollapseController(): void {
  const column = document.getElementById('config-column');
  if (!column) return;

  const panels = Array.from(column.querySelectorAll<HTMLElement>('.panel[data-collapse-key]'));
  const collapsed = readStored();

  for (const panel of panels) {
    const key = panel.dataset.collapseKey;
    if (!key) continue;
    const header = panel.querySelector<HTMLElement>('.panel-row-header');
    if (!header) continue;

    if (collapsed.has(key)) panel.dataset.collapsed = 'true';

    header.addEventListener('click', (event) => {
      // Don't toggle when the user clicks an interactive widget that happens
      // to live in the header row (e.g. Copy / Apply buttons).
      const target = event.target as HTMLElement | null;
      if (target?.closest('button, input, select, textarea, a')) return;

      const isCollapsed = panel.dataset.collapsed === 'true';
      if (isCollapsed) {
        delete panel.dataset.collapsed;
        collapsed.delete(key);
      } else {
        panel.dataset.collapsed = 'true';
        collapsed.add(key);
      }
      persist(collapsed);
    });
  }
}
