import { DataSource } from 'typeorm';

import { buildDataSourceOptions } from '../src/database/typeorm-options.factory';
import { MAINTENANCE_DATABASE } from './test.constants';
import { applyTestEnvironment } from './test-environment';

/**
 * Пересоздаёт тестовую БД и прогоняет на ней миграции — один раз перед всем прогоном.
 *
 * Побочный полезный эффект: каждый запуск e2e проверяет, что миграции применяются
 * на чистую базу без ошибок (§13 п.21).
 *
 * Имя базы подставляется в DDL интерполяцией — параметризовать CREATE/DROP DATABASE
 * нельзя. Это безопасно только потому, что applyTestEnvironment уже проверил имя
 * регексом и убедился, что оно не совпадает с рабочей базой.
 */
export default async function setupE2eDatabase(): Promise<void> {
  const settings = applyTestEnvironment();
  // Те же опции, что у приложения, но с подключением к служебной базе:
  // удалить и создать базу, находясь внутри неё самой, нельзя.
  const maintenance = new DataSource(
    buildDataSourceOptions({ ...process.env, POSTGRES_DB: MAINTENANCE_DATABASE }),
  );

  await maintenance.initialize();

  try {
    await maintenance.query(`DROP DATABASE IF EXISTS "${settings.name}" WITH (FORCE)`);
    await maintenance.query(`CREATE DATABASE "${settings.name}"`);
  } finally {
    await maintenance.destroy();
  }

  const testDatabase = new DataSource(buildDataSourceOptions(process.env));

  await testDatabase.initialize();

  try {
    await testDatabase.runMigrations();
  } finally {
    await testDatabase.destroy();
  }
}
