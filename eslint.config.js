import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

// Single flat config for the whole workspace. Replaces the 8 per-package
// legacy/flat configs (and the ESLINT_USE_FLAT_CONFIG=false hack in core).
export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dist-example/**',
      '**/example/dist/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/*.d.ts',
      // compiled/generated JS that lives alongside TS sources
      'packages/creator-engine/**/*.js',
      'packages/creator-schema/test/*.js',
    ],
  },

  // Base: every TS/TSX file in the workspace.
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      // UDT spans browser (core/display/board/apps) and node (relay/scripts);
      // provide both rather than mis-scoping per directory.
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // React surfaces: the creator/player/digital apps and package example sites.
  {
    files: [
      'apps/creator/**/*.{ts,tsx}',
      'apps/player/**/*.{ts,tsx}',
      'apps/digital/**/*.{ts,tsx}',
      'packages/*/example/**/*.{ts,tsx}',
    ],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },

  // Test files: expose the jest/vitest ambient globals.
  {
    files: [
      '**/*.{test,spec}.{ts,tsx}',
      '**/tests/**/*.{ts,tsx}',
      '**/test/**/*.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
    ],
    languageOptions: {
      globals: { ...globals.jest, ...globals.node },
    },
  },

  // Demo/reference apps (packages/*/examples/**, plus the promoted controller and
  // game apps): reference code, not shipped library source. Explicit `any` is
  // common in DOM/demo glue and not worth typing away; every other rule still
  // applies. Must stay last so this relaxation wins over the base recommended
  // config (last-match-wins).
  {
    files: [
      '**/examples/**/*.{ts,tsx}',
      'apps/controller/**/*.{ts,tsx}',
      'apps/game/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
);
