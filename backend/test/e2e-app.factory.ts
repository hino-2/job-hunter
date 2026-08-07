import type { Server } from 'node:http';

import { Test } from '@nestjs/testing';
import request from 'supertest';
import { DataSource } from 'typeorm';

import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import type { E2eTestContext } from './e2e.interfaces';
import {
  E2E_APP_OPTIONS,
  TEST_AUTH_PASSWORD,
  TEST_AUTH_USER,
  TRUNCATE_APPLICATIONS_QUERY,
} from './test.constants';

/**
 * Поднимает настоящее приложение (тот же AppModule, тот же configureApp, что в main.ts)
 * на тестовой БД. Именно поэтому появление глобального Basic Auth guard и exception
 * filter в шаге 3 не потребует правок в спеках: агент api уже ходит с кредами.
 *
 * Изоляция между тестами — TRUNCATE, а не транзакционный откат: откат потребовал бы
 * прокидывать один QueryRunner во все запросы Nest.
 */
export async function createE2eTestContext(): Promise<E2eTestContext> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication(E2E_APP_OPTIONS);

  configureApp(app);

  await app.init();

  const dataSource = app.get(DataSource);
  // getHttpServer() объявлен в Nest как any; под express это всегда http.Server,
  // и supertest ждёт именно его — сужаем здесь, чтобы any не расползался.
  const server = app.getHttpServer() as Server;

  return {
    app,
    dataSource,
    api: request.agent(server).auth(TEST_AUTH_USER, TEST_AUTH_PASSWORD),
    anonymousApi: request.agent(server),
    resetDatabase: async (): Promise<void> => {
      await dataSource.query(TRUNCATE_APPLICATIONS_QUERY);
    },
    close: async (): Promise<void> => {
      await app.close();
    },
  };
}
