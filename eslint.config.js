import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig([
  globalIgnores(['dist', 'coverage', 'playwright-report', 'test-results', 'public/images']),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.strictTypeChecked, tseslint.configs.stylisticTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true }],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}', 'tests/unit/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['scripts/**/*.ts', 'tests/e2e/**/*.ts', '*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
  },
  {
    // Named exports everywhere, except route components (src/app/routes/*).
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/app/routes/**'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportDefaultDeclaration',
          message: 'Use named exports. Default exports are only for route components.',
        },
      ],
    },
  },
  {
    // Feature boundaries: import a feature only through its public index.
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*/*', '**/features/*/*'],
              message: "Import from the feature's public index (e.g. '@/features/timeline').",
            },
          ],
        },
      ],
    },
  },
]);
