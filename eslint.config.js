export default [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      'no-unused-vars': 'warn',
    },
  },
  {
    ignores: ['**/node_modules/**', '**/dist/**', 'playwright-report/**', 'test-results/**'],
  },
];
