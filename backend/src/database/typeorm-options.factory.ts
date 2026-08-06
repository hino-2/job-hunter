import type { DataSourceOptions } from 'typeorm';

import { DEFAULT_DATABASE_PORT } from '../config/config.constants';
import {
  DATABASE_TYPE,
  ENTITIES_GLOB,
  MIGRATIONS_GLOB,
  MIGRATIONS_TABLE_NAME,
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
    entities: [ENTITIES_GLOB],
    migrations: [MIGRATIONS_GLOB],
    migrationsTableName: MIGRATIONS_TABLE_NAME,
    // Схема создаётся ТОЛЬКО миграциями (требование спецификации, §13 п.21).
    synchronize: false,
    // Миграции применяет отдельный шаг при старте контейнера, не сам Nest.
    migrationsRun: false,
  };
}
