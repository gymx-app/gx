import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import importPlugin from 'eslint-plugin-import'
import promise from 'eslint-plugin-promise'
import prettier from 'eslint-plugin-prettier/recommended'

export default tseslint.config(
  { ignores: ['dist', 'dev-dist', '*.config.js', '*.config.ts'] },

  // Base JS rules
  js.configs.recommended,

  // TypeScript — type-aware
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // React hooks
  reactHooks.configs.flat.recommended,

  // React refresh
  reactRefresh.configs.vite,

  // Import
  {
    plugins: { import: importPlugin },
    rules: {
      'import/no-duplicates': 'error',
    },
  },

  // Promise
  {
    plugins: { promise },
    rules: {
      'promise/catch-or-return': 'error',
    },
  },

  // Prettier (must be last to override formatting rules)
  prettier,

  // Project rules
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // Errors
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-debugger': 'error',
      'react-hooks/exhaustive-deps': 'error',
      'react-hooks/rules-of-hooks': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'error',

      // Warnings
      '@typescript-eslint/prefer-nullish-coalescing': 'warn',

      // Relaxed (pragmatic for mixed JS/TS codebase)
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
)
