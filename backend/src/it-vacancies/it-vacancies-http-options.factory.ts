import type { HttpModuleOptions } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { buildVacancyHttpOptions } from '../vacancies/vacancy-http-options.factory';
import { IT_VACANCIES_HTTP_ENV_KEYS } from './it-vacancies.constants';

/**
 * Тонкая обёртка над общей фабрикой (§4.6, §4.8): it-vacancies.ru отвечает своим
 * набором env-ключей (базовый URL, таймаут, User-Agent), остальные опции axios —
 * общие для всех источников и живут в vacancy-http-options.factory.ts.
 */
export function buildItVacanciesHttpOptions(configService: ConfigService): HttpModuleOptions {
  return buildVacancyHttpOptions(configService, IT_VACANCIES_HTTP_ENV_KEYS);
}
