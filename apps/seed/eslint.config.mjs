import js from '@eslint/js';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import globals from 'globals';

// Some globals package keys include trailing whitespace; normalize for ESLint flat config parsing.
function normalizeGlobals(...sets) {
  return Object.fromEntries(
    sets
      .filter(Boolean)
      .flatMap((set) => Object.entries(set).map(([name, value]) => [name.trim(), value]))
  );
}

export default [
  {
    ignores: ['dist/**', 'node_modules/**', '.vite/**'],
  },
  // Base ESLint recommended rules (equivalent to 'extends: ["eslint:recommended"]')
  js.configs.recommended,
  // TypeScript parser and plugin configuration with custom rules
  {
    files: ['src/**/*.{ts,js}'],
    languageOptions: {
      parser: tsParser,
      ecmaVersion: 2020,
      sourceType: 'module',
      globals: normalizeGlobals(globals.browser),
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      // Disable core rule in favor of TypeScript version below
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-duplicate-imports': 'error',
      'prefer-const': 'warn',
      'no-var': 'warn',
      'no-undef': 'warn',
      'no-extra-boolean-cast': 'warn',
      'no-case-declarations': 'warn',
    },
  },
];
