/**
 * Литералы модуля it-vacancies, специфичные именно для источника it-vacancies.ru:
 * путь страницы вакансии, env-ключи, регексы разбора URL/вёрстки/JSON-LD, тексты
 * ошибок (§4.2, §4.8, §4.11). Всё общее для источников (маршруты, заголовки,
 * ретраи, лимиты, поля JSON-LD) — в vacancies/vacancies.constants.ts.
 */

import type { VacancyHttpEnvKeys } from '../vacancies/vacancies.interfaces';

export const IT_VACANCIES_SITE_BASE_URL_ENV_KEY = 'IT_VACANCIES_SITE_BASE_URL';

export const IT_VACANCIES_USER_AGENT_ENV_KEY = 'IT_VACANCIES_USER_AGENT';

export const IT_VACANCIES_REQUEST_TIMEOUT_MS_ENV_KEY = 'IT_VACANCIES_REQUEST_TIMEOUT_MS';

export const IT_VACANCIES_MAX_RETRIES_ENV_KEY = 'IT_VACANCIES_MAX_RETRIES';

/** §4.11.2: свой лимит частоты, независимый от лимита hh.ru. */
export const IT_VACANCIES_MAX_REQUESTS_PER_SECOND_ENV_KEY = 'IT_VACANCIES_MAX_REQUESTS_PER_SECOND';

/** Имена env-переменных для buildVacancyHttpOptions (§4.8) — значения достаёт сам фабричный метод. */
export const IT_VACANCIES_HTTP_ENV_KEYS: VacancyHttpEnvKeys = {
  baseUrl: IT_VACANCIES_SITE_BASE_URL_ENV_KEY,
  timeoutMs: IT_VACANCIES_REQUEST_TIMEOUT_MS_ENV_KEY,
  userAgent: IT_VACANCIES_USER_AGENT_ENV_KEY,
};

export const IT_VACANCIES_ALLOWED_HOST_PATTERN = /^([a-z0-9-]+\.)*it-vacancies\.ru$/;

/**
 * §4.10: allow-list хоста CDN логотипов. Отдельная константа, а не переиспользование
 * IT_VACANCIES_ALLOWED_HOST_PATTERN, хотя значения сейчас совпадают: логотипы лежат
 * на api.it-vacancies.ru, и если CDN однажды переедет на свой домен, расширять
 * придётся только этот allow-list, не открывая сам список хостов страниц вакансий.
 */
export const IT_VACANCIES_LOGO_ALLOWED_HOST_PATTERN = /^([a-z0-9-]+\.)*it-vacancies\.ru$/;

/** §4.2: путь /vacancies/{digits} с необязательным замыкающим слешем. */
export const IT_VACANCIES_VACANCY_PATH_PATTERN = /^\/vacancies\/(\d{1,32})\/?$/;

export const IT_VACANCIES_VACANCY_ID_GROUP = 1;

export const IT_VACANCIES_VACANCY_PAGE_PATH = '/vacancies';

/**
 * §4.11.3: ссылки карточек выдачи. Внешний ID берётся отсюда, а не из JSON-LD:
 * в JobPosting выдачи нет ни id, ни URL. Каждая карточка даёт РОВНО две одинаковые
 * ссылки (обёртка логотипа и заголовок), поэтому список обязательно дедуплицируется
 * с сохранением порядка первого вхождения. Глобальный регекс — только через
 * matchAll: exec/test мутировали бы lastIndex между вызовами.
 */
export const IT_VACANCIES_SEARCH_CARD_HREF_PATTERN = /href="\/vacancies\/(\d{1,32})\/[^"]*"/g;

export const IT_VACANCIES_SEARCH_CARD_ID_GROUP = 1;

/** §4.11.3: заголовок в выдаче размечен подсветкой совпадений — <em> вырезается. */
export const IT_VACANCIES_TITLE_HIGHLIGHT_PATTERN = /<\/?em>/g;

/**
 * §4.11.6: в выдаче datePosted приходит наивным «2026-03-29 02:00:56», без смещения.
 * На странице вакансии — нормальный ISO-8601 в UTC. Первый случай доводится до ISO
 * подстановкой IT_VACANCIES_TIME_ZONE_OFFSET, второй проходит как есть.
 */
export const IT_VACANCIES_NAIVE_DATE_PATTERN = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/;

export const IT_VACANCIES_NAIVE_DATE_DAY_GROUP = 1;
export const IT_VACANCIES_NAIVE_DATE_TIME_GROUP = 2;

export const IT_VACANCIES_ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T/;

/**
 * НЕ ПРОВЕРЕНО (§4.11.6): таймзона наивной даты выдачи принята московской. Ошибка
 * сдвинет published_on максимум на сутки на границе дат и влияет только на бюджет
 * возраста лида.
 */
export const IT_VACANCIES_TIME_ZONE_OFFSET = '+03:00';

/**
 * §4.11.7: полное описание живёт в SSR-разметке, в блоке <div class="… content">.
 * В JSON-LD поле description обрезано источником (заканчивается «...»), поэтому
 * оно только фолбэк. Совпадение по одному токену `content` — чтобы правка
 * Tailwind-классов рядом не ломала разбор.
 *
 * НЕ ПРОВЕРЕНО: класс наблюдался единожды как "mt-[20px] content"; переименование
 * его апстримом молча уронит разбор до обрезанного фолбэка.
 */
export const IT_VACANCIES_CONTENT_BLOCK_OPEN_PATTERN = /<div class="[^"]*\bcontent\b[^"]*">/;

/** Токены прохода по вложенности при поиске парного </div> (it-vacancies-html.helpers.ts). */
export const IT_VACANCIES_DIV_TOKEN_PATTERN = /<div\b|<\/div\s*>/gi;

export const IT_VACANCIES_DIV_CLOSE_TOKEN_PREFIX = '</';

/**
 * §4.3: НЕ ПРОВЕРЕНО — ни на одной живой странице маркера «вакансия закрыта» нет,
 * признак archived_at/is_active существует только внутри минифицированного
 * window.__NUXT__, а его вычислять запрещено (§2.4). Проектное допущение: снятая
 * вакансия отвечает 404 → исход NOT_FOUND. Этот регекс — задокументированная
 * эвристика на случай, если источник всё же рисует маркер, а не проверенный контракт.
 */
export const IT_VACANCIES_ARCHIVED_MARKER_PATTERN =
  /вакансия\s+(закрыта|снята\s+с\s+публикации|в\s+архиве)/i;

export const IT_VACANCIES_SEARCH_PAGE_PLACEHOLDER = '{page}';

export const IT_VACANCIES_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN = /\{page\}/;

export const IT_VACANCIES_SEARCH_URL_ALLOWED_PROTOCOL = 'https:';

/** §4.11.1: страницы источника нумеруются с единицы, цикл прогона — с нуля. */
export const IT_VACANCIES_FIRST_PAGE_NUMBER = 1;

/**
 * Поля JSON-LD, которых нет в общем JSON_LD_FIELD (vacancies/): их читает только
 * разбор страниц it-vacancies.ru.
 */
export const IT_VACANCIES_JSON_LD_FIELD = {
  LOGO: 'logo',
  JOB_LOCATION: 'jobLocation',
  ADDRESS: 'address',
  ADDRESS_LOCALITY: 'addressLocality',
  BASE_SALARY: 'baseSalary',
  VALUE: 'value',
  MIN_VALUE: 'minValue',
  MAX_VALUE: 'maxValue',
  DATE_POSTED: 'datePosted',
} as const;

/** §4.11.3: jobLocation.address бывает строкой «Москва, метро …» — берём часть до запятой. */
export const IT_VACANCIES_ADDRESS_SEPARATOR = ',';

/**
 * §4.11.3: после вырезки <em> из заголовка выдачи в строке остаются сдвоенные
 * пробелы и переводы строк исходной разметки — колонка position хранит одну строку.
 */
export const IT_VACANCIES_WHITESPACE_RUN_PATTERN = /\s+/g;

export const IT_VACANCIES_NOT_FOUND_MESSAGE =
  'Вакансия не найдена на it-vacancies.ru: снята или удалена';

export const IT_VACANCIES_PAGE_UNPARSABLE_MESSAGE =
  'Страница вакансии it-vacancies.ru не распознана: не найден блок JobPosting';

export const IT_VACANCIES_JSON_LD_MISSING_MESSAGE =
  'На странице it-vacancies.ru нет блока application/ld+json';

export const IT_VACANCIES_RATE_LIMITED_MESSAGE = 'it-vacancies.ru ограничил частоту запросов';

/**
 * Отдельная ветка, а не общий IT_VACANCIES_UNEXPECTED_STATUS_MESSAGE: 403 — самый
 * вероятный сценарий деградации (блокировка по User-Agent или IP), зеркало
 * HH_FORBIDDEN_MESSAGE/GETMATCH_FORBIDDEN_MESSAGE.
 */
export const IT_VACANCIES_FORBIDDEN_MESSAGE =
  'it-vacancies.ru отклонил запрос (403): проверь IT_VACANCIES_USER_AGENT и доступность it-vacancies.ru с этой машины';

export const IT_VACANCIES_UNEXPECTED_STATUS_MESSAGE = 'it-vacancies.ru ответил статусом';

export const IT_VACANCIES_TRANSPORT_ERROR_MESSAGE = 'Запрос к it-vacancies.ru не выполнен';

export const IT_VACANCIES_SEARCH_PAGE_UNPARSABLE_MESSAGE =
  'Страница выдачи it-vacancies.ru не распознана';

/**
 * §4.11.3: число JobPosting в JSON-LD не совпало с числом ссылок карточек —
 * сопоставление по индексу перестало быть безопасным, и прогон обязан
 * остановиться, а не привязать чужие ID к чужим вакансиям.
 */
export const IT_VACANCIES_SEARCH_CARD_COUNT_MISMATCH_MESSAGE =
  'Разметка выдачи it-vacancies.ru изменилась: число вакансий в JSON-LD не совпало с числом ссылок карточек';

export const IT_VACANCIES_SEARCH_DESCRIPTION_MISSING_MESSAGE =
  'Не удалось получить описание вакансии it-vacancies.ru';
