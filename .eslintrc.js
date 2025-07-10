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
        // Add any custom rules here
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/explicit-function-return-type': 'warn',
        '@typescript-eslint/no-explicit-any': 'warn',
    },
    ignorePatterns: ['dist/', 'node_modules/', '*.js', 'examples/'],
};
