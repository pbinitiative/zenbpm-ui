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
  globalIgnores(['dist', 'src/base/openapi/generated-api', 'public/mockServiceWorker.js']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      local: localRules,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      // Allow unused vars with underscore prefix
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
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
  // Exception: Allow in mock/test files for debugging
  {
    files: ['src/mocks/**/*.ts', '**/*.test.ts', '**/*.test.tsx', '**/*.spec.ts', '**/*.spec.tsx'],
    rules: {
      'local/no-hardcoded-colors': 'off',
      'local/no-inline-styles': 'off',
    },
  },
])
