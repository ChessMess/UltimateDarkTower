// Collapsible panels in the right config column, persisted by data-collapse-key.
// Adapted from the sibling UltimateDarkTowerDisplay app.
import { readLocal, writeLocal } from './utils';

const STORAGE_KEY = 'udtb.configColumn.collapsed.v1';

/** Keys collapsed by default on a user's first visit (no localStorage entry yet). */
const DEFAULT_COLLAPSED = ['settings'];

function readStored(): Set<string> {
  const raw = readLocal(STORAGE_KEY);
  if (raw === null) {
    const seeded = new Set(DEFAULT_COLLAPSED);
    persist(seeded);
    return seeded;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? new Set(parsed.filter((v): v is string => typeof v === 'string'))
      : new Set();
  } catch {
    return new Set();
  }
}

function persist(collapsed: Set<string>): void {
  writeLocal(STORAGE_KEY, JSON.stringify([...collapsed]));
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
      // Don't toggle when clicking an interactive widget inside the header.
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
