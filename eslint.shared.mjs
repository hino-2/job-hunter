import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

/**
 * Общая для всех воркспейсов конфигурация правила отступов между инструкциями.
 *
 * Требование проекта: пустая строка после блока объявлений переменных (перед первой
 * не-декларацией) и после каждой закрывающей скобки блока (if/for/while/switch/try/…),
 * чтобы код не сливался в стену текста. Между подряд идущими объявлениями переменных
 * пустые строки не нужны.
 *
 * Prettier это правило не обеспечивает — он никогда не вставляет пустые строки,
 * поэтому его соблюдение полностью на ESLint.
 */
export const PADDING_LINE_RULES = [
  { blankLine: 'always', prev: 'block-like', next: '*' },
  { blankLine: 'always', prev: ['const', 'let', 'var'], next: '*' },
  { blankLine: 'any', prev: ['const', 'let', 'var'], next: ['const', 'let', 'var'] },
];

/**
 * Наборы правил и сами конфиги живут здесь, а `eslint.config.mjs` в воркспейсах и в корне —
 * тонкие обёртки над этими функциями. Иначе набора правил стало бы три: два воркспейсных
 * и корневой, и они разъехались бы при первой же правке в одном месте из трёх.
 *
 * Каждая функция принимает каталог воркспейса и маски файлов, потому что один и тот же
 * набор правил применяется из двух точек запуска: из воркспейса (маски относительно него)
 * и из корня (маски с префиксом `backend/`, `frontend/`). `tsconfigRootDir` при этом всегда
 * абсолютный путь к воркспейсу — типизированные правила должны найти его `tsconfig.json`
 * независимо от того, откуда запущен ESLint.
 *
 * `files` задаётся обёрткой `tseslint.config` и наследуется всем, что перечислено
 * в `extends`, — так расширенные конфиги (`js.configs.recommended` и остальные, у которых
 * своих масок нет) не расползаются на соседний воркспейс при запуске из корня.
 */
const COMMON_IGNORES = ['dist/**', 'coverage/**', 'node_modules/**'];

/** Ignore-маски воркспейса с учётом точки запуска: из корня к ним нужен префикс каталога. */
function buildIgnores(prefix, extraIgnores) {
  return [...COMMON_IGNORES, ...extraIgnores].map((pattern) => `${prefix}${pattern}`);
}

export function createBackendConfig({ tsconfigRootDir, prefix = '', extraIgnores = [] }) {
  return tseslint.config(
    {
      ignores: buildIgnores(prefix, ['eslint.config.mjs', 'jest.config.js', ...extraIgnores]),
    },
    {
      files: [`${prefix}**/*.ts`],
      extends: [js.configs.recommended, tseslint.configs.recommendedTypeChecked],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
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
      files: [`${prefix}**/*.spec.ts`, `${prefix}**/*.e2e-spec.ts`],
      rules: {
        '@typescript-eslint/unbound-method': 'off',
      },
    },
    {
      files: [`${prefix}**/*.ts`],
      extends: [prettier],
    },
  );
}

export function createFrontendConfig({ tsconfigRootDir, prefix = '', extraIgnores = [] }) {
  return tseslint.config(
    {
      ignores: buildIgnores(prefix, ['eslint.config.mjs', ...extraIgnores]),
    },
    {
      files: [`${prefix}**/*.ts`, `${prefix}**/*.tsx`],
      extends: [
        js.configs.recommended,
        tseslint.configs.recommendedTypeChecked,
        // Именно из configs.flat — верхнеуровневые конфиги плагина в старом eslintrc-формате.
        reactHooks.configs.flat.recommended,
      ],
      languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir,
        },
      },
      plugins: {
        '@stylistic': stylistic,
      },
      rules: {
        // Проектная конвенция: пустые строки после блоков и после объявлений переменных.
        '@stylistic/padding-line-between-statements': ['error', ...PADDING_LINE_RULES],
        '@typescript-eslint/no-explicit-any': 'error',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      },
    },
    {
      files: [`${prefix}**/*.ts`, `${prefix}**/*.tsx`],
      extends: [prettier],
    },
  );
}
