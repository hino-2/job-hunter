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
