import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@udtc/theme/theme.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
