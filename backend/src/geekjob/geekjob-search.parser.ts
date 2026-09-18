import type { VacancySearchItem, VacancySearchPage } from '../vacancies/vacancies.interfaces';
import { isRecord } from '../vacancies/vacancy-json-ld.helpers';
import {
  GEEKJOB_DAY_START_TIME,
  GEEKJOB_JOB_FORMAT_FIELD,
  GEEKJOB_SEARCH_FIELD,
  GEEKJOB_SEARCH_ITEM_ID_PATTERN,
  GEEKJOB_SORT_ORDER_DAY_GROUP,
  GEEKJOB_SORT_ORDER_MONTH_GROUP,
  GEEKJOB_SORT_ORDER_PATTERN,
  GEEKJOB_SORT_ORDER_YEAR_GROUP,
  GEEKJOB_TIME_ZONE_OFFSET,
  GEEKJOB_VACANCY_PAGE_PATH,
  GEEKJOB_WORK_FORMAT_LABELS,
  GEEKJOB_WORK_FORMATS_SEPARATOR,
} from './geekjob.constants';
import { parseGeekjobSalary } from './geekjob-salary.helpers';

/**
 * §4.11.3/§4.13: разбор JSON-ответа выдачи geekjob.ru (/json/find/vacancy).
 *
 * ВАЖНО (§4.13, самая вероятная ошибка реализации): дефолтный transformResponse
 * axios (responseType: 'text', vacancy-http-options.factory.ts) не пытается
 * JSON.parse тело — это верно для HTML-страниц источников, но JSON-эндпоинт
 * geekjob.ru отдаёт Content-Type: application/json, и axios успешно парсит его в
 * объект ДО того, как payload попадёт сюда. Поэтому payload бывает и строкой
 * (транспорт не смог распознать JSON), и уже готовым объектом — оба случая
 * обязаны разбираться одинаково.
 *
 * Никогда не бросает: любой мусор на входе — null.
 */
export function parseGeekjobSearchPage(
  payload: unknown,
  siteBaseUrl: string,
): VacancySearchPage | null {
  const root = coercePayload(payload);

  if (!isRecord(root)) {
    return null;
  }

  const data = root[GEEKJOB_SEARCH_FIELD.DATA];

  // Не «нашли 0 вакансий», а поломка: структура ответа изменилась (§4.11.3).
  if (!Array.isArray(data)) {
    return null;
  }

  const lastPage = readLastPage(root[GEEKJOB_SEARCH_FIELD.PAGE_COUNT]);

  if (data.length === 0) {
    return { items: [], lastPage, skippedInvalid: 0 };
  }

  const items: VacancySearchItem[] = [];
  let skippedInvalid = 0;

  for (const document of data as unknown[]) {
    const item = parseSearchItem(document, siteBaseUrl);

    if (item === null) {
      skippedInvalid += 1;

      continue;
    }

    items.push(item);
  }

  return { items, lastPage, skippedInvalid };
}

/**
 * Диагностика провала разбора для лога сервиса (§4.13, «Наблюдаемость»): сколько
 * документов и сколько из них помечены архивными нашлось на странице. Тело ответа
 * не логируется — только эти числа.
 */
export function countGeekjobSearchSignals(payload: unknown): {
  documents: number;
  archived: number;
} {
  const root = coercePayload(payload);

  if (!isRecord(root)) {
    return { documents: 0, archived: 0 };
  }

  const data = root[GEEKJOB_SEARCH_FIELD.DATA];

  if (!Array.isArray(data)) {
    return { documents: 0, archived: 0 };
  }

  const documents = data as unknown[];
  const archived = documents.filter((document) => {
    if (!isRecord(document)) {
      return false;
    }

    const log = document[GEEKJOB_SEARCH_FIELD.LOG];

    return isRecord(log) && log[GEEKJOB_SEARCH_FIELD.ARCHIVED] != null;
  }).length;

  return { documents: documents.length, archived };
}

/** Тело ответа читается строкой (VACANCY_RESPONSE_TYPE), но JSON-эндпоинт может прийти уже объектом. */
function coercePayload(payload: unknown): unknown {
  if (typeof payload !== 'string') {
    return payload;
  }

  try {
    return JSON.parse(payload) as unknown;
  } catch {
    return null;
  }
}

/**
 * §4.11.3: один документ выдачи → элемент. log.archived != null — надёжный маркер
 * архивной вакансии в этой выдаче (единственное место, где он вообще доступен,
 * §4.13) — такой документ пропускается как skippedInvalid, а не попадает в items.
 *
 * Отсутствие id/position/company.name/валидного sortOrder — тоже мягкий пропуск
 * одного элемента, а не срыв разбора всей страницы.
 */
function parseSearchItem(document: unknown, siteBaseUrl: string): VacancySearchItem | null {
  if (!isRecord(document)) {
    return null;
  }

  const log = document[GEEKJOB_SEARCH_FIELD.LOG];

  if (isRecord(log) && log[GEEKJOB_SEARCH_FIELD.ARCHIVED] != null) {
    return null;
  }

  const rawId = document[GEEKJOB_SEARCH_FIELD.ID];
  const id = typeof rawId === 'string' && GEEKJOB_SEARCH_ITEM_ID_PATTERN.test(rawId) ? rawId : null;
  const position = readNonEmptyString(document[GEEKJOB_SEARCH_FIELD.POSITION]);
  const company = document[GEEKJOB_SEARCH_FIELD.COMPANY];
  const companyName = isRecord(company)
    ? readNonEmptyString(company[GEEKJOB_SEARCH_FIELD.NAME])
    : null;
  const publishedAtIso = readPublishedAtIso(document[GEEKJOB_SEARCH_FIELD.SORT_ORDER]);

  if (id === null || position === null || companyName === null || publishedAtIso === null) {
    return null;
  }

  const salary = parseGeekjobSalary(document[GEEKJOB_SEARCH_FIELD.SALARY]);

  return {
    externalId: id.toLowerCase(),
    position,
    company: companyName,
    publishedAtIso,
    vacancyUrl: `${siteBaseUrl}${GEEKJOB_VACANCY_PAGE_PATH}/${id.toLowerCase()}`,
    areaName:
      readNonEmptyString(document[GEEKJOB_SEARCH_FIELD.CITY]) ??
      readNonEmptyString(document[GEEKJOB_SEARCH_FIELD.COUNTRY]),
    salaryFrom: salary.salaryFrom,
    salaryTo: salary.salaryTo,
    salaryCurrency: salary.salaryCurrency,
    salaryGross: null,
    experience: null,
    employmentForm: null,
    workFormats: readWorkFormats(document[GEEKJOB_SEARCH_FIELD.JOB_FORMAT]),
  };
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? null : trimmed;
}

/** §4.13: sortOrder — YYYYMMDD, дата последнего поднятия вакансии — источник publishedAtIso. */
function readPublishedAtIso(rawSortOrder: unknown): string | null {
  if (typeof rawSortOrder !== 'string') {
    return null;
  }

  const match = GEEKJOB_SORT_ORDER_PATTERN.exec(rawSortOrder);
  const year = match?.[GEEKJOB_SORT_ORDER_YEAR_GROUP];
  const month = match?.[GEEKJOB_SORT_ORDER_MONTH_GROUP];
  const day = match?.[GEEKJOB_SORT_ORDER_DAY_GROUP];

  if (year === undefined || month === undefined || day === undefined) {
    return null;
  }

  return `${year}-${month}-${day}${GEEKJOB_DAY_START_TIME}${GEEKJOB_TIME_ZONE_OFFSET}`;
}

/** §4.11.3: jobFormat — набор булевых флагов, для лида нужна строка через запятую. */
function readWorkFormats(rawJobFormat: unknown): string | null {
  if (!isRecord(rawJobFormat)) {
    return null;
  }

  const labels: string[] = [];

  if (rawJobFormat[GEEKJOB_JOB_FORMAT_FIELD.REMOTE] === true) {
    labels.push(GEEKJOB_WORK_FORMAT_LABELS.remote);
  }

  if (rawJobFormat[GEEKJOB_JOB_FORMAT_FIELD.INHOUSE] === true) {
    labels.push(GEEKJOB_WORK_FORMAT_LABELS.inhouse);
  }

  if (rawJobFormat[GEEKJOB_JOB_FORMAT_FIELD.PARTTIME] === true) {
    labels.push(GEEKJOB_WORK_FORMAT_LABELS.parttime);
  }

  if (rawJobFormat[GEEKJOB_JOB_FORMAT_FIELD.RELOCATE] === true) {
    labels.push(GEEKJOB_WORK_FORMAT_LABELS.relocate);
  }

  return labels.length === 0 ? null : labels.join(GEEKJOB_WORK_FORMATS_SEPARATOR);
}

/**
 * §4.11.1: pagecount → lastPage (0-based), совпадает с полем count страниц JSON.
 * Значение бывает и числом, и числовой строкой — источник не всегда единообразен.
 */
function readLastPage(rawPageCount: unknown): number | null {
  const pageCount =
    typeof rawPageCount === 'number'
      ? rawPageCount
      : typeof rawPageCount === 'string'
        ? Number(rawPageCount)
        : NaN;

  if (!Number.isFinite(pageCount) || !Number.isInteger(pageCount) || pageCount <= 0) {
    return null;
  }

  return pageCount - 1;
}
