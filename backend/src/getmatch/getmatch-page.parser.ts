import type { Vacancy } from '../vacancies/vacancies.interfaces';
import { resolveVacancyLogoUrl } from '../vacancies/vacancy-logo-url.helpers';
import {
  GETMATCH_COMPANY_LOGO_PATTERN,
  GETMATCH_COMPANY_LOGO_SRC_GROUP,
  GETMATCH_FIELD,
  GETMATCH_FLIGHT_CHUNK_GROUP,
  GETMATCH_FLIGHT_CHUNK_PATTERN,
  GETMATCH_FLIGHT_PAYLOAD_INDEX,
  GETMATCH_INITIAL_VACANCY_KEY,
  GETMATCH_LOGO_ALLOWED_HOST_PATTERN,
  GETMATCH_NULL_TOKEN,
  GETMATCH_OBJECT_CLOSE,
  GETMATCH_OBJECT_OPEN,
  GETMATCH_PAGE_STATE,
  GETMATCH_STRING_ESCAPE,
  GETMATCH_STRING_QUOTE,
  GETMATCH_WHITESPACE_PATTERN,
} from './getmatch.constants';
import type { GetmatchPageParseResult } from './getmatch.type';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  return typeof value === 'string' ? value : null;
}

/**
 * Склеивает чанки self.__next_f.push в единый текст (§4.9, §9): каждый чанк —
 * валидный JSON-массив [1, "..."], поэтому строку-payload корректно достаёт
 * JSON.parse захваченного литерала. Ключ initialVacancy может лежать на стыке
 * двух чанков — важна именно склейка, а не разбор каждого чанка по отдельности.
 *
 * Битый чанк молча пропускается: не всё содержимое self.__next_f.push обязано
 * быть массивом со строкой во втором элементе (бывают числовые/булевы пуши),
 * и один такой чанк не должен рушить разбор всей страницы.
 *
 * matchAll, а не exec/test на глобальном регексе уровня модуля — они мутируют
 * lastIndex между вызовами (§9), что дало бы пропуски при повторном вызове.
 */
function collectFlightPayload(html: string): string {
  const parts: string[] = [];

  for (const match of html.matchAll(GETMATCH_FLIGHT_CHUNK_PATTERN)) {
    const literal = match[GETMATCH_FLIGHT_CHUNK_GROUP];

    if (literal === undefined) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(literal);

      if (!Array.isArray(parsed)) {
        continue;
      }

      const payload: unknown = (parsed as unknown[])[GETMATCH_FLIGHT_PAYLOAD_INDEX];

      if (typeof payload === 'string') {
        parts.push(payload);
      }
    } catch {
      continue;
    }
  }

  // join, а не += в цикле (§9): по 10–15 чанкам конкатенация строк была бы
  // квадратичной по суммарной длине склеиваемого текста.
  return parts.join('');
}

/**
 * Посимвольный скан баланса { } от start, с учётом строк и экранирования (§9):
 * внутри offer_description встречаются и «{»/«}», и «\"», поэтому наивный
 * indexOf('}') обрывался бы на первой же фигурной скобке внутри текста описания.
 * Это скан, а не регекс — не подвержен катастрофическому бэктрекингу.
 *
 * Возвращает подстроку [start, конец объекта] включительно либо null, если
 * скобки не сбалансированы до конца текста.
 */
function extractJsonObject(text: string, start: number): string | null {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = start; index < text.length; index += 1) {
    const char = text.charAt(index);

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === GETMATCH_STRING_ESCAPE) {
        escaped = true;
      } else if (char === GETMATCH_STRING_QUOTE) {
        inString = false;
      }

      continue;
    }

    if (char === GETMATCH_STRING_QUOTE) {
      inString = true;
      continue;
    }

    if (char === GETMATCH_OBJECT_OPEN) {
      depth += 1;
    } else if (char === GETMATCH_OBJECT_CLOSE) {
      depth -= 1;

      if (depth === 0) {
        return text.slice(start, index + 1);
      }
    }
  }

  return null;
}

/** Пропускает JSON-пробелы (пробел/таб/CR/LF) после «:» перед значением. */
function skipWhitespace(text: string, from: number): number {
  let index = from;

  while (index < text.length && GETMATCH_WHITESPACE_PATTERN.test(text.charAt(index))) {
    index += 1;
  }

  return index;
}

function unparsable(): GetmatchPageParseResult {
  return { state: GETMATCH_PAGE_STATE.UNPARSABLE };
}

/**
 * §4.10: src логотипа компании — сначала пробуем «сырой» html (кавычки не
 * экранированы), при промахе — уже склеенный flight-payload (кавычки экранированы,
 * поэтому в паттерне есть опциональный \\?). Паттерн не глобальный — .exec безопасен
 * без сброса lastIndex между вызовами.
 */
function readCompanyLogo(html: string, payload: string): string | null {
  const fromHtml = GETMATCH_COMPANY_LOGO_PATTERN.exec(html)?.[GETMATCH_COMPANY_LOGO_SRC_GROUP];

  if (fromHtml !== undefined) {
    return fromHtml;
  }

  return GETMATCH_COMPANY_LOGO_PATTERN.exec(payload)?.[GETMATCH_COMPANY_LOGO_SRC_GROUP] ?? null;
}

/**
 * Разбор страницы вакансии getmatch.ru (§4.9): склейка чанков self.__next_f.push
 * и извлечение initialVacancy из flight-payload Next.js. Чистая функция, а не метод
 * сервиса и не провайдер — тот же аргумент, что и у getmatch-url.parser.ts.
 *
 * Три состояния, а не два (§9, разведка): «вакансии нет» здесь приходит с HTTP 200
 * и отличается от «страница не распознана» только содержимым payload —
 * несуществующая вакансия отдаёт initialVacancy: null, а не 404.
 *
 * is_active обязан быть boolean (fail-loud, как признак архивности у hh.ru):
 * его отсутствие или неверный тип делает ответ бесполезным для правил §4.3.
 * position и company.name деградируют мягко — они питают только автозаполнение (§4.4).
 *
 * Никогда не бросает: любой мусор на входе — это UNPARSABLE, а не исключение.
 *
 * logoBaseUrl (§4.10) нужен для абсолютизации src логотипа компании; заполняется
 * только в ветке PARSED — у ABSENT/UNPARSABLE самой vacancy нет.
 */
export function parseGetmatchVacancyPage(
  html: unknown,
  logoBaseUrl: string,
): GetmatchPageParseResult {
  if (typeof html !== 'string' || html.length === 0) {
    return unparsable();
  }

  const payload = collectFlightPayload(html);
  const keyIndex = payload.indexOf(GETMATCH_INITIAL_VACANCY_KEY);

  if (keyIndex === -1) {
    return unparsable();
  }

  const valueStart = skipWhitespace(payload, keyIndex + GETMATCH_INITIAL_VACANCY_KEY.length);

  if (payload.startsWith(GETMATCH_NULL_TOKEN, valueStart)) {
    return { state: GETMATCH_PAGE_STATE.ABSENT };
  }

  if (payload.charAt(valueStart) !== GETMATCH_OBJECT_OPEN) {
    return unparsable();
  }

  const objectLiteral = extractJsonObject(payload, valueStart);

  if (objectLiteral === null) {
    return unparsable();
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(objectLiteral);
  } catch {
    return unparsable();
  }

  if (!isRecord(parsed)) {
    return unparsable();
  }

  const isActive = parsed[GETMATCH_FIELD.IS_ACTIVE];

  if (typeof isActive !== 'boolean') {
    return unparsable();
  }

  const company = parsed[GETMATCH_FIELD.COMPANY];
  const logoUrl = resolveVacancyLogoUrl(
    readCompanyLogo(html, payload),
    logoBaseUrl,
    GETMATCH_LOGO_ALLOWED_HOST_PATTERN,
  );
  const vacancy: Vacancy = {
    name: readString(parsed, GETMATCH_FIELD.POSITION),
    archived: !isActive,
    employerName: isRecord(company) ? readString(company, GETMATCH_FIELD.NAME) : null,
    logoUrl,
    // Тот же allow-list, которым уже проверили logoUrl (§4.10) — CompanyLogoService
    // повторит эту проверку на каждом хопе редиректа, а не только на исходном URL.
    logoAllowedHostPattern: logoUrl === null ? null : GETMATCH_LOGO_ALLOWED_HOST_PATTERN,
  };

  return { state: GETMATCH_PAGE_STATE.PARSED, vacancy };
}
