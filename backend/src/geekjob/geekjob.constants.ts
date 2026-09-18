/**
 * Литералы модуля geekjob (§4.13): путь страницы вакансии, env-ключи, регексы
 * разбора URL/вёрстки/JSON, тексты ошибок (§4.2, §4.8, §4.11). Всё общее для
 * источников (маршруты, заголовки, ретраи, лимиты) — в vacancies/vacancies.constants.ts.
 */

import type { VacancyHttpEnvKeys } from '../vacancies/vacancies.interfaces';

export const GEEKJOB_SITE_BASE_URL_ENV_KEY = 'GEEKJOB_SITE_BASE_URL';

export const GEEKJOB_USER_AGENT_ENV_KEY = 'GEEKJOB_USER_AGENT';

export const GEEKJOB_REQUEST_TIMEOUT_MS_ENV_KEY = 'GEEKJOB_REQUEST_TIMEOUT_MS';

export const GEEKJOB_MAX_RETRIES_ENV_KEY = 'GEEKJOB_MAX_RETRIES';

/** §4.11.2: свой лимит частоты, независимый от остальных источников. */
export const GEEKJOB_MAX_REQUESTS_PER_SECOND_ENV_KEY = 'GEEKJOB_MAX_REQUESTS_PER_SECOND';

/** Имена env-переменных для buildVacancyHttpOptions (§4.8) — значения достаёт сам фабричный метод. */
export const GEEKJOB_HTTP_ENV_KEYS: VacancyHttpEnvKeys = {
  baseUrl: GEEKJOB_SITE_BASE_URL_ENV_KEY,
  timeoutMs: GEEKJOB_REQUEST_TIMEOUT_MS_ENV_KEY,
  userAgent: GEEKJOB_USER_AGENT_ENV_KEY,
};

export const GEEKJOB_ALLOWED_HOST_PATTERN = /^([a-z0-9-]+\.)*geekjob\.ru$/;

/**
 * §4.10: allow-list хоста логотипов. Отдельная константа, а не переиспользование
 * GEEKJOB_ALLOWED_HOST_PATTERN, хотя значения сейчас совпадают: логотипы лежат на
 * geekjob.ru же (/storage/company/…), и если CDN однажды переедет на свой домен,
 * расширять придётся только этот allow-list.
 */
export const GEEKJOB_LOGO_ALLOWED_HOST_PATTERN = /^([a-z0-9-]+\.)*geekjob\.ru$/;

/**
 * §4.2/§4.13: путь /vacancy/{24-hex} с необязательным замыкающим слешем. Короткая
 * ссылка вида geekjob.ru/hiei этим шаблоном не распознаётся (нужен бы был ещё один
 * сетевой запрос на резолв) — такая ссылка получает SKIPPED_UNSUPPORTED, что
 * задокументировано в §4.13.
 */
export const GEEKJOB_VACANCY_PATH_PATTERN = /^\/vacancy\/([0-9a-f]{24})\/?$/i;

export const GEEKJOB_VACANCY_ID_GROUP = 1;

export const GEEKJOB_VACANCY_PAGE_PATH = '/vacancy';

export const GEEKJOB_SEARCH_JSON_PATH = '/json/find/vacancy';

/** §4.11.3: формат id-поля документа JSON выдачи — тот же 24-hex, что и в пути страницы. */
export const GEEKJOB_SEARCH_ITEM_ID_PATTERN = /^[0-9a-f]{24}$/i;

// --- Разбор страницы вакансии (§4.13) ---

/** Ровно один <h1> на странице (проверено на живых образцах) — безопасный якорь заголовка. */
export const GEEKJOB_TITLE_PATTERN = /<h1[^>]*>([\s\S]*?)<\/h1>/;

/**
 * §4.13: якорь строго на <h5 class="… company-name …">, а НЕ просто на класс
 * company-name — в блоке «похожие вакансии» тот же класс висит на <p> карточек
 * ЧУЖИХ компаний (gj_vac.html), и совпадение по классу без тега прихватило бы
 * компанию из сайдбара вместо текущей вакансии.
 */
export const GEEKJOB_COMPANY_BLOCK_PATTERN =
  /<h5[^>]*class="[^"]*\bcompany-name\b[^"]*"[^>]*>([\s\S]*?)<\/h5>/;

/** Первый <a> внутри блока компании — сама компания; второй (id="company-web") — её сайт. */
export const GEEKJOB_FIRST_ANCHOR_PATTERN = /<a\b[^>]*>([\s\S]*?)<\/a>/;

/**
 * §4.13: логотип ТЕКУЩЕЙ вакансии живёт строго в #logo-box. Никогда не сопоставлять
 * по классу company-list-logo — тот принадлежит карточкам «похожих вакансий» ДРУГИХ
 * компаний в сайдбаре (gj_vac.html: company-list-logo встречается только там).
 */
export const GEEKJOB_LOGO_BOX_PATTERN = /<div[^>]*id="logo-box"[^>]*>([\s\S]*?)<\/div>/;

export const GEEKJOB_BACKGROUND_IMAGE_URL_PATTERN =
  /background-image\s*:\s*url\(\s*['"]?([^'")]+)['"]?\s*\)/;

export const GEEKJOB_DESCRIPTION_BLOCK_OPEN_PATTERN = /<div[^>]*id="vacancy-description"[^>]*>/;

export const GEEKJOB_WHITESPACE_RUN_PATTERN = /\s+/g;

/**
 * §4.3/§4.13: НЕ ПРОВЕРЕНО — маркер архива на живой странице не наблюдался ни разу
 * (проверено на актуальной и на архивной 2022 года — обе отвечают 200 без какого-либо
 * текста о снятии вакансии). Проектное допущение: снятая/удалённая вакансия отвечает
 * 404 → исход NOT_FOUND. Этот регекс — задокументированная эвристика на случай, если
 * источник всё же начнёт рисовать маркер, а не проверенный контракт.
 */
export const GEEKJOB_ARCHIVED_MARKER_PATTERN =
  /вакансия\s+(закрыта|снята\s+с\s+публикации|в\s+архиве)/i;

// --- JSON выдачи (§4.11.3/§4.13) ---

export const GEEKJOB_SEARCH_FIELD = {
  DATA: 'data',
  PAGE_COUNT: 'pagecount',
  ID: 'id',
  POSITION: 'position',
  SALARY: 'salary',
  COUNTRY: 'country',
  CITY: 'city',
  JOB_FORMAT: 'jobFormat',
  LOG: 'log',
  ARCHIVED: 'archived',
  COMPANY: 'company',
  NAME: 'name',
  SORT_ORDER: 'sortOrder',
} as const;

export const GEEKJOB_JOB_FORMAT_FIELD = {
  REMOTE: 'remote',
  RELOCATE: 'relocate',
  PARTTIME: 'parttime',
  INHOUSE: 'inhouse',
} as const;

export const GEEKJOB_WORK_FORMAT_LABELS = {
  remote: 'Удалённо',
  inhouse: 'В офисе',
  parttime: 'Частичная занятость',
  relocate: 'Релокация',
} as const;

export const GEEKJOB_WORK_FORMATS_SEPARATOR = ', ';

/** §4.13: sortOrder — YYYYMMDD, дата последнего поднятия вакансии, источник истины для publishedAtIso. */
export const GEEKJOB_SORT_ORDER_PATTERN = /^(\d{4})(\d{2})(\d{2})$/;

export const GEEKJOB_SORT_ORDER_YEAR_GROUP = 1;
export const GEEKJOB_SORT_ORDER_MONTH_GROUP = 2;
export const GEEKJOB_SORT_ORDER_DAY_GROUP = 3;

/** НЕ ПРОВЕРЕНО (§4.11.6), как и IT_VACANCIES_TIME_ZONE_OFFSET: таймзона принята московской. */
export const GEEKJOB_TIME_ZONE_OFFSET = '+03:00';

export const GEEKJOB_DAY_START_TIME = 'T00:00:00';

// --- Разбор оклада (§4.13): короткая форма выдачи "100K — 180K ₽", "от 800 €", "27.2K ₽" ---

export const GEEKJOB_SALARY_RANGE_SEPARATOR_PATTERN = /[—–-]/;

export const GEEKJOB_SALARY_NUMBER_PATTERN = /(\d+(?:[.,]\d+)?)\s*([KkКк])?/;

export const GEEKJOB_SALARY_THOUSAND_SUFFIX_PATTERN = /[KkКк]/;

export const GEEKJOB_SALARY_THOUSAND_MULTIPLIER = 1000;

export const GEEKJOB_SALARY_CURRENCY_BY_SYMBOL = {
  '₽': 'RUR',
  $: 'USD',
  '€': 'EUR',
} as const;

export const GEEKJOB_SALARY_FROM_PREFIX = 'от';
export const GEEKJOB_SALARY_TO_PREFIX = 'до';

// --- Шаблон ссылки на выдачу (§4.11.1/§5.7) ---

export const GEEKJOB_SEARCH_PAGE_PLACEHOLDER = '{page}';

export const GEEKJOB_SEARCH_URL_PAGE_PLACEHOLDER_PATTERN = /\{page\}/;

export const GEEKJOB_SEARCH_URL_ALLOWED_PROTOCOL = 'https:';

/** §4.11.1: источник нумерует страницы с единицы, цикл прогона — с нуля. */
export const GEEKJOB_FIRST_PAGE_NUMBER = 1;

// --- Сообщения (§10) ---

export const GEEKJOB_NOT_FOUND_MESSAGE = 'Вакансия не найдена на geekjob.ru: снята или удалена';

export const GEEKJOB_PAGE_UNPARSABLE_MESSAGE =
  'Страница вакансии geekjob.ru не распознана: не найден заголовок вакансии';

export const GEEKJOB_RATE_LIMITED_MESSAGE = 'geekjob.ru ограничил частоту запросов';

export const GEEKJOB_FORBIDDEN_MESSAGE =
  'geekjob.ru отклонил запрос (403): проверь GEEKJOB_USER_AGENT и доступность geekjob.ru с этой машины';

export const GEEKJOB_UNEXPECTED_STATUS_MESSAGE = 'geekjob.ru ответил статусом';

export const GEEKJOB_TRANSPORT_ERROR_MESSAGE = 'Запрос к geekjob.ru не выполнен';

export const GEEKJOB_SEARCH_PAGE_UNPARSABLE_MESSAGE = 'Ответ поиска geekjob.ru не распознан';

export const GEEKJOB_SEARCH_DESCRIPTION_MISSING_MESSAGE =
  'Не удалось получить описание вакансии geekjob.ru';
