/**
 * Все литералы модуля hh: маршруты, регексы разбора URL, ключи env, имена полей
 * ответа hh.ru, параметры ретраев и тексты ошибок (§4.1, §4.2, §4.6, §5.3).
 */

import { HttpStatus } from '@nestjs/common';

export const HH_ROUTE = 'hh';

export const HH_PREVIEW_ROUTE = 'preview';

/** §4.1: GET https://api.hh.ru/vacancies/{vacancy_id}. */
export const HH_VACANCIES_PATH = '/vacancies';

export const HH_API_BASE_URL_ENV_KEY = 'HH_API_BASE_URL';
export const HH_USER_AGENT_ENV_KEY = 'HH_USER_AGENT';
export const HH_REQUEST_TIMEOUT_MS_ENV_KEY = 'HH_REQUEST_TIMEOUT_MS';
export const HH_MAX_RETRIES_ENV_KEY = 'HH_MAX_RETRIES';
export const HH_SYNC_CONCURRENCY_ENV_KEY = 'HH_SYNC_CONCURRENCY';
export const HH_SYNC_MIN_DELAY_MS_ENV_KEY = 'HH_SYNC_MIN_DELAY_MS';

export const USER_AGENT_HEADER = 'User-Agent';
export const ACCEPT_HEADER = 'Accept';
export const JSON_MEDIA_TYPE = 'application/json';

/** Схема подставляется парсером, если пользователь вставил ссылку без неё (§4.2). */
export const HH_DEFAULT_SCHEME = 'https://';

/**
 * «Строка начинается со схемы» — по грамматике RFC 3986 (ALPHA *( ALPHA / DIGIT / + / - / . ) ':').
 * Нужен, чтобы отличить «hh.ru/vacancy/1» (схемы нет, дописываем https://) от
 * «mailto:hh.ru/vacancy/1» (схема есть, но не http/https — такой URL отбраковывается).
 */
export const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/** Только http/https: javascript:, file:, data: не должны считаться ссылкой на вакансию. */
export const HH_ALLOWED_PROTOCOLS = ['http:', 'https:'];

/** §4.2. Хост берётся из URL уже в нижнем регистре, поэтому флаг i не нужен. */
export const HH_ALLOWED_HOST_PATTERN =
  /^([a-z0-9-]+\.)*(hh\.ru|hh\.kz|hh\.uz|hh1\.az|rabota\.by|headhunter\.ge|headhunter\.kg)$/;

/** §4.2: путь ровно /vacancy/{digits}, с необязательным замыкающим слешем. */
export const HH_VACANCY_PATH_PATTERN = /^\/vacancy\/(\d+)\/?$/;

export const HH_VACANCY_ID_GROUP = 1;

/** Имена полей ответа hh.ru, которые читаем (§4.1). Остальные игнорируются. */
export const HH_VACANCY_FIELD = {
  NAME: 'name',
  ARCHIVED: 'archived',
  TYPE: 'type',
  ID: 'id',
  EMPLOYER: 'employer',
} as const;

/**
 * Статусы сравниваются с response.status (обычный number), поэтому тип сужен до number:
 * прямое сравнение number с членом enum запрещено правилом no-unsafe-enum-comparison.
 */
export const HH_OK_STATUS: number = HttpStatus.OK;
export const HH_NOT_FOUND_STATUS: number = HttpStatus.NOT_FOUND;
export const HH_RATE_LIMITED_STATUS: number = HttpStatus.TOO_MANY_REQUESTS;

/**
 * §4.6: экспоненциальный backoff 500 мс, 1500 мс. Формула base * factor^attempt
 * даёт ровно эти значения при дефолтных HH_MAX_RETRIES=2 и обобщается на случай,
 * когда лимит ретраев поднят через env (потолок — чтобы 500 * 3^9 не превратились
 * в два с половиной часа ожидания).
 */
export const HH_RETRY_BASE_DELAY_MS = 500;
export const HH_RETRY_BACKOFF_FACTOR = 3;
export const HH_RETRY_MAX_DELAY_MS = 10_000;

export const HH_INVALID_PAYLOAD_MESSAGE = 'hh.ru вернул ответ неожиданного формата';

export const HH_NOT_FOUND_MESSAGE = 'Вакансия не найдена на hh.ru: снята или удалена';

export const HH_RATE_LIMITED_MESSAGE = 'hh.ru ограничил частоту запросов';

export const HH_UPSTREAM_FAILED_MESSAGE = 'Не удалось получить данные с hh.ru';

export const HH_UNEXPECTED_STATUS_MESSAGE = 'hh.ru ответил статусом';

export const HH_TRANSPORT_ERROR_MESSAGE = 'Запрос к hh.ru не выполнен';

/** §4.3: type.id === 'closed' закрывает запись наравне с archived === true. */
export const HH_CLOSED_VACANCY_TYPE = 'closed';

export const HH_SKIPPED_NOT_HH_MESSAGE =
  'В ссылке на вакансию нет распознаваемого идентификатора hh.ru';

/**
 * Сбой уже на нашей стороне (например, отказ БД при сохранении записи). Прогон он
 * не срывает: запись получает исход ERROR, остальные обрабатываются дальше (§4.6).
 */
export const HH_SYNC_UNEXPECTED_ERROR_MESSAGE = 'Не удалось применить результат синхронизации';

export const HH_SYNC_STARTED_MESSAGE = 'Массовая синхронизация, записей к обработке';

export const HH_SYNC_FINISHED_MESSAGE = 'Массовая синхронизация завершена';
