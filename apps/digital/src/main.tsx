import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '@/app/App';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { startAutosave, useGameStore } from '@/state/gameStore';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

// Resume the last game on refresh (PRD-04 FR-04.7): loads before the first paint, and a
// missing/malformed save can't crash boot — `loadSession` returns false or sets `staleSession`.
useGameStore.getState().loadSession();
startAutosave();

createRoot(root).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
