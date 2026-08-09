import type { HttpModuleOptions } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import { buildVacancyHttpOptions } from '../vacancies/vacancy-http-options.factory';
import { HH_HTTP_ENV_KEYS } from './hh.constants';

/**
 * Тонкая обёртка над общей фабрикой (§4.1, §4.6): hh.ru отвечает своим набором
 * env-ключей (базовый URL, таймаут, User-Agent), остальные опции axios — общие
 * для всех источников и живут в vacancy-http-options.factory.ts.
 */
export function buildHhHttpOptions(configService: ConfigService): HttpModuleOptions {
  return buildVacancyHttpOptions(configService, HH_HTTP_ENV_KEYS);
}
