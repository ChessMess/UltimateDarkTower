module.exports = {
    parser: '@typescript-eslint/parser',
    extends: ['eslint:recommended'],
    plugins: ['@typescript-eslint'],
    parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
    },
    env: {
        node: true,
        browser: true,
        es6: true,
        jest: true,
    },
    rules: {
        // TypeScript-specific rules
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

        // General JavaScript/ES6 rules
        'no-duplicate-imports': 'error',
    },
    ignorePatterns: ['dist/', 'node_modules/', '*.js', 'examples/'],
};
