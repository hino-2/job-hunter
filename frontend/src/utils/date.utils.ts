import dayjs from 'dayjs';
import type { Dayjs } from 'dayjs';
import type { DateTimeValidationError } from '@mui/x-date-pickers';

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

/** Значение поля записи → значение DateTimePicker (§7.2.2, ряд 2). */
export function toDayjsOrNull(iso: string | null): Dayjs | null {
  if (iso === null) {
    return null;
  }

  return dayjs(iso);
}

/**
 * Значение DateTimePicker → тело PATCH (§5.1). toISOString даёт суффикс Z — единственную
 * форму со смещением, которую точно принимает ISO_8601_INSTANT_PATTERN бэкенда; формат
 * без смещения вернул бы 400.
 */
export function toIsoOrNull(value: Dayjs | null): string | null {
  if (value === null) {
    return null;
  }

  return value.toISOString();
}

/**
 * Можно ли отправлять это значение пикера в PATCH. DateTimePicker зовёт onChange
 * на каждую секцию ручного набора, поэтому недонабранная дата приходит невалидной —
 * такое значение дало бы 400. Проверок две: пикер сообщает о нарушении своих ограничений
 * через validationError, а о нераспарсенной дате — самим значением.
 */
export function isCommittableDate(
  value: Dayjs | null,
  validationError: DateTimeValidationError,
): boolean {
  if (validationError !== null) {
    return false;
  }

  return value === null || value.isValid();
}
