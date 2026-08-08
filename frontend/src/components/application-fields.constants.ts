/**
 * Суффиксы id подписей Select'ов: полный id — `${application.id}${SUFFIX}`. Префикс из id
 * записи обязателен, потому что раскрытых аккордеонов на странице может быть несколько,
 * а labelId связывает InputLabel и Select и должен быть уникален (a11y).
 */
export const STATUS_LABEL_ID_SUFFIX = '-status-label';
export const RESULT_LABEL_ID_SUFFIX = '-result-label';
