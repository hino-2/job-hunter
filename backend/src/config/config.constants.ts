/**
 * Значения по умолчанию и допустимые варианты для переменных окружения.
 * Обязательные переменные (креды БД, AUTH_*) дефолтов не имеют намеренно —
 * их отсутствие должно ронять приложение на старте.
 */
export const ENV_FILE_PATHS = ['../.env', '.env'];

export const NODE_ENVS = ['development', 'production', 'test'] as const;

export const LOG_LEVELS = ['verbose', 'debug', 'log', 'warn', 'error', 'fatal'] as const;

export const TCP_PORT_MIN = 1;
export const TCP_PORT_MAX = 65535;

export const DEFAULT_NODE_ENV = 'development';
export const DEFAULT_LOG_LEVEL = 'log';
export const DEFAULT_API_PORT = 3000;
export const DEFAULT_WEB_PORT = 8080;
export const DEFAULT_DATABASE_PORT = 5432;

export const DEFAULT_HH_SITE_BASE_URL = 'https://hh.ru';
export const DEFAULT_HH_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_HH_MAX_RETRIES = 2;

/**
 * §4.9. Разведка не обнаружила у getmatch.ru отдельных требований к User-Agent
 * (403 не наблюдался с обычным браузерным заголовком), поэтому в отличие от
 * HH_USER_AGENT (обязателен, дефолта нет) у getmatch есть безопасный дефолт.
 */
export const DEFAULT_GETMATCH_SITE_BASE_URL = 'https://getmatch.ru';
export const DEFAULT_GETMATCH_USER_AGENT = 'job-hunter/1.0';
export const DEFAULT_GETMATCH_REQUEST_TIMEOUT_MS = 10_000;
export const DEFAULT_GETMATCH_MAX_RETRIES = 2;

/** Общий параметр массового прогона (§4.6): один прогон может смешивать источники. */
export const DEFAULT_SYNC_CONCURRENCY = 3;
export const DEFAULT_SYNC_MIN_DELAY_MS = 200;

/**
 * Границы валидации таймаута и числа ретраев — общие для всех источников вакансий:
 * их значения проверяют и HH_REQUEST_TIMEOUT_MS/HH_MAX_RETRIES, и
 * GETMATCH_REQUEST_TIMEOUT_MS/GETMATCH_MAX_RETRIES (без префикса HH_, потому что
 * смысл границы не привязан к конкретному источнику).
 */
export const REQUEST_TIMEOUT_MIN_MS = 1_000;
export const REQUEST_TIMEOUT_MAX_MS = 60_000;
export const MAX_RETRIES_MAX = 10;
export const SYNC_CONCURRENCY_MAX = 10;
export const SYNC_MIN_DELAY_MAX_MS = 10_000;
