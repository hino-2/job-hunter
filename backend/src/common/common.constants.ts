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

/**
 * Статусы, общие для всех источников вакансий (§4.1, §4.5): интерпретация ответа
 * axios у hh.ru и getmatch.ru построена на одном и том же наборе кодов. Тип сужен
 * до number по той же причине, что и выше — сравнение number с членом enum
 * запрещено правилом no-unsafe-enum-comparison.
 */
export const OK_STATUS: number = HttpStatus.OK;
export const NOT_FOUND_STATUS: number = HttpStatus.NOT_FOUND;
export const FORBIDDEN_STATUS: number = HttpStatus.FORBIDDEN;
export const RATE_LIMITED_STATUS: number = HttpStatus.TOO_MANY_REQUESTS;

/** Отправка ответа уже началась — тело §5.5 доставить невозможно, только закрыть соединение. */
export const HEADERS_ALREADY_SENT_MESSAGE = 'Ответ уже отправляется, тело ошибки не заменить';

/**
 * Экранирование метасимволов LIKE, чтобы «100%» искалось как подстрока, а не как
 * шаблон (common/like.helpers.ts). Переезд из applications.constants.ts: общие для
 * всех модулей с поиском по подстроке (§5.1, §5.7), а не только applications.
 */
export const LIKE_ESCAPE_PATTERN = /[\\%_]/g;
export const LIKE_ESCAPE_REPLACEMENT = '\\$&';
export const LIKE_WILDCARD = '%';

/**
 * §4.11.3/§4.11.7: снятие HTML-экранирования у встроенных JSON-состояний hh.ru
 * (блок выдачи) и у HTML-описания вакансии перед превращением в plain text.
 * Порядок ВАЖЕН — &amp; заменяется ПОСЛЕДНИМ, иначе &amp;quot; превратится в
 * кавычку раньше срока и сломает JSON.parse либо исказит текст описания.
 */
export const HTML_ENTITY_REPLACEMENTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/&quot;|&#34;/g, '"'],
  [/&#39;|&apos;/g, "'"],
  [/&lt;/g, '<'],
  [/&gt;/g, '>'],
  [/&nbsp;/g, ' '],
  [/&amp;/g, '&'],
];

/** §4.11.7: <li>/<p>/<br> становятся переводами строк перед вырезкой прочих тегов. */
export const HTML_BLOCK_BREAK_TAG_PATTERN = /<\s*(li|p|br)\b[^>]*>/gi;

export const HTML_ANY_TAG_PATTERN = /<[^>]*>/g;

/** Пробельные серии внутри строки — не переводы строк, их сохраняет разбиение по '\n'. */
export const HTML_INLINE_WHITESPACE_PATTERN = /[ \t\f\v]+/g;

export const HTML_BLANK_LINE_RUN_PATTERN = /\n{2,}/g;
