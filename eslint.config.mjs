// @ts-check

import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      'eslint.config.mjs',
      'jest.config.js',
      'commitlint.config.js',
      '.prettierrc.js',
      'src/swagger-ui-customization/swagger-custom.js', // Vamos tratar este arquivo separadamente
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['src/**/*.ts', 'test/**/*.ts'],
  })),
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    files: ['src/**/*.ts', 'test/**/*.ts'],
  },

  {
    files: ['src/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
    },
  },

  {
    files: ['test/**/*.ts'],
    rules: {
      // Regras de "any"
      '@typescript-eslint/no-explicit-any': 'off',

      // Regras de "unsafe" (O principal problema estava aqui)
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',

      // Erros de "this" em mocks do Jest
      '@typescript-eslint/unbound-method': 'off',

      // Erro de Promise.all com valores não-Promise (comum em mocks)
      '@typescript-eslint/await-thenable': 'off',

      // Regra de variáveis não usadas
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  {
    files: ['src/swagger-ui-customization/swagger-custom.js'],
    languageOptions: {
      globals: {
        ...globals.browser, // Define 'document', 'window', etc. como globais
      },
    },
  },

  {
    files: ['*.config.js', '.prettierrc.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-undef': 'off',
    },
  },

  prettierRecommended,
];
