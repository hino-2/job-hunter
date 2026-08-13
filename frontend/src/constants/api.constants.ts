/** Относительный путь — в Docker его проксирует nginx, в dev-режиме сам Vite. */
export const API_BASE_URL = '/api';

export const API_TIMEOUT_MS = 20_000;

export const APPLICATIONS_ENDPOINT = '/applications';

export const VACANCY_PREVIEW_ENDPOINT = '/vacancies/preview';

/** Разделитель сегментов пути: путь к одной записи — `${APPLICATIONS_ENDPOINT}/${id}`. */
export const API_PATH_SEPARATOR = '/';

/**
 * Чем склеивать массив message из §5.5 в одну строку Snackbar'а: ValidationPipe отдаёт
 * по строке на каждое нарушенное правило, а места на многострочный текст в Snackbar нет.
 */
export const API_ERROR_MESSAGE_SEPARATOR = ', ';

/** §5.3: нераспознанная ссылка — штатный исход, а не сбой (extractApiErrorStatus). */
export const HTTP_STATUS_NOT_FOUND = 404;

export const SYNC_PATH_SEGMENT = 'sync';
export const SYNC_OPEN_PATH_SEGMENT = 'sync-open';

/** §5.1: GET /api/applications/:id/logo — байты логотипа компании (§4.10). */
export const LOGO_PATH_SEGMENT = 'logo';

/**
 * Худший случай одной записи на бэкенде: 3 попытки × 10 000 мс + backoff 500/1500 мс ≈ 32 с
 * (backend/src/config/config.constants.ts, backend/src/vacancies/vacancies.constants.ts), то
 * есть дефолтный API_TIMEOUT_MS (20 000) оборвал бы штатный запрос. Одинаково для обоих
 * источников — общие дефолты ретраев.
 */
export const SYNC_REQUEST_TIMEOUT_MS = 45_000;

/** Ровно столько же держит nginx (proxy_read_timeout 120s) — больше ждать бессмысленно. */
export const SYNC_OPEN_REQUEST_TIMEOUT_MS = 120_000;
