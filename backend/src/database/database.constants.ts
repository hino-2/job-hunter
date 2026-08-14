import { join } from 'node:path';

export const DATABASE_TYPE = 'postgres' as const;

export const MIGRATIONS_TABLE_NAME = 'migrations';

/**
 * Глобы строятся от __dirname, поэтому одинаково работают и под ts-node (src/**),
 * и в собранном виде (dist/**). Прямые слэши обязательны: на Windows path.join
 * даёт обратные, а glob-движок TypeORM их не понимает.
 */
export const ENTITIES_GLOB = join(__dirname, '..', '**', '*.entity.{ts,js}').replace(/\\/g, '/');

export const MIGRATIONS_GLOB = join(__dirname, 'migrations', '*.{ts,js}').replace(/\\/g, '/');

/** Типы колонок Postgres, используемые в декораторах сущностей. */
export const COLUMN_TYPE = {
  VARCHAR: 'varchar',
  TEXT: 'text',
  TIMESTAMPTZ: 'timestamptz',
  BOOLEAN: 'boolean',
  /** §3.5: published_on — дата без времени, часть ключа дедупликации. */
  DATE: 'date',
  /** §3.5: salary_from/salary_to. */
  INTEGER: 'integer',
  /** §3.6: vacancy_search_settings.id — ровно одна строка, CHECK (id = 1). */
  SMALLINT: 'smallint',
} as const;

export const PRIMARY_KEY_STRATEGY = 'uuid' as const;

/**
 * Postgres 13+ отдаёт gen_random_uuid() из ядра, расширение ставить не нужно.
 * Значение важно для migration:generate: без него TypeORM ожидал бы
 * uuid_generate_v4() из uuid-ossp и диффил дефолт колонки id на каждом прогоне.
 */
export const UUID_EXTENSION = 'pgcrypto' as const;
