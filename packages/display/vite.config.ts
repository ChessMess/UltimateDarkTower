import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'path';

function redirectExamplePath(): Plugin {
  const redirect = (req: { url?: string }, res: { statusCode: number; setHeader(name: string, value: string): void; end(): void }, next: () => void) => {
    if (req.url === '/') {
      res.statusCode = 302;
      res.setHeader('Location', '/example/');
      res.end();
      return;
    }

    if (req.url === '/example') {
      res.statusCode = 302;
      res.setHeader('Location', '/example/');
      res.end();
      return;
    }

    next();
  };

  return {
    name: 'redirect-example-path',
    configureServer(server) {
      server.middlewares.use(redirect);
    },
    configurePreviewServer(server) {
      server.middlewares.use(redirect);
    },
  };
}

export default defineConfig({
  plugins: [redirectExamplePath()],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'UltimateDarkTowerDisplay',
      formats: ['es', 'cjs'],
      fileName: (format) => `index.${format === 'es' ? 'esm' : 'cjs'}.js`,
    },
    rollupOptions: {
      external: ['ultimatedarktower'],
    },
    sourcemap: true,
  },
});
