/**
 * Все литералы модуля hh: маршрут страницы вакансии, регексы разбора URL и HTML,
 * ключи env, параметры ретраев и тексты ошибок (§4.1, §4.2, §4.6, §5.3).
 */

import { HttpStatus } from '@nestjs/common';

export const HH_ROUTE = 'hh';

export const HH_PREVIEW_ROUTE = 'preview';

export const HH_SITE_BASE_URL_ENV_KEY = 'HH_SITE_BASE_URL';

/**
 * §4.1: строго https://hh.ru/vacancy/{vacancy_id}, без query-параметров — robots.txt
 * hh.ru запрещает `Disallow: *?*` для `User-agent: *`.
 */
export const HH_VACANCY_PAGE_PATH = '/vacancy';

export const HH_USER_AGENT_ENV_KEY = 'HH_USER_AGENT';
export const HH_REQUEST_TIMEOUT_MS_ENV_KEY = 'HH_REQUEST_TIMEOUT_MS';
export const HH_MAX_RETRIES_ENV_KEY = 'HH_MAX_RETRIES';
export const HH_SYNC_CONCURRENCY_ENV_KEY = 'HH_SYNC_CONCURRENCY';
export const HH_SYNC_MIN_DELAY_MS_ENV_KEY = 'HH_SYNC_MIN_DELAY_MS';

export const USER_AGENT_HEADER = 'User-Agent';
export const ACCEPT_HEADER = 'Accept';
export const HH_ACCEPT_HEADER_VALUE = 'text/html,application/xhtml+xml';

/**
 * Тело ответа читаем как строку: дефолтный transformResponse axios не пытается
 * распарсить его как JSON (страница — HTML), и разбор получает гарантированно string.
 */
export const HH_RESPONSE_TYPE = 'text' as const;

/** Канонический URL вакансии отвечает 302 → 200 — редиректы обязаны следоваться. */
export const HH_MAX_REDIRECTS = 5;

/** Страница ~772 КБ несжатых; 4 МиБ — пятикратный запас и потолок на память. */
export const HH_MAX_RESPONSE_BYTES = 4_194_304;

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

/**
 * Содержимое <script> — raw text element по спецификации HTML: `</script>` внутри
 * невозможен, поэтому нежадный захват до первого закрывающего тега корректен.
 */
export const JSON_LD_SCRIPT_PATTERN =
  /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
export const JSON_LD_CONTENT_GROUP = 1;
export const JSON_LD_JOB_POSTING_TYPE = 'JobPosting';
export const JSON_LD_FIELD = {
  TYPE: '@type',
  TITLE: 'title',
  HIRING_ORGANIZATION: 'hiringOrganization',
  NAME: 'name',
} as const;

/**
 * Ловит "archived":"true", "archived":false и HTML-экранированные &quot;/&#34; формы
 * кавычек вокруг ключа. Консенсус этих токенов — единственный источник признака
 * архивности (§4.1): страница не отдаёт его отдельным явным полем.
 */
export const HH_ARCHIVED_FLAG_PATTERN =
  /(?:"|&quot;|&#34;)archived(?:"|&quot;|&#34;)\s*:\s*(?:"|&quot;|&#34;)?(true|false)/gi;
export const HH_ARCHIVED_FLAG_GROUP = 1;
export const HH_ARCHIVED_TRUE_TOKEN = 'true';

/** data-qa hh.ru: есть только на архивной странице. Считается ещё одним токеном true. */
export const HH_ARCHIVED_MARKER = 'vacancy-title-archived-text';

/**
 * Статусы сравниваются с response.status (обычный number), поэтому тип сужен до number:
 * прямое сравнение number с членом enum запрещено правилом no-unsafe-enum-comparison.
 */
export const HH_OK_STATUS: number = HttpStatus.OK;
export const HH_NOT_FOUND_STATUS: number = HttpStatus.NOT_FOUND;
export const HH_FORBIDDEN_STATUS: number = HttpStatus.FORBIDDEN;
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

export const HH_PAGE_UNPARSABLE_MESSAGE =
  'Страница вакансии hh.ru не распознана: не найден признак архивности';

export const HH_JSON_LD_MISSING_MESSAGE =
  'На странице вакансии нет блока JSON-LD: компания и должность не определены';

export const HH_NOT_FOUND_MESSAGE = 'Вакансия не найдена на hh.ru: снята или удалена';

export const HH_RATE_LIMITED_MESSAGE = 'hh.ru ограничил частоту запросов';

export const HH_UPSTREAM_FAILED_MESSAGE = 'Не удалось получить данные с hh.ru';

export const HH_UNEXPECTED_STATUS_MESSAGE = 'hh.ru ответил статусом';

/**
 * Отдельная ветка, а не общий HH_UNEXPECTED_STATUS_MESSAGE: 403 — самый вероятный
 * сценарий деградации после перехода на разбор страницы (блокировка по User-Agent
 * или IP), на него отдельно ссылается «Диагностика» в README.
 */
export const HH_FORBIDDEN_MESSAGE =
  'hh.ru отклонил запрос (403): проверь HH_USER_AGENT и доступность hh.ru с этой машины';

export const HH_TRANSPORT_ERROR_MESSAGE = 'Запрос к hh.ru не выполнен';

export const HH_SKIPPED_NOT_HH_MESSAGE =
  'В ссылке на вакансию нет распознаваемого идентификатора hh.ru';

/**
 * Сбой уже на нашей стороне (например, отказ БД при сохранении записи). Прогон он
 * не срывает: запись получает исход ERROR, остальные обрабатываются дальше (§4.6).
 */
export const HH_SYNC_UNEXPECTED_ERROR_MESSAGE = 'Не удалось применить результат синхронизации';

export const HH_SYNC_STARTED_MESSAGE = 'Массовая синхронизация, записей к обработке';

export const HH_SYNC_FINISHED_MESSAGE = 'Массовая синхронизация завершена';
