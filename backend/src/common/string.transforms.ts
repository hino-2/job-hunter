import { Transform } from 'class-transformer';

import { EMPTY_STRING } from './common.constants';

/**
 * Обрезает пробелы по краям строки. Нестроковые значения не трогает —
 * их отбракует соответствующий валидатор (@IsString и т. п.).
 *
 * params.value типизирован как any, поэтому его сначала кладём в unknown-переменную:
 * присваивание any в unknown правило no-unsafe-assignment разрешает, а прямое
 * использование params.value в выражении — нет.
 */
export function TrimText(): PropertyDecorator {
  return Transform((params) => {
    const raw: unknown = params.value;

    if (typeof raw !== 'string') {
      return raw;
    }

    return raw.trim();
  });
}

/**
 * Обрезает пробелы по краям каждой строки массива (§5.7: keywords/excludeKeywords
 * настроек поиска, §3.6). Нестроковые элементы и не-массивы не трогает — их
 * отбракуют @IsArray/@IsString({ each: true }).
 */
export function TrimEachText(): PropertyDecorator {
  return Transform((params) => {
    const raw: unknown = params.value;

    if (!Array.isArray(raw)) {
      return raw;
    }

    // Array.isArray сужает unknown до any[] (сигнатура lib.es5) — явный каст
    // обратно к unknown[], иначе .map() ниже вернул бы any (запрещено §10 п.5).
    const items = raw as unknown[];

    return items.map((item) => (typeof item === 'string' ? item.trim() : item));
  });
}

/**
 * Превращает пустую строку в null. Фронт при очистке текстового поля присылает '',
 * а в БД такое поле должно становиться null, а не пустой строкой.
 * Применяется после TrimText, поэтому '   ' тоже даёт null.
 */
export function EmptyTextToNull(): PropertyDecorator {
  return Transform((params) => {
    const raw: unknown = params.value;

    if (raw === EMPTY_STRING) {
      return null;
    }

    return raw;
  });
}
