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

/** Что заглушка источника вакансии запомнила о полученном запросе. */
export interface VacancyStubRequest {
  path: string;
  userAgent: string | undefined;
  accept: string | undefined;
}

/**
 * Ответ заглушки. body строкой отдаётся как есть — так проверяется реакция
 * на страницу без признака архивности; любое другое значение сериализуется в JSON
 * (в тестах страницы всегда приходят уже готовой HTML-строкой).
 */
export interface VacancyStubReply {
  status: number;
  body?: unknown;
}

export interface VacancyStubServer {
  /** Значение для HH_SITE_BASE_URL/GETMATCH_SITE_BASE_URL: http://127.0.0.1:<порт>. */
  baseUrl: string;
  requests: VacancyStubRequest[];
  respondWith(reply: VacancyStubReply): void;
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

/**
 * Параметры генератора минимальной HTML-страницы вакансии getmatch.ru
 * (buildGetmatchVacancyPage, §4.9). `initialVacancy` управляет тремя состояниями
 * разбора: `'object'` — вакансия найдена, `'null'` — снята/не существует (HTTP 200,
 * но payload несёт null), `'missing'` — ключа initialVacancy в payload нет вовсе
 * (страница не распознана). `chunks` — сколько тегов self.__next_f.push сгенерировать;
 * фикстура всегда режет сам JSON-фрагмент с ключом initialVacancy по границе чанков.
 */
export interface GetmatchPageFixtureOptions {
  position?: string;
  companyName?: string;
  isActive?: boolean;
  initialVacancy?: 'object' | 'null' | 'missing';
  chunks?: number;
}
