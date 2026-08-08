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
export const DEFAULT_HH_SYNC_CONCURRENCY = 3;
export const DEFAULT_HH_SYNC_MIN_DELAY_MS = 200;

export const HH_REQUEST_TIMEOUT_MIN_MS = 1_000;
export const HH_REQUEST_TIMEOUT_MAX_MS = 60_000;
export const HH_MAX_RETRIES_MAX = 10;
export const HH_SYNC_CONCURRENCY_MAX = 10;
export const HH_SYNC_MIN_DELAY_MAX_MS = 10_000;
