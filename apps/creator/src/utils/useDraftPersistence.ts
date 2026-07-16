import { useEffect } from 'react';
import { useCreatorStore } from '../store';

const AUTOSAVE_DEBOUNCE_MS = 800;

/**
 * Autosave the working scenario into the IndexedDB library.
 *
 * Only ever saves a scenario that already has an id — the first save is an explicit act (Save / Save
 * As), because it has to name the thing. Until then the RecoveryDialog's migrated draft is the only
 * safety net, exactly as before.
 */
function flushDraft(): void {
  const { schemaDoc, isDirty, currentScenarioId } = useCreatorStore.getState();
  if (!schemaDoc || !isDirty || !currentScenarioId) return;
  // saveCurrent() owns the failure flag (draftSaveFailed) and never throws.
  void useCreatorStore.getState().saveCurrent();
}

export function useDraftPersistence(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    // The subscription fires on EVERY set(), including pure-UI ones — canvas pan/zoom
    // (setCanvasViewport) and selection. Those don't set isDirty, but isDirty stays true between
    // edits, so an unguarded handler re-armed the debounce and rewrote the whole document every
    // 800ms while panning. Compare schemaDoc identity: only a real document change is autosavable.
    let lastDoc = useCreatorStore.getState().schemaDoc;

    const unsubscribe = useCreatorStore.subscribe((state) => {
      if (state.schemaDoc === lastDoc) return;
      lastDoc = state.schemaDoc;
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(flushDraft, AUTOSAVE_DEBOUNCE_MS);
    });

    return () => {
      if (timer !== null) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      const { isDirty } = useCreatorStore.getState();
      if (!isDirty) return;
      // IndexedDB is async and unload won't wait for it, so this is a warning, not a flush. The
      // debounced save above is what actually protects the work.
      flushDraft();
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
