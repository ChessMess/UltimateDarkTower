import { useEffect } from 'react';
import { useCreatorStore } from '../store';
import { flowToSchema } from './serializer';
import { saveDraft } from './draft';

const AUTOSAVE_DEBOUNCE_MS = 800;

function flushDraft(): void {
  const { schemaDoc, rfNodes, rfEdges, isDirty } = useCreatorStore.getState();
  if (!schemaDoc || !isDirty) return;
  saveDraft(flowToSchema(rfNodes, rfEdges, schemaDoc));
}

export function useDraftPersistence(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const unsubscribe = useCreatorStore.subscribe(() => {
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
      flushDraft();
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);
}
