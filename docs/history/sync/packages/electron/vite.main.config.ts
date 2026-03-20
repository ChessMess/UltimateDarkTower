import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        '@stoprocent/bleno',    // native module — must not be bundled
        '@stoprocent/noble',    // native module
        'ws',                   // works better unbundled in Electron main
      ],
    },
  },
});
