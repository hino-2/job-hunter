/**
 * Литералы модуля logos (§4.10): скачивание, валидация и хранение логотипов компаний.
 * Модуль ничего не знает про Application/§4.3 — здесь только его собственные правила
 * (лимиты, белый список Content-Type, паттерны имени файла) и env-ключи.
 */

export const COMPANY_LOGO_DIR_ENV_KEY = 'COMPANY_LOGO_DIR';

export const COMPANY_LOGO_REQUEST_TIMEOUT_MS_ENV_KEY = 'COMPANY_LOGO_REQUEST_TIMEOUT_MS';

/**
 * Имена env-переменных для buildCompanyLogoHttpOptions. baseURL здесь нет — в отличие
 * от vacancies/hh/getmatch, URL логотипа абсолютный и приходит от парсера страницы
 * (§4.10), а не собирается из base + путь.
 */
export const COMPANY_LOGO_HTTP_ENV_KEYS = {
  timeoutMs: COMPANY_LOGO_REQUEST_TIMEOUT_MS_ENV_KEY,
};

/** 512 КиБ — щедрый запас над типичным логотипом-иконкой компании, но не бесконечность (DoS). */
export const COMPANY_LOGO_MAX_BYTES = 524_288;

export const COMPANY_LOGO_MAX_REDIRECTS = 3;

export const COMPANY_LOGO_RESPONSE_TYPE = 'arraybuffer' as const;

export const ACCEPT_HEADER_NAME = 'Accept';

export const COMPANY_LOGO_ACCEPT_HEADER_VALUE = 'image/*';

/**
 * Белый список Content-Type → расширение файла на диске. svg сюда намеренно не входит
 * (§4.10, §8 критичных моментов блюпринта): SVG умеет носить скрипт, а hh.ru/getmatch.ru
 * логотипы компаний отдают только растровыми форматами.
 */
export const COMPANY_LOGO_CONTENT_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
} as const;

/** Обратная карта для чтения (§4.10): расширение файла на диске → Content-Type ответа. */
export const COMPANY_LOGO_EXTENSION_CONTENT_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
} as const;

/**
 * §4.10, §4.11: ширина колонки company_logo_file — общая для applications и
 * vacancy_leads (uuid записи (36) + разделитель (1) + расширение из белого списка (≤4)).
 * Переехала сюда из applications.constants.ts (шаг №26 §14): значение принадлежит
 * этому модулю, а не конкретной таблице, дублировать его в vacancy-search.constants.ts
 * запрещено (§10).
 */
export const COMPANY_LOGO_FILE_COLUMN_LENGTH = 64;

/** §4.10, §4.11, §5.1: отдаётся и когда у записи нет логотипа, и когда файл пропал с диска. */
export const COMPANY_LOGO_NOT_FOUND_MESSAGE = 'Логотип компании не сохранён';

/** fileKey — это id записи (application.id либо vacancy_leads.id), то есть всегда UUID (§4.10). */
export const COMPANY_LOGO_FILE_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * Имя файла на диске: <uuid записи>.<расширение из белого списка>. Проверяется и на
 * запись (после выбора расширения), и на чтение (значение из колонки БД) — защита
 * в глубину от path traversal, клиентский ввод в путь никогда не попадает.
 */
export const COMPANY_LOGO_FILE_NAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|jpg|webp|gif)$/;

export const COMPANY_LOGO_FILE_NAME_SEPARATOR = '.';

/** Суффикс временного файла на время записи — атомарность через rename (§4.10). */
export const COMPANY_LOGO_TMP_SUFFIX = '.tmp';

/** Content-Type может прийти с параметрами («image/png; charset=binary») — их отрезаем. */
export const CONTENT_TYPE_PARAMS_SEPARATOR = ';';

export const LOGO_CACHE_CONTROL_HEADER = 'Cache-Control';

export const LOGO_CACHE_CONTROL_VALUE = 'private, max-age=3600';

export const CONTENT_TYPE_OPTIONS_HEADER = 'X-Content-Type-Options';

export const CONTENT_TYPE_OPTIONS_NOSNIFF = 'nosniff';

export const COMPANY_LOGO_DISPOSITION = 'inline';

export const COMPANY_LOGO_INVALID_FILE_KEY_MESSAGE =
  'Логотип не скачан: fileKey не похож на UUID записи';

export const COMPANY_LOGO_UNEXPECTED_STATUS_MESSAGE = 'Логотип не скачан: CDN ответил статусом';

export const COMPANY_LOGO_UNSUPPORTED_CONTENT_TYPE_MESSAGE =
  'Логотип не скачан: неподдерживаемый Content-Type';

export const COMPANY_LOGO_TOO_LARGE_MESSAGE = 'Логотип не скачан: файл превышает допустимый размер';

export const COMPANY_LOGO_TRANSPORT_ERROR_MESSAGE = 'Логотип не скачан: ошибка запроса к CDN';

export const COMPANY_LOGO_WRITE_ERROR_MESSAGE = 'Логотип не скачан: ошибка записи на диск';

/**
 * §4.10 (SSRF): резолвится, когда beforeRedirect отклоняет хост очередного хопа
 * редиректа — allow-list проверен только на исходном URL, а CDN мог 3xx-нуть куда
 * угодно.
 */
export const COMPANY_LOGO_REDIRECT_HOST_REJECTED_MESSAGE =
  'Логотип не скачан: редирект ведёт на хост вне allow-list источника';
