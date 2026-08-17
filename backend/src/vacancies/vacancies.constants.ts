/**
 * Литералы, общие для всех источников вакансий: маршруты, HTTP-заголовки и лимиты,
 * параметры ретраев (§4.6), env-ключи массового прогона и тексты. Per-source остаются
 * только env-ключи, путь страницы и тексты сообщений — они живут в hh/ и getmatch/.
 */

import { VACANCY_SOURCE } from '../applications/applications.constants';

export const VACANCIES_ROUTE = 'vacancies';

export const VACANCY_PREVIEW_ROUTE = 'preview';

export const SYNC_CONCURRENCY_ENV_KEY = 'SYNC_CONCURRENCY';
export const SYNC_MIN_DELAY_MS_ENV_KEY = 'SYNC_MIN_DELAY_MS';

export const USER_AGENT_HEADER = 'User-Agent';
export const ACCEPT_HEADER = 'Accept';
export const VACANCY_ACCEPT_HEADER_VALUE = 'text/html,application/xhtml+xml';

/**
 * Тело ответа читаем как строку: дефолтный transformResponse axios не пытается
 * распарсить его как JSON (страница — HTML), и разбор получает гарантированно string.
 */
export const VACANCY_RESPONSE_TYPE = 'text' as const;

/** Канонический URL вакансии может отвечать 302 → 200 — редиректы обязаны следоваться. */
export const VACANCY_MAX_REDIRECTS = 5;

/** Страницы вакансий ~300–800 КБ несжатых; 4 МиБ — запас с потолком на память. */
export const VACANCY_MAX_RESPONSE_BYTES = 4_194_304;

/** Схема подставляется парсером, если пользователь вставил ссылку без неё (§4.2). */
export const VACANCY_DEFAULT_SCHEME = 'https://';

/**
 * «Строка начинается со схемы» — по грамматике RFC 3986 (ALPHA *( ALPHA / DIGIT / + / - / . ) ':').
 * Нужен, чтобы отличить «hh.ru/vacancy/1» (схемы нет, дописываем https://) от
 * «mailto:hh.ru/vacancy/1» (схема есть, но не http/https — такой URL отбраковывается).
 */
export const URL_SCHEME_PATTERN = /^[a-z][a-z0-9+.-]*:/i;

/** Только http/https: javascript:, file:, data: не должны считаться ссылкой на вакансию. */
export const VACANCY_ALLOWED_PROTOCOLS = ['http:', 'https:'];

/**
 * §4.6: экспоненциальный backoff 500 мс, 1500 мс. Формула base * factor^attempt
 * даёт ровно эти значения при дефолтном MAX_RETRIES=2 и обобщается на случай,
 * когда лимит ретраев поднят через env (потолок — чтобы 500 * 3^9 не превратились
 * в два с половиной часа ожидания).
 */
export const VACANCY_RETRY_BASE_DELAY_MS = 500;
export const VACANCY_RETRY_BACKOFF_FACTOR = 3;
export const VACANCY_RETRY_MAX_DELAY_MS = 10_000;

/**
 * Порядок опроса провайдеров в resolveByUrl. Наборы хостов не пересекаются — порядок
 * не критичен, но список обязан покрывать все значения VACANCY_SOURCE: источник,
 * забытый здесь, молча перестал бы распознаваться в ссылках.
 */
export const VACANCY_SOURCE_ORDER = [VACANCY_SOURCE.HH, VACANCY_SOURCE.GETMATCH] as const;

export const VACANCY_SKIPPED_UNSUPPORTED_MESSAGE =
  'В ссылке на вакансию нет поддерживаемого источника (hh.ru или getmatch.ru)';

export const VACANCY_UNKNOWN_SOURCE_MESSAGE = 'Источник вакансии не поддерживается этой версией';

export const VACANCY_UPSTREAM_FAILED_MESSAGE = 'Не удалось получить данные о вакансии';

export const SYNC_STARTED_MESSAGE = 'Массовая синхронизация, записей к обработке';

export const SYNC_FINISHED_MESSAGE = 'Массовая синхронизация завершена';

/**
 * Сбой уже на нашей стороне (например, отказ БД при сохранении записи). Прогон он
 * не срывает: запись получает исход ERROR, остальные обрабатываются дальше (§4.6).
 */
export const SYNC_UNEXPECTED_ERROR_MESSAGE = 'Не удалось применить результат синхронизации';

/** §4.4/§4.10: докачка логотипа сразу после создания записи — только debug/warn в лог. */
export const CREATE_LOGO_DOWNLOADED_MESSAGE = 'Логотип компании скачан при создании записи';

export const CREATE_LOGO_FAILED_MESSAGE = 'Не удалось скачать логотип компании при создании записи';
