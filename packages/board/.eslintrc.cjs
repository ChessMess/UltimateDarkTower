module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  rules: {
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
  },
  env: {
    browser: true,
    node: true,
    es2020: true,
    jest: true,
  },
  ignorePatterns: ['dist', 'node_modules', 'example/dist', 'coverage'],
};
