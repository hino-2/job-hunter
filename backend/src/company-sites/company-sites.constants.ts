/**
 * §4.14: литералы общие для всего модуля company-sites/ — env-ключи транспорта,
 * лимиты, имена таблицы/колонок/маршрутов ресурса company-career-sites, паттерны
 * разбора HTML и тексты сообщений. Per-parser литералы (хосты, эндпойнты, регексы
 * разметки) живут в parsers/<key>/<key>.constants.ts — этот файл их не знает.
 */

export const COMPANY_SITE_USER_AGENT_ENV_KEY = 'COMPANY_SITE_USER_AGENT';
export const COMPANY_SITE_REQUEST_TIMEOUT_MS_ENV_KEY = 'COMPANY_SITE_REQUEST_TIMEOUT_MS';
export const COMPANY_SITE_MAX_RETRIES_ENV_KEY = 'COMPANY_SITE_MAX_RETRIES';
export const COMPANY_SITE_MAX_REQUESTS_PER_SECOND_ENV_KEY = 'COMPANY_SITE_MAX_REQUESTS_PER_SECOND';

/**
 * §4.14: у company-sites/ нет baseUrl намеренно — единого базового хоста нет, каждый
 * парсер ходит на свой константный хост (или, у hh-search, на абсолютный URL строки
 * CompanyCareerSite). VacancyHttpEnvKeys.baseUrl опционален ровно ради этого (§4.14/B1).
 */
export const COMPANY_SITE_HTTP_ENV_KEYS = {
  timeoutMs: COMPANY_SITE_REQUEST_TIMEOUT_MS_ENV_KEY,
  userAgent: COMPANY_SITE_USER_AGENT_ENV_KEY,
};

/**
 * §4.11.1/§4.14: сайты компаний не читают настройки поиска (нет своего поискового
 * запроса — ключевые слова профиля заменяют его целиком, §4.11.4), поэтому колонки
 * шаблона в vacancy_search_settings у них нет. Сентинел — фиксированная строка,
 * проходящая через isValidSearchUrlTemplate/buildSearchUrlTemplateBySource тем же
 * контрактом Record<VacancyLeadSearchSource, string>, что и у остальных источников,
 * ничего не означая по содержанию.
 */
export const COMPANY_SITE_SEARCH_URL_TEMPLATE_SENTINEL = 'company-sites';

/**
 * §4.14: потолок числа страниц списка на одну компанию за один прогон —
 * ponytail-ограничение (см. collectPagedVacancies, company-sites.helpers.ts):
 * добросовестные источники (§4.14 — планируемые JSON-эндпоинты Stage 3) отдают
 * заметно меньше страниц, а зацикленный список останавливается здесь, а не листает
 * вечно в рамках бюджета всего прогона (VACANCY_SCAN_MAX_PAGES).
 */
export const COMPANY_SITE_MAX_LIST_PAGES = 50;

/**
 * §4.14/D11: текст короче этого порога считается пустой SPA-оболочкой (описание не
 * отрендерилось на сервере) — fail-closed, а не сохранение вакансии без описания.
 */
export const COMPANY_SITE_MIN_DESCRIPTION_CHARS = 200;

export const COMPANY_CAREER_SITES_TABLE = 'company_career_sites';

/** Свойство сущности CompanyCareerSite → имя колонки в БД. */
export const COMPANY_CAREER_SITE_COLUMN = {
  ID: 'id',
  NAME: 'name',
  URL: 'url',
  CREATED_AT: 'created_at',
  UPDATED_AT: 'updated_at',
} as const;

export const COMPANY_CAREER_SITES_ROUTE = 'company-career-sites';
export const COMPANY_CAREER_SITE_ID_PARAM = 'id';
export const COMPANY_CAREER_SITE_BY_ID_ROUTE = ':id';

/** §5.9: GET отдаёт список, отсортированный по имени — стабильный порядок для UI-таблицы. */
export const COMPANY_CAREER_SITES_ORDER = { name: 'ASC', id: 'ASC' } as const;

/**
 * §5.9: те же правила, что URL_VALIDATION_OPTIONS (applications.constants.ts), но
 * require_protocol: true — строка сайта компании не пользовательская ссылка на
 * конкретную вакансию (там разрешена схема по умолчанию), а адрес, который парсеры
 * читают буквально (CompanySiteParserRegistry.resolve, SSRF-граница §4.14), поэтому
 * схема обязана присутствовать явно.
 *
 * Копия предупреждения URL_VALIDATION_OPTIONS: передавать в @IsUrl только КОПИЮ
 * ({ ...COMPANY_CAREER_SITE_URL_VALIDATION_OPTIONS }) — validator мутирует объект.
 */
export const COMPANY_CAREER_SITE_URL_VALIDATION_OPTIONS = Object.freeze({
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: true,
});

/**
 * §4.14/D11: HTML описания вакансии сайта компании → plain text. Порядок вырезки —
 * script/style/noscript целиком (их содержимое не текст страницы), затем предпочтение
 * <main> над <body> над всем документом (см. extractPageText, company-sites.helpers.ts).
 */
export const HTML_SCRIPT_STYLE_BLOCK_PATTERN = /<(script|style|noscript)\b[\s\S]*?<\/\1>/gi;
export const HTML_MAIN_BLOCK_PATTERN = /<main\b[^>]*>([\s\S]*?)<\/main>/i;
export const HTML_BODY_BLOCK_PATTERN = /<body\b[^>]*>([\s\S]*?)<\/body>/i;

export const MD5_ALGORITHM = 'md5';
export const HEX_ENCODING = 'hex';

export const COMPANY_CAREER_SITE_NOT_FOUND_MESSAGE = 'Сайт компании не найден';

export const COMPANY_SITE_TRANSPORT_ERROR_MESSAGE = 'Запрос к сайту компании не выполнен';
export const COMPANY_SITE_UNEXPECTED_STATUS_MESSAGE = 'Сайт компании ответил статусом';
export const COMPANY_SITE_RATE_LIMITED_MESSAGE = 'Сайт компании ограничил частоту запросов';
export const COMPANY_SITE_NOT_FOUND_MESSAGE = 'Страница на сайте компании не найдена';
export const COMPANY_SITE_NOT_HTML_MESSAGE = 'Ответ сайта компании не HTML';
export const COMPANY_SITE_DESCRIPTION_MISSING_MESSAGE =
  'Не удалось получить описание вакансии с сайта компании';
export const COMPANY_SITE_PARSER_MISSING_MESSAGE = 'Парсер сайта компании не реализован';
export const COMPANY_SITE_LIST_FAILED_MESSAGE = 'Не удалось прочитать список сайтов компаний';
