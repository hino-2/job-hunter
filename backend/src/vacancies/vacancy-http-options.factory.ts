import type { HttpModuleOptions } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import {
  ACCEPT_HEADER,
  USER_AGENT_HEADER,
  VACANCY_ACCEPT_HEADER_VALUE,
  VACANCY_MAX_REDIRECTS,
  VACANCY_MAX_RESPONSE_BYTES,
  VACANCY_RESPONSE_TYPE,
} from './vacancies.constants';
import type { VacancyHttpEnvKeys } from './vacancies.interfaces';

/**
 * Любой HTTP-статус считаем «успешным ответом» на уровне axios.
 *
 * Иначе 404 и 429 приходили бы исключением и их пришлось бы отличать от сетевой
 * ошибки по наличию error.response — а §4.3/§4.5 требуют развести эти случаи
 * по разным исходам. С validateStatus ветвление живёт в одном switch по статусу,
 * а в catch остаётся ровно транспорт: таймаут, DNS, отказ в соединении.
 */
function acceptAnyStatus(): boolean {
  return true;
}

/**
 * Опции axios, общие для всех источников вакансий (§4.1, §4.6): validateStatus всегда
 * true, тело читается строкой, редиректы следуются, действует потолок размера ответа.
 * User-Agent, base URL и таймаут — per-source, поэтому приходят именами env-переменных
 * (keys), а не значениями: значение достаёт сам configService.getOrThrow.
 */
export function buildVacancyHttpOptions(
  configService: ConfigService,
  keys: VacancyHttpEnvKeys,
): HttpModuleOptions {
  return {
    baseURL: configService.getOrThrow<string>(keys.baseUrl),
    timeout: configService.getOrThrow<number>(keys.timeoutMs),
    headers: {
      [USER_AGENT_HEADER]: configService.getOrThrow<string>(keys.userAgent),
      [ACCEPT_HEADER]: VACANCY_ACCEPT_HEADER_VALUE,
    },
    validateStatus: acceptAnyStatus,
    // 'text': дефолтный transformResponse axios не пытается JSON.parse тело —
    // разбор HTML получает гарантированно строку, а не объект после неудачного парсинга.
    responseType: VACANCY_RESPONSE_TYPE,
    // Канонический URL вакансии может отвечать 302 → 200, редиректы обязаны следоваться.
    maxRedirects: VACANCY_MAX_REDIRECTS,
    maxContentLength: VACANCY_MAX_RESPONSE_BYTES,
    maxBodyLength: VACANCY_MAX_RESPONSE_BYTES,
  };
}
