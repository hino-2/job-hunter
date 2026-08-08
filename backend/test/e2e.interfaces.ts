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
 * на страницу без признака архивности; любое другое значение сериализуется в JSON
 * (в тестах страницы всегда приходят уже готовой HTML-строкой).
 */
export interface HhStubReply {
  status: number;
  body?: unknown;
}

export interface HhStubServer {
  /** Значение для HH_SITE_BASE_URL: http://127.0.0.1:<фиксированный порт>. */
  baseUrl: string;
  requests: HhStubRequest[];
  respondWith(reply: HhStubReply): void;
  reset(): void;
  close(): Promise<void>;
}

/**
 * Параметры генератора минимальной HTML-страницы вакансии hh.ru (buildHhVacancyPage).
 * `undefined` у поля — «взять значение по умолчанию», явный `null` — «убрать значение
 * из JSON-LD», а не пропустить его.
 */
export interface HhPageFixtureOptions {
  /** null → JSON-LD без title. */
  title?: string | null;
  /** null → JSON-LD без hiringOrganization. */
  employerName?: string | null;
  /** Управляет обоими токенами archived и data-qa-маркером архивной страницы. */
  archived?: boolean;
  /** false → страница без блока <script type="application/ld+json"> вовсе. */
  withJsonLd?: boolean;
  /** Блок ld+json есть, но внутри не JSON — проверка мягкой деградации автозаполнения. */
  brokenJsonLd?: boolean;
  /** Управляет консенсусом токенов archived: обычный случай, отсутствие, противоречие. */
  archivedTokens?: 'both' | 'none' | 'conflicting';
}
