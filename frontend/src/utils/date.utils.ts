import dayjs from 'dayjs';

import { DATE_TIME_DISPLAY_FORMAT, DATE_TIME_SHORT_FORMAT } from '../constants/layout.constants';

/**
 * Форматирование дат для UI (§7.8): локальная таймзона браузера.
 * Плагины dayjs не подключаются намеренно — ядро само парсит ISO 8601 в локальную зону,
 * а локаль ru ставится один раз в main.tsx.
 */

/** Короткий формат шапки аккордеона: DD.MM HH:mm. */
export function formatDateTimeShort(iso: string | null): string | null {
  if (iso === null) {
    return null;
  }

  return dayjs(iso).format(DATE_TIME_SHORT_FORMAT);
}

/** Полный формат: DD.MM.YYYY HH:mm. */
export function formatDateTimeFull(iso: string | null): string | null {
  if (iso === null) {
    return null;
  }

  return dayjs(iso).format(DATE_TIME_DISPLAY_FORMAT);
}
