import type { INestApplication } from '@nestjs/common';
import type { Agent } from 'supertest';
import type { DataSource } from 'typeorm';

export interface TestDatabaseSettings {
  host: string;
  port: number;
  name: string;
}

/**
 * Всё, что нужно спеке: поднятое приложение, соединение с БД для прямых запросов
 * и два HTTP-агента — с Basic Auth и без него (второй понадобится, когда шаг 3
 * включит guard и появятся кейсы на 401).
 */
export interface E2eTestContext {
  app: INestApplication;
  dataSource: DataSource;
  api: Agent;
  anonymousApi: Agent;
  resetDatabase(): Promise<void>;
  close(): Promise<void>;
}
