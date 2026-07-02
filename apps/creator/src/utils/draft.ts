import type { ScenarioDoc } from '../types';

const DRAFT_KEY = 'udtc-creator-draft';
const DRAFT_SCHEMA = 1;

export interface DraftEnvelope {
  schema: number;
  savedAt: string;
  title: string;
  doc: ScenarioDoc;
}

function isScenarioDocShape(value: unknown): value is ScenarioDoc {
  if (!value || typeof value !== 'object') return false;
  const doc = value as Record<string, unknown>;
  if (!doc.graph || typeof doc.graph !== 'object') return false;
  const graph = doc.graph as Record<string, unknown>;
  return typeof graph.entry === 'string' && Array.isArray(graph.nodes);
}

export function saveDraft(doc: ScenarioDoc): void {
  try {
    const envelope: DraftEnvelope = {
      schema: DRAFT_SCHEMA,
      savedAt: new Date().toISOString(),
      title: doc.meta.title,
      doc,
    };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(envelope));
  } catch {
    // Storage unavailable or full — autosave is best-effort, never fatal.
  }
}

export function loadDraft(): DraftEnvelope | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<DraftEnvelope>;
    if (parsed.schema !== DRAFT_SCHEMA) return null;
    if (typeof parsed.savedAt !== 'string' || typeof parsed.title !== 'string') return null;
    if (!isScenarioDocShape(parsed.doc)) return null;
    return parsed as DraftEnvelope;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Ignore — nothing to clean up if storage is unavailable.
  }
}
