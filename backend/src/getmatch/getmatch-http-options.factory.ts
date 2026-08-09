import type { HttpModuleOptions } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { buildVacancyHttpOptions } from '../vacancies/vacancy-http-options.factory';
import { GETMATCH_HTTP_ENV_KEYS } from './getmatch.constants';

/**
 * Тонкая обёртка над общей фабрикой (§4.6, §4.9): getmatch.ru отвечает своим
 * набором env-ключей (базовый URL, таймаут, User-Agent), остальные опции axios —
 * общие для всех источников и живут в vacancy-http-options.factory.ts.
 */
export function buildGetmatchHttpOptions(configService: ConfigService): HttpModuleOptions {
  return buildVacancyHttpOptions(configService, GETMATCH_HTTP_ENV_KEYS);
}
