/** Относительный путь — в Docker его проксирует nginx, в dev-режиме сам Vite. */
export const API_BASE_URL = '/api';

export const API_TIMEOUT_MS = 20_000;

export const APPLICATIONS_ENDPOINT = '/applications';

/** Разделитель сегментов пути: путь к одной записи — `${APPLICATIONS_ENDPOINT}/${id}`. */
export const API_PATH_SEPARATOR = '/';

/**
 * Чем склеивать массив message из §5.5 в одну строку Snackbar'а: ValidationPipe отдаёт
 * по строке на каждое нарушенное правило, а места на многострочный текст в Snackbar нет.
 */
export const API_ERROR_MESSAGE_SEPARATOR = ', ';
