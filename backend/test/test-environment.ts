import { config as loadEnvFile } from 'dotenv';

import {
  DEFAULT_DATABASE_PORT,
  DEFAULT_GETMATCH_MAX_RETRIES,
  DEFAULT_HH_MAX_RETRIES,
  ENV_FILE_PATHS,
} from '../src/config/config.constants';
import type { TestDatabaseSettings } from './e2e.interfaces';
import {
  DEFAULT_TEST_DATABASE_HOST,
  DEFAULT_TEST_DATABASE_NAME,
  GETMATCH_STUB_BASE_URL,
  HH_STUB_BASE_URL,
  TEST_AUTH_PASSWORD,
  TEST_AUTH_USER,
  TEST_DATABASE_NAME_PATTERN,
  TEST_ENV_APPLIED_FLAG,
  TEST_ENV_APPLIED_VALUE,
  TEST_GETMATCH_USER_AGENT,
  TEST_HH_USER_AGENT,
  TEST_NODE_ENV,
  TEST_SCHEDULED_SYNC_ENABLED,
  TEST_SYNC_CONCURRENCY,
  TEST_SYNC_MIN_DELAY_MS,
} from './test.constants';

function requireEnvValue(key: string): string {
  const value = process.env[key];

  if (value === undefined || value.trim() === '') {
    throw new Error(
      `Переменная окружения ${key} не задана. Для e2e-тестов нужен .env в корне монорепо ` +
        `(cp .env.example .env) и поднятая база: docker compose up -d db`,
    );
  }

  return value;
}

/**
 * Готовит process.env к прогону e2e: грузит корневой .env и переопределяет
 * подключение к БД на отдельную тестовую базу.
 *
 * Работает потому, что @nestjs/config не перезаписывает уже установленные
 * process.env значениями из env-файла, а process.env для него приоритетнее.
 * Значит, вызов этой функции ДО импорта AppModule гарантирует, что приложение
 * поднимется на тестовой БД.
 *
 * Идемпотентна: её вызывают и globalSetup, и setupFiles каждого воркера.
 */
export function applyTestEnvironment(): TestDatabaseSettings {
  for (const path of ENV_FILE_PATHS) {
    loadEnvFile({ path, quiet: true });
  }

  // Креды проверяем сразу, чтобы упасть с понятным текстом, а не с ошибкой драйвера.
  requireEnvValue('POSTGRES_USER');
  requireEnvValue('POSTGRES_PASSWORD');

  const workingDatabase = requireEnvValue('POSTGRES_DB');
  const host = process.env.TEST_DATABASE_HOST ?? DEFAULT_TEST_DATABASE_HOST;
  const port = Number(
    process.env.DATABASE_PORT_HOST ?? process.env.DATABASE_PORT ?? DEFAULT_DATABASE_PORT,
  );
  const name = process.env.TEST_DATABASE_NAME ?? DEFAULT_TEST_DATABASE_NAME;
  /**
   * Повторный вызов: окружение уже подменено этой же функцией, поэтому сверять имя
   * с «рабочей» базой нельзя — она уже тестовая. Признак берём из явного флага,
   * а не из состояния env (см. TEST_ENV_APPLIED_FLAG).
   */
  const alreadyApplied = process.env[TEST_ENV_APPLIED_FLAG] === TEST_ENV_APPLIED_VALUE;

  // Тестовая база пересоздаётся с нуля при каждом прогоне, поэтому имя проверяем дважды:
  // оно обязано соответствовать регексу и не совпадать с рабочей базой.
  if (!TEST_DATABASE_NAME_PATTERN.test(name)) {
    throw new Error(
      `Недопустимое имя тестовой БД «${name}»: ожидается шаблон ${String(TEST_DATABASE_NAME_PATTERN)}`,
    );
  }

  if (!alreadyApplied && name === workingDatabase) {
    throw new Error(
      `TEST_DATABASE_NAME совпадает с POSTGRES_DB («${name}»). ` +
        'Тесты удаляют свою базу целиком — задай для них отдельное имя.',
    );
  }

  process.env.NODE_ENV = TEST_NODE_ENV;
  process.env.DATABASE_HOST = host;
  process.env.DATABASE_PORT = String(port);
  process.env.POSTGRES_DB = name;
  // Креды фиксируем принудительно: будущий Basic Auth guard должен видеть
  // детерминированные значения, совпадающие с теми, что подставляет агент.
  process.env.AUTH_USER = TEST_AUTH_USER;
  process.env.AUTH_PASSWORD = TEST_AUTH_PASSWORD;
  // hh.ru и getmatch.ru подменяются локальными заглушками для ВСЕХ e2e: ни один тест
  // не должен ходить в интернет — ни случайно, ни в спеках синхронизации.
  // Значения тоже фиксируются принудительно, иначе ожидания в спеках зависели бы
  // от содержимого .env разработчика.
  process.env.HH_SITE_BASE_URL = HH_STUB_BASE_URL;
  process.env.HH_USER_AGENT = TEST_HH_USER_AGENT;
  process.env.HH_MAX_RETRIES = String(DEFAULT_HH_MAX_RETRIES);
  process.env.GETMATCH_SITE_BASE_URL = GETMATCH_STUB_BASE_URL;
  process.env.GETMATCH_USER_AGENT = TEST_GETMATCH_USER_AGENT;
  process.env.GETMATCH_MAX_RETRIES = String(DEFAULT_GETMATCH_MAX_RETRIES);
  // Общие для всех источников (§4.6) — переименованы из HH_SYNC_CONCURRENCY/
  // HH_SYNC_MIN_DELAY_MS вместе с обобщением синхронизации в vacancies/.
  process.env.SYNC_CONCURRENCY = String(TEST_SYNC_CONCURRENCY);
  process.env.SYNC_MIN_DELAY_MS = String(TEST_SYNC_MIN_DELAY_MS);
  // §4.7: планировщик в e2e не нужен и опасен — см. комментарий к TEST_SCHEDULED_SYNC_ENABLED.
  process.env.SCHEDULED_SYNC_ENABLED = TEST_SCHEDULED_SYNC_ENABLED;
  process.env[TEST_ENV_APPLIED_FLAG] = TEST_ENV_APPLIED_VALUE;

  return { host, port, name };
}
