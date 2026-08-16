/** Относительный путь — в Docker его проксирует nginx, в dev-режиме сам Vite. */
export const API_BASE_URL = '/api';

export const API_TIMEOUT_MS = 20_000;

export const APPLICATIONS_ENDPOINT = '/applications';

export const VACANCY_PREVIEW_ENDPOINT = '/vacancies/preview';

/** §5.7: найденные вакансии и настройки поиска (модуль vacancy-search на бэкенде). */
export const VACANCY_LEADS_ENDPOINT = '/vacancy-leads';
export const VACANCY_SEARCH_SETTINGS_ENDPOINT = '/vacancy-search-settings';

/** Разделитель сегментов пути: путь к одной записи — `${APPLICATIONS_ENDPOINT}/${id}`. */
export const API_PATH_SEPARATOR = '/';

/**
 * Чем склеивать массив message из §5.5 в одну строку Snackbar'а: ValidationPipe отдаёт
 * по строке на каждое нарушенное правило, а места на многострочный текст в Snackbar нет.
 */
export const API_ERROR_MESSAGE_SEPARATOR = ', ';

/** §5.3: нераспознанная ссылка — штатный исход, а не сбой (extractApiErrorStatus). */
export const HTTP_STATUS_NOT_FOUND = 404;

/** §5.7: прогон поиска уже идёт — штатный исход кнопки «Найти вакансии», не сбой. */
export const HTTP_STATUS_CONFLICT = 409;

export const SYNC_PATH_SEGMENT = 'sync';
export const SYNC_OPEN_PATH_SEGMENT = 'sync-open';

/**
 * §5.7: маршруты запуска и статуса прогона поиска. Объявлены здесь, а не выведены
 * из пути `${VACANCY_LEADS_ENDPOINT}/scan`, тем же приёмом, что SYNC_PATH_SEGMENT.
 */
export const VACANCY_LEADS_SCAN_PATH_SEGMENT = 'scan';
export const VACANCY_LEADS_SCAN_STOP_PATH_SEGMENT = 'scan/stop';
export const VACANCY_LEADS_SCAN_STATUS_PATH_SEGMENT = 'scan/status';

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

/**
 * POST /api/applications теперь докачивает логотип компании (§4.4, §4.10): один запрос
 * к источнику (худший случай 3 попытки × 10 000 мс + backoff 500/1500 мс ≈ 32 с) плюс
 * скачивание логотипа (COMPANY_LOGO_REQUEST_TIMEOUT_MS = 5 000 мс). Дефолтный
 * API_TIMEOUT_MS (20 000) оборвал бы штатный запрос, а диалог создания при ошибке
 * остаётся открытым — повторный «Добавить» создал бы дубль записи.
 */
export const CREATE_REQUEST_TIMEOUT_MS = 45_000;

/**
 * У прогона поиска (§4.11, §5.7) нет отдельного per-request таймаута, в отличие
 * от sync-open: тот держит соединение открытым на всю синхронную операцию, а
 * POST /vacancy-leads/scan и POST /vacancy-leads/scan/stop (§4.11.12) отвечают 202
 * сразу, не дожидаясь конца прогона, и GET /vacancy-leads/scan/status читает только
 * снимок состояния из памяти процесса — все три запроса быстрые независимо от того,
 * идёт ли сам прогон. Дефолтного API_TIMEOUT_MS достаточно.
 */
