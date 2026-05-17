import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import parser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser,
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      'no-console': 'off',
      // TypeScript's compiler already catches undefined references; no-undef
      // produces false positives for Node.js globals and TS-only constructs.
      'no-undef': 'off',
      // Replace the base rule with the TS-aware version so constructor
      // parameter properties (readonly x) are not falsely flagged.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
];
