// draft — the legacy localStorage autosave slot, now a one-way migration shim.
//
// The Creator used to debounce-write the whole scenario (base64 image payloads and all) into a
// single localStorage key. That capped a scenario at the ~5 MB localStorage quota, which the image
// budget alone consumed — the repo's own docs called it at "roughly three arted boards". Drafts now
// live in the IndexedDB scenario library (see @udtc/scenario-store).
//
// This module survives only to rescue a draft written by the previous version, on first run after
// the upgrade. Nothing writes here any more. Once the draft is adopted or discarded the key is
// removed and this file can go.

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

/**
 * Read the legacy draft, if one is still sitting in localStorage.
 *
 * A schema mismatch returns null — there is no migration machinery in this repo and never was; the
 * old loader discarded mismatches too.
 */
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
