/// <reference types="vite/client" />

// Explicit fallback — covers plain CSS side-effect imports like `import './foo.css'`
// when the TS server doesn't resolve vite/client automatically.
declare module '*.css';
