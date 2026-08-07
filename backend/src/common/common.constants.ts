/** Константы, общие для всех модулей: используются валидаторами, трансформерами DTO и фильтром ошибок. */

import { HttpStatus } from '@nestjs/common';

export const EMPTY_STRING = '';

/**
 * strict/strictSeparator заставляют @IsISO8601 принимать только настоящий ISO 8601
 * («2026-08-10T09:00:00.000Z»), отбрасывая «10.08.2026» и «2026-08-10 09:00».
 */
export const ISO_8601_VALIDATION_OPTIONS = {
  strict: true,
  strictSeparator: true,
} as const;

/**
 * ISO 8601 сужен до «момента времени с явным смещением»: календарная дата + время +
 * Z или ±HH:MM.
 *
 * Одного @IsISO8601 недостаточно: он пропускает формы, которые либо вообще не парсятся
 * конструктором Date («2026-W32-1», «2026-222», «20260810T090000Z» → Invalid Date → 500
 * от драйвера БД вместо 400), либо парсятся, но БЕЗ смещения («2026-08-10T09:00:00»,
 * «2026-08-10») — тогда сохранённый инстант зависит от таймзоны процесса, что прямо
 * противоречит §5 («даты — строки ISO 8601 с таймзоной»).
 */
export const ISO_8601_INSTANT_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

export const ISO_8601_INSTANT_VALIDATION_OPTIONS = {
  message:
    '$property должен быть датой ISO 8601 с явной таймзоной, например 2026-08-10T09:00:00.000Z',
};

/**
 * Тело любого 5xx (§5.5). Обезличено намеренно: сообщения TypeORM содержат SQL и имена
 * колонок, а сообщения драйвера — параметры запроса. Подробности уходят только в лог.
 */
export const INTERNAL_SERVER_ERROR_MESSAGE = 'Внутренняя ошибка сервера';

/**
 * Fallback для поля error, когда http.STATUS_CODES не знает такого кода.
 * Нужен из-за noUncheckedIndexedAccess: STATUS_CODES[status] имеет тип string | undefined.
 */
export const UNKNOWN_ERROR_TEXT = 'Error';

/** Подставляется в лог вместо стека, когда брошено не-Error (строка, объект, undefined). */
export const NON_ERROR_THROWN_MESSAGE = 'Брошено значение, не являющееся Error';

export const EXCEPTION_FILTER_CONTEXT = 'ExceptionFilter';

/**
 * Границы диапазона клиентских ошибок. Тип сужен до number намеренно — сравнение
 * `status >= HttpStatus.X` с обычным числом запрещено правилом no-unsafe-enum-comparison.
 *
 * С SERVER_ERROR_MIN_STATUS ошибка считается серверной: пишется уровнем error и со стеком.
 */
export const CLIENT_ERROR_MIN_STATUS: number = HttpStatus.BAD_REQUEST;
export const SERVER_ERROR_MIN_STATUS: number = HttpStatus.INTERNAL_SERVER_ERROR;

/** Отправка ответа уже началась — тело §5.5 доставить невозможно, только закрыть соединение. */
export const HEADERS_ALREADY_SENT_MESSAGE = 'Ответ уже отправляется, тело ошибки не заменить';
