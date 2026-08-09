/**
 * Литералы модуля getmatch, специфичные именно для источника getmatch.ru: путь
 * страницы вакансии, env-ключи, регексы разбора URL и flight-payload, тексты
 * ошибок (§4.2, §4.9, §5.3). Всё общее для источников (маршруты, заголовки,
 * ретраи, лимиты) — в vacancies/vacancies.constants.ts.
 */

import type { VacancyHttpEnvKeys } from '../vacancies/vacancies.interfaces';

export const GETMATCH_SITE_BASE_URL_ENV_KEY = 'GETMATCH_SITE_BASE_URL';

export const GETMATCH_USER_AGENT_ENV_KEY = 'GETMATCH_USER_AGENT';

export const GETMATCH_REQUEST_TIMEOUT_MS_ENV_KEY = 'GETMATCH_REQUEST_TIMEOUT_MS';

export const GETMATCH_MAX_RETRIES_ENV_KEY = 'GETMATCH_MAX_RETRIES';

/** Имена env-переменных для buildVacancyHttpOptions (§4.9) — значения достаёт сам фабричный метод. */
export const GETMATCH_HTTP_ENV_KEYS: VacancyHttpEnvKeys = {
  baseUrl: GETMATCH_SITE_BASE_URL_ENV_KEY,
  timeoutMs: GETMATCH_REQUEST_TIMEOUT_MS_ENV_KEY,
  userAgent: GETMATCH_USER_AGENT_ENV_KEY,
};

/**
 * §4.9 (разведка): слаг необязателен — /vacancies/{id} отдаёт ту же страницу без
 * редиректа, ровно как HH_VACANCY_PAGE_PATH.
 */
export const GETMATCH_VACANCY_PAGE_PATH = '/vacancies';

export const GETMATCH_ALLOWED_HOST_PATTERN = /^(www\.)?getmatch\.ru$/;

/** §4.9: путь /vacancies/{digits} с необязательным «-{slug}» и замыкающим слешем. */
export const GETMATCH_VACANCY_PATH_PATTERN = /^\/vacancies\/(\d+)(?:-[^/]*)?\/?$/;

export const GETMATCH_VACANCY_ID_GROUP = 1;

/**
 * Чанк flight-payload Next.js (§4.9, §9). Якорь `)</script>` обязателен: содержимое
 * <script> — raw text element по спецификации HTML, `</script>` внутри невозможен,
 * а без якоря нежадный `\])` обрывался бы на первом же «])» внутри строки
 * offer_description. Использовать только через matchAll — exec/test на этом
 * глобальном регексе мутируют lastIndex между вызовами.
 */
export const GETMATCH_FLIGHT_CHUNK_PATTERN =
  /self\.__next_f\.push\((\[[\s\S]*?\])\)\s*<\/script>/g;

export const GETMATCH_FLIGHT_CHUNK_GROUP = 1;

export const GETMATCH_FLIGHT_PAYLOAD_INDEX = 1;

export const GETMATCH_INITIAL_VACANCY_KEY = '"initialVacancy":';

export const GETMATCH_NULL_TOKEN = 'null';

export const GETMATCH_OBJECT_OPEN = '{';

export const GETMATCH_OBJECT_CLOSE = '}';

export const GETMATCH_STRING_QUOTE = '"';

export const GETMATCH_STRING_ESCAPE = '\\';

/** JSON-пробелы между «:» и значением (пробел, табуляция, CR, LF) — та же грамматика, что у JSON.parse. */
export const GETMATCH_WHITESPACE_PATTERN = /\s/;

export const GETMATCH_FIELD = {
  IS_ACTIVE: 'is_active',
  POSITION: 'position',
  COMPANY: 'company',
  NAME: 'name',
} as const;

export const GETMATCH_PAGE_STATE = {
  PARSED: 'PARSED',
  ABSENT: 'ABSENT',
  UNPARSABLE: 'UNPARSABLE',
} as const;

export const GETMATCH_NOT_FOUND_MESSAGE = 'Вакансия не найдена на getmatch.ru: снята или удалена';

export const GETMATCH_PAGE_UNPARSABLE_MESSAGE =
  'Страница вакансии getmatch.ru не распознана: не найден блок initialVacancy';

export const GETMATCH_RATE_LIMITED_MESSAGE = 'getmatch.ru ограничил частоту запросов';

/**
 * Отдельная ветка, а не общий GETMATCH_UNEXPECTED_STATUS_MESSAGE: 403 — самый вероятный
 * сценарий деградации (блокировка по User-Agent или IP), на него отдельно ссылается
 * «Диагностика» в README (зеркало HH_FORBIDDEN_MESSAGE).
 */
export const GETMATCH_FORBIDDEN_MESSAGE =
  'getmatch.ru отклонил запрос (403): проверь GETMATCH_USER_AGENT и доступность getmatch.ru с этой машины';

export const GETMATCH_UNEXPECTED_STATUS_MESSAGE = 'getmatch.ru ответил статусом';

export const GETMATCH_TRANSPORT_ERROR_MESSAGE = 'Запрос к getmatch.ru не выполнен';
