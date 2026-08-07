import type { HttpModuleOptions } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';

import {
  ACCEPT_HEADER,
  HH_API_BASE_URL_ENV_KEY,
  HH_REQUEST_TIMEOUT_MS_ENV_KEY,
  HH_USER_AGENT_ENV_KEY,
  JSON_MEDIA_TYPE,
  USER_AGENT_HEADER,
} from './hh.constants';

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
 * Опции axios для запросов к hh.ru (§4.1, §4.6). User-Agent обязателен — без него
 * hh.ru отвечает 400; значение берётся из env и провалидировано при старте.
 */
export function buildHhHttpOptions(configService: ConfigService): HttpModuleOptions {
  return {
    baseURL: configService.getOrThrow<string>(HH_API_BASE_URL_ENV_KEY),
    timeout: configService.getOrThrow<number>(HH_REQUEST_TIMEOUT_MS_ENV_KEY),
    headers: {
      [USER_AGENT_HEADER]: configService.getOrThrow<string>(HH_USER_AGENT_ENV_KEY),
      [ACCEPT_HEADER]: JSON_MEDIA_TYPE,
    },
    validateStatus: acceptAnyStatus,
  };
}
