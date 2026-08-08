/**
 * Уведомления Snackbar (§7.3, §7.6). Собственные литералы, а не AlertColor из MUI:
 * так константы не тянут типы библиотеки, а присваиваемость в проп severity сохраняется.
 */
export const NOTIFICATION_SEVERITY = {
  SUCCESS: 'success',
  INFO: 'info',
  WARNING: 'warning',
  ERROR: 'error',
} as const;

/** С какого числа начинается счётчик id: он идёт в React-key, ноль тут ничем не лучше. */
export const FIRST_NOTIFICATION_ID = 1;
