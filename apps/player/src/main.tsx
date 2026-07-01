import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@udtc/theme/theme.css';
import './index.css';
import App from './App';
import { checkForResumableSession } from './game';

// Detect a saved in-progress game once at startup (StrictMode-safe: module scope runs once).
// Sets store.resumable so the LoadPanel can offer Resume/Discard; never blocks first paint.
void checkForResumableSession();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
