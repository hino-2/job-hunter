import {
  JSON_LD_CONTENT_GROUP,
  JSON_LD_FIELD,
  JSON_LD_JOB_POSTING_TYPE,
  JSON_LD_SCRIPT_PATTERN,
} from './hh.constants';

/**
 * Общие хелперы разбора блоков <script type="application/ld+json"> (schema.org).
 * Вынесены из hh-page.parser.ts на шаге 22 (§4.11.7): тот же блок питает и разбор
 * страницы вакансии при синхронизации (§4.1), и разбор описания вакансии для
 * поиска (hh-description.parser.ts) — дублировать регекс и narrowing в двух
 * файлах означало бы гарантированное расхождение при первой же правке вёрстки.
 */

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  return typeof value === 'string' ? value : null;
}

function hasJobPostingType(entry: Record<string, unknown>): boolean {
  const type = entry[JSON_LD_FIELD.TYPE];

  if (typeof type === 'string') {
    return type === JSON_LD_JOB_POSTING_TYPE;
  }

  if (Array.isArray(type)) {
    return type.includes(JSON_LD_JOB_POSTING_TYPE);
  }

  return false;
}

/**
 * Разбирает все блоки <script type="application/ld+json"> на странице (их может
 * быть несколько). Битый блок молча пропускается — JSON-LD питает только
 * автозаполнение (§4.4) и описание для поиска (§4.11.7), а не правила §4.3,
 * поэтому один плохой блок не должен рушить разбор всей страницы.
 */
export function extractJsonLdEntries(html: string): unknown[] {
  const entries: unknown[] = [];

  for (const match of html.matchAll(JSON_LD_SCRIPT_PATTERN)) {
    const raw = match[JSON_LD_CONTENT_GROUP];

    if (raw === undefined) {
      continue;
    }

    try {
      const parsed: unknown = JSON.parse(raw);

      // @graph не поддерживаем: массив разворачиваем ровно на один уровень.
      // Array.isArray сужает unknown до any[] (таков тип его сигнатуры в lib.es5),
      // поэтому explicit-каст обратно к unknown[] нужен, чтобы spread не считался
      // небезопасным аргументом.
      if (Array.isArray(parsed)) {
        entries.push(...(parsed as unknown[]));
      } else {
        entries.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return entries;
}

/** Первая запись JSON-LD с @type: 'JobPosting' (строкой либо в массиве типов). */
export function findJobPosting(entries: unknown[]): Record<string, unknown> | null {
  for (const entry of entries) {
    if (isRecord(entry) && hasJobPostingType(entry)) {
      return entry;
    }
  }

  return null;
}
