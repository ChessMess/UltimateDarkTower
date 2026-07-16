// handoff — load a scenario the Creator saved, via ?scenario=<id>.
//
// The Creator and Player are same-origin siblings when deployed (/UltimateDarkTower/creator/ and
// /player/), so they share the `udt-scenarios` IndexedDB and a scenario can move between them
// without a file round-trip.
//
// IN DEV THEY DO NOT. The Creator runs on localhost:5173 and the Player on :5174 — different
// origins, therefore different storage. The handoff works deployed and cannot work across the dev
// servers. That is why a miss is reported loudly in dev rather than silently falling back:
// discovering this by watching a scenario "vanish" costs hours.
//
// A miss is NOT a dev-only concern. It happens in production too: Safari private mode has no
// IndexedDB at all, ITP evicts after ~7 idle days, the user cleared storage, or the link was
// bookmarked after the scenario was deleted. The file-import fallback is mandatory error handling.

import { loadScenarioParts, joinImages } from '@udtc/scenario-store';

export type HandoffResult =
  | { status: 'none' }
  | { status: 'loaded'; doc: unknown; title: string }
  | { status: 'missing'; id: string; message: string };

/** The ?scenario=<id> parameter, or null. */
export function handoffId(search: string = window.location.search): string | null {
  try {
    return new URLSearchParams(search).get('scenario');
  } catch {
    return null;
  }
}

/**
 * Resolve ?scenario=<id> against the shared library.
 *
 * Never throws: an unreadable store is reported as `missing`, which the UI turns into "import the
 * file instead".
 */
export async function resolveHandoff(search?: string): Promise<HandoffResult> {
  const id = handoffId(search);
  if (!id) return { status: 'none' };

  const stored = await loadScenarioParts(id);
  if (!stored) {
    return {
      status: 'missing',
      id,
      message: import.meta.env.DEV
        ? `Scenario "${id}" isn't visible here. The Creator (:5173) and Player (:5174) are different ` +
          `origins in dev, so they don't share storage — run \`pnpm preview:site\` to test the handoff, ` +
          `or import the exported .json below.`
        : `That scenario couldn't be found in this browser. It may have been deleted, or the browser ` +
          `may have cleared its storage. Import the exported .json below instead.`,
    };
  }

  return {
    status: 'loaded',
    doc: joinImages(stored.doc, stored.images),
    title: stored.meta.title,
  };
}
