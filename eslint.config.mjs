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

// Flat config preview used to prepare ESLint 9 migration without changing current CI behavior.
// Includes ESLint recommended rules + explicit TypeScript rules for parity with legacy .eslintrc.js.
export default [
    {
        ignores: ['dist/**', 'node_modules/**', '*.js', 'examples/**'],
    },
    // Base ESLint recommended rules (equivalent to 'extends: ['eslint:recommended']' in legacy config)
    js.configs.recommended,
    // TypeScript parser and plugin configuration with custom rules
    {
        files: ['**/*.{ts,js}'],
        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: normalizeGlobals(globals.node, globals.browser, globals.jest),
        },
        plugins: {
            '@typescript-eslint': tsPlugin,
        },
        rules: {
            // Disable core rule in favor of TypeScript version below
            'no-unused-vars': 'off',
            // Explicit rules matching legacy .eslintrc.js configuration
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
