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

/** Что заглушка hh.ru запомнила о полученном запросе. */
export interface HhStubRequest {
  path: string;
  userAgent: string | undefined;
  accept: string | undefined;
}

/**
 * Ответ заглушки. body строкой отдаётся как есть — так проверяется реакция
 * на невалидный JSON; любое другое значение сериализуется в JSON.
 */
export interface HhStubReply {
  status: number;
  body?: unknown;
}

export interface HhStubServer {
  /** Значение для HH_API_BASE_URL: http://127.0.0.1:<случайный порт>. */
  baseUrl: string;
  requests: HhStubRequest[];
  respondWith(reply: HhStubReply): void;
  reset(): void;
  close(): Promise<void>;
}
