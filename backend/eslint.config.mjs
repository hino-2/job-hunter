import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import tseslint from 'typescript-eslint';

import { PADDING_LINE_RULES } from '../eslint.shared.mjs';

export default tseslint.config(
  {
    ignores: ['dist/**', 'coverage/**', 'node_modules/**', 'eslint.config.mjs', 'jest.config.js'],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      // Проектная конвенция: пустые строки после блоков и после объявлений переменных.
      // Ядровое правило ESLint deprecated и будет удалено в ESLint 11, поэтому берём @stylistic.
      '@stylistic/padding-line-between-statements': ['error', ...PADDING_LINE_RULES],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': ['error', { allowExpressions: true }],
      // consistent-type-imports здесь НЕ включаем: с emitDecoratorMetadata класс,
      // используемый только как тип параметра конструктора (например DataSource),
      // всё равно обязан импортироваться как значение — иначе Nest не соберёт DI.
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  prettier,
);
