import { join } from 'node:path';

import { createBackendConfig, createFrontendConfig } from './eslint.shared.mjs';

/**
 * Корневой конфиг: линтует оба воркспейса одним запуском из корня монорепо.
 *
 * Нужен потому, что запуск линта из корня не всегда доходит до воркспейсных конфигов:
 * `npm run lint` в корне делегирует в воркспейсы через `--workspaces`, но обёртки
 * над npm (у нас — хук rtk) подменяют команду целиком и запускают ESLint прямо
 * в корне, где своего конфига не было — линт падал с «couldn't find an eslint.config».
 *
 * Правила не дублируются: и этот конфиг, и воркспейсные собираются одними и теми же
 * функциями из eslint.shared.mjs, разница только в масках файлов и в том, что здесь
 * к ним добавлен префикс каталога. Запуск из самого воркспейса этот файл не задевает —
 * ESLint берёт ближайший конфиг вверх от текущего каталога, то есть воркспейсный.
 */
export default [
  { ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**'] },
  ...createBackendConfig({
    tsconfigRootDir: join(import.meta.dirname, 'backend'),
    prefix: 'backend/',
  }),
  ...createFrontendConfig({
    tsconfigRootDir: join(import.meta.dirname, 'frontend'),
    prefix: 'frontend/',
  }),
];
