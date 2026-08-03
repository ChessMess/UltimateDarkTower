import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// Deliberately NOT importing '@udtc/theme/theme.css': that stylesheet is the tower apps' slate
// palette, and the codex is a reading room. It reuses @udtc/theme's `useTheme` store (same
// localStorage key, same data-theme contract) and defines its own tokens against it.
import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
