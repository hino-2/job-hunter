import type { DataSourceOptions } from 'typeorm';

import { DEFAULT_DATABASE_PORT } from '../config/config.constants';
import {
  DATABASE_TYPE,
  ENTITIES_GLOB,
  MIGRATIONS_GLOB,
  MIGRATIONS_TABLE_NAME,
  UUID_EXTENSION,
} from './database.constants';

function requireEnvValue(env: NodeJS.ProcessEnv, key: string): string {
  const value = env[key];

  if (value === undefined || value.trim() === '') {
    throw new Error(`Переменная окружения ${key} не задана`);
  }

  return value;
}

/**
 * Единый источник опций подключения: используется и приложением (DatabaseModule),
 * и TypeORM CLI (data-source.ts) — чтобы миграции всегда шли в ту же базу,
 * с которой работает рантайм.
 */
export function buildDataSourceOptions(env: NodeJS.ProcessEnv): DataSourceOptions {
  const port = Number(env.DATABASE_PORT ?? DEFAULT_DATABASE_PORT);

  return {
    type: DATABASE_TYPE,
    host: requireEnvValue(env, 'DATABASE_HOST'),
    port,
    username: requireEnvValue(env, 'POSTGRES_USER'),
    password: requireEnvValue(env, 'POSTGRES_PASSWORD'),
    database: requireEnvValue(env, 'POSTGRES_DB'),
    // Генератор uuid для DDL: gen_random_uuid() (Postgres 13+), а не uuid-ossp.
    // installExtensions: false обязателен рядом — иначе TypeORM при каждом коннекте
    // выполняет CREATE EXTENSION IF NOT EXISTS "pgcrypto" (PostgresDriver.afterConnect),
    // хотя gen_random_uuid() входит в ядро и расширение не нужно. Побочный эффект был
    // особенно неприятен в e2e: расширение создавалось в системной базе postgres,
    // к которой подключается пересоздание тестовой БД. На uuidGenerator флаг не влияет.
    uuidExtension: UUID_EXTENSION,
    installExtensions: false,
    entities: [ENTITIES_GLOB],
    migrations: [MIGRATIONS_GLOB],
    migrationsTableName: MIGRATIONS_TABLE_NAME,
    // Схема создаётся ТОЛЬКО миграциями (требование спецификации, §13 п.21).
    synchronize: false,
    // Миграции применяет отдельный шаг при старте контейнера, не сам Nest.
    migrationsRun: false,
  };
}
