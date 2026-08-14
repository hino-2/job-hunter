/**
 * Литералы модуля hh, специфичные именно для источника hh.ru: путь страницы вакансии,
 * env-ключи, регексы разбора URL и HTML, тексты ошибок (§4.1, §4.2, §5.3). Всё общее
 * для источников (маршруты, заголовки, ретраи, лимиты) — в vacancies/vacancies.constants.ts.
 */

export const HH_SITE_BASE_URL_ENV_KEY = 'HH_SITE_BASE_URL';

/**
 * §4.1: строго https://hh.ru/vacancy/{vacancy_id}, без query-параметров — robots.txt
 * hh.ru запрещает `Disallow: *?*` для `User-agent: *`.
 */
export const HH_VACANCY_PAGE_PATH = '/vacancy';

export const HH_USER_AGENT_ENV_KEY = 'HH_USER_AGENT';
export const HH_REQUEST_TIMEOUT_MS_ENV_KEY = 'HH_REQUEST_TIMEOUT_MS';
export const HH_MAX_RETRIES_ENV_KEY = 'HH_MAX_RETRIES';

/** §4.11.2: общий троттл всех запросов к hh.ru (HhRequestThrottle). */
export const HH_MAX_REQUESTS_PER_SECOND_ENV_KEY = 'HH_MAX_REQUESTS_PER_SECOND';

/** Основание пересчёта «запросов в секунду» в миллисекунды между стартами. */
export const MS_PER_SECOND = 1_000;

/** Имена env-переменных для buildVacancyHttpOptions (§4.1) — значения достаёт сам фабричный метод. */
export const HH_HTTP_ENV_KEYS = {
  baseUrl: HH_SITE_BASE_URL_ENV_KEY,
  timeoutMs: HH_REQUEST_TIMEOUT_MS_ENV_KEY,
  userAgent: HH_USER_AGENT_ENV_KEY,
};

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
 * §4.10: варианты логотипа компании из встроенного состояния страницы —
 * "logos":{"logo":[{"@type":"vacancyPage","@url":"/employer-logo/7085359.png"}, …]}.
 * У <img> внутри data-qa="vacancy-company-logo" атрибута src в ответе сервера нет:
 * картинку подставляет клиентский JS из этого же блока, поэтому разбирать надо его,
 * а не разметку. JSON приезжает в HTML экранированным (&#34;), отсюда все три формы
 * кавычек — та же причина, что у HH_ARCHIVED_FLAG_PATTERN. Класс символов URL
 * исключает & и кавычки, поэтому захват обрывается на следующей энтити и не может
 * съесть остаток страницы. Глобальный регекс безопасен именно с matchAll:
 * lastIndex не мутируется между вызовами.
 */
export const HH_COMPANY_LOGO_ENTRY_PATTERN =
  /(?:"|&quot;|&#34;)@type(?:"|&quot;|&#34;)\s*:\s*(?:"|&quot;|&#34;)([\w-]+)(?:"|&quot;|&#34;)\s*,\s*(?:"|&quot;|&#34;)@url(?:"|&quot;|&#34;)\s*:\s*(?:"|&quot;|&#34;)([^"'&\\\s]+)/gi;

export const HH_COMPANY_LOGO_TYPE_GROUP = 1;
export const HH_COMPANY_LOGO_URL_GROUP = 2;

/**
 * §4.10: приоритет вариантов логотипа. vacancyPage и medium — ровно те картинки,
 * что hh.ru рисует на самой странице вакансии; ORIGINAL последний, потому что он
 * не масштабирован и легко не пролезает в лимит размера файла, а тогда логотипа
 * не будет вовсе. Сравнение идёт по нижнему регистру: у hh.ru тип ORIGINAL
 * записан капсом, остальные — camelCase.
 */
export const HH_COMPANY_LOGO_TYPE_PRIORITY = [
  'vacancypage',
  'medium',
  'employerpage',
  'searchresultspage',
  'small',
  'original',
];

/** §4.10: allow-list хостов CDN hh.ru — логотипы раздаются с hhcdn.ru и поддоменов. */
export const HH_LOGO_ALLOWED_HOST_PATTERN = /^([a-z0-9-]+\.)*(hhcdn\.ru|hh\.ru)$/;

export const HH_PAGE_UNPARSABLE_MESSAGE =
  'Страница вакансии hh.ru не распознана: не найден признак архивности';

export const HH_JSON_LD_MISSING_MESSAGE =
  'На странице вакансии нет блока JSON-LD: компания и должность не определены';

export const HH_NOT_FOUND_MESSAGE = 'Вакансия не найдена на hh.ru: снята или удалена';

export const HH_RATE_LIMITED_MESSAGE = 'hh.ru ограничил частоту запросов';

export const HH_UNEXPECTED_STATUS_MESSAGE = 'hh.ru ответил статусом';

/**
 * Отдельная ветка, а не общий HH_UNEXPECTED_STATUS_MESSAGE: 403 — самый вероятный
 * сценарий деградации после перехода на разбор страницы (блокировка по User-Agent
 * или IP), на него отдельно ссылается «Диагностика» в README.
 */
export const HH_FORBIDDEN_MESSAGE =
  'hh.ru отклонил запрос (403): проверь HH_USER_AGENT и доступность hh.ru с этой машины';

export const HH_TRANSPORT_ERROR_MESSAGE = 'Запрос к hh.ru не выполнен';
