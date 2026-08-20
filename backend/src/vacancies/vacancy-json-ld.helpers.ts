import {
  JSON_LD_CONTENT_GROUP,
  JSON_LD_FIELD,
  JSON_LD_GRAPH_FIELD,
  JSON_LD_JOB_POSTING_TYPE,
  JSON_LD_SCRIPT_PATTERN,
} from './vacancies.constants';

/**
 * Общие хелперы разбора блоков <script type="application/ld+json"> (schema.org).
 * Вынесены из hh/hh-json-ld.helpers.ts на шаге 28: тот же блок питает разбор
 * страницы вакансии при синхронизации (§4.1), описание вакансии для поиска
 * (§4.11.7) и выдачу it-vacancies.ru — дублировать регекс и narrowing в трёх
 * модулях источников означало бы гарантированное расхождение при первой же
 * правке вёрстки. Живёт в vacancies/, а не в hh/: модуль источника не имеет
 * права импортировать из модуля другого источника.
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
 * Разворачивает schema.org-контейнер @graph ровно на один уровень: так отдаёт
 * выдачу it-vacancies.ru (BreadcrumbList + 20 JobPosting в одном блоке). Запись
 * без @graph возвращается как есть — разворот вглубь не нужен ни одному источнику
 * и только скрыл бы структурную поломку вёрстки.
 */
function unwrapGraph(entry: unknown): unknown[] {
  if (!isRecord(entry)) {
    return [entry];
  }

  const graph = entry[JSON_LD_GRAPH_FIELD];

  // Array.isArray сужает unknown до any[] (таков тип его сигнатуры в lib.es5),
  // поэтому explicit-каст обратно к unknown[] нужен, чтобы возврат не считался
  // небезопасным.
  return Array.isArray(graph) ? (graph as unknown[]) : [entry];
}

/**
 * Разбирает все блоки <script type="application/ld+json"> на странице (их может
 * быть несколько). Битый блок молча пропускается — JSON-LD питает только
 * автозаполнение (§4.4) и описание для поиска (§4.11.7), а не правила §4.3,
 * поэтому один плохой блок не должен рушить разбор всей страницы.
 *
 * Массив верхнего уровня и @graph разворачиваются на один уровень, поэтому
 * вызывающий всегда получает плоский список сущностей.
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
      const topLevel: unknown[] = Array.isArray(parsed) ? (parsed as unknown[]) : [parsed];

      for (const entry of topLevel) {
        entries.push(...unwrapGraph(entry));
      }
    } catch {
      continue;
    }
  }

  return entries;
}

/**
 * Все записи JSON-LD с @type: 'JobPosting' (строкой либо в массиве типов), в
 * порядке документа. Порядок значим для выдачи it-vacancies.ru: там JobPosting'и
 * сопоставляются со ссылками карточек по индексу (§4.11.3).
 */
export function findJobPostings(entries: readonly unknown[]): Record<string, unknown>[] {
  const postings: Record<string, unknown>[] = [];

  for (const entry of entries) {
    if (isRecord(entry) && hasJobPostingType(entry)) {
      postings.push(entry);
    }
  }

  return postings;
}

/** Первая запись JSON-LD с @type: 'JobPosting' — страница вакансии несёт ровно одну. */
export function findJobPosting(entries: readonly unknown[]): Record<string, unknown> | null {
  return findJobPostings(entries)[0] ?? null;
}
