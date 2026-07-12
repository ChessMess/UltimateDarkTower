const root = document.getElementById('tower-display-root');

if (!root) {
  throw new Error('Tower emulator root element not found');
}

const panel = document.createElement('div');
panel.style.maxWidth = '720px';
panel.style.margin = '2rem auto';
panel.style.padding = '1.25rem 1.5rem';
panel.style.border = '1px solid #6b2c2c';
panel.style.borderRadius = '12px';
panel.style.background = '#221616';
panel.style.boxShadow = '0 12px 32px rgba(0, 0, 0, 0.35)';

const title = document.createElement('h1');
title.textContent = 'Tower Emulator unavailable';
title.style.fontSize = '1.4rem';
title.style.marginBottom = '0.75rem';
title.style.color = '#fca5a5';

const body = document.createElement('pre');
body.textContent = [
  'This example was built without the ultimatedarktowerdisplay package.',
  '',
  'Required workspace package: ultimatedarktowerdisplay (packages/display)',
  '',
  'To enable the emulator:',
  '1. Run `pnpm install` at the monorepo root',
  '2. Rebuild with `pnpm --filter ultimatedarktower build`',
].join('\n');
body.style.whiteSpace = 'pre-wrap';
body.style.lineHeight = '1.6';
body.style.color = '#f3f4f6';
body.style.fontFamily = 'monospace';

panel.appendChild(title);
panel.appendChild(body);
root.appendChild(panel);

window.opener?.postMessage({ type: 'emulatorUnavailable' }, '*');
