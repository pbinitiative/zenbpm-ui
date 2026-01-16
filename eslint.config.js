// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { createRequire } from 'module'

// Import local ESLint rules
const require = createRequire(import.meta.url)
const localRules = require('./eslint-rules/index.cjs')

export default defineConfig([
  globalIgnores([
    'dist',
    'src/base/openapi/generated-api',
    'public/mockServiceWorker.js',
    // E2E tests and config files have separate tsconfig
    'e2e/**',
    'orval.config.ts',
    'playwright.config.ts',
    // Storybook
    '.storybook/**',
    'storybook-static/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      local: localRules,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],

      // === Type Safety Rules (ERRORS - must fix) ===
      // Disallow explicit `any` type - use `unknown` instead, or proper types
      // Disable with: // eslint-disable-next-line @typescript-eslint/no-explicit-any
      '@typescript-eslint/no-explicit-any': 'error',

      // Disallow unsafe operations on `any` typed values
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',

      // Restrict template literal expressions to safe types
      '@typescript-eslint/restrict-template-expressions': ['error', { allowNumber: true, allowBoolean: true, allowNullish: true }],

      // Ensure promises are handled properly
      '@typescript-eslint/no-floating-promises': ['error', { ignoreVoid: true }],
      '@typescript-eslint/no-misused-promises': ['error', { checksVoidReturn: { attributes: false } }],

      // Require proper toString() usage
      '@typescript-eslint/no-base-to-string': 'error',

      // === Type Safety Rules (WARNINGS - should fix when convenient) ===
      // Allow non-null assertions when needed (use sparingly!)
      '@typescript-eslint/no-non-null-assertion': 'warn',

      // Prefer nullish coalescing (??) over logical OR (||) for defaults
      '@typescript-eslint/prefer-nullish-coalescing': 'off', // Too many false positives with strings

      // === Code Style Rules (relaxed for practicality) ===
      // Allow empty functions (useful for default callbacks)
      '@typescript-eslint/no-empty-function': 'off',

      // Require explicit return types on exported functions
      '@typescript-eslint/explicit-module-boundary-types': 'off',

      // Allow confusing void expressions (common in React event handlers)
      '@typescript-eslint/no-confusing-void-expression': 'off',

      // Allow unnecessary conditions (TypeScript catches most issues)
      '@typescript-eslint/no-unnecessary-condition': 'off',

      // Allow array type style preference (T[] vs Array<T>)
      '@typescript-eslint/array-type': 'off',

      // Allow deprecated APIs (TypeScript already warns about these)
      '@typescript-eslint/no-deprecated': 'warn',

      // Relax some strict rules that cause too many false positives
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
      '@typescript-eslint/no-misused-spread': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-unnecessary-type-parameters': 'off',
      '@typescript-eslint/prefer-reduce-type-parameter': 'off',
      '@typescript-eslint/no-unnecessary-type-conversion': 'off',
      '@typescript-eslint/prefer-regexp-exec': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/dot-notation': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',

      // Prefer optional chaining (?.) over && chains
      '@typescript-eslint/prefer-optional-chain': 'error',

      // Require consistent type imports
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports', fixStyle: 'inline-type-imports' }],

      // === Local Rules ===
      // Enforce themed colors - no hardcoded hex/rgb/hsl values
      'local/no-hardcoded-colors': 'error',
      // Enforce sx prop over inline styles
      'local/no-inline-styles': 'error',
      // Enforce i18n namespace declarations match usage
      'local/i18n-namespace-match': 'error',
    },
  },
  // Exception: Allow hardcoded colors in theme definition file
  {
    files: ['src/base/theme/**/*.ts'],
    rules: {
      'local/no-hardcoded-colors': 'off',
    },
  },
  // Exception: Relax rules in mock/test files (not production code)
  {
    files: ['src/mocks/**/*.ts', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'local/no-hardcoded-colors': 'off',
      'local/no-inline-styles': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-base-to-string': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
    },
  },
  // Exception: Allow `any` in type declaration files for external libraries without proper types
  {
    files: ['**/*.d.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  // Exception: Relax unsafe rules for BPMN/DMN diagram components (external libraries have poor TypeScript support)
  {
    files: [
      'src/components/BpmnDiagram/**/*.{ts,tsx}',
      'src/components/BpmnEditor/**/*.{ts,tsx}',
      'src/components/DmnViewer/**/*.{ts,tsx}',
      'src/components/DmnEditor/**/*.{ts,tsx}',
    ],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },
  // Exception: Relax rules for Storybook stories
  {
    files: ['**/*.stories.{ts,tsx}'],
    rules: {
      'local/no-hardcoded-colors': 'off',
      'local/no-inline-styles': 'off',
      '@typescript-eslint/no-deprecated': 'off',
      'no-loss-of-precision': 'off',
    },
  },
])
