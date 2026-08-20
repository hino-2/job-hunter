import { unescapeHtmlEntities } from '../common/html.helpers';
import { JSON_LD_FIELD } from '../vacancies/vacancies.constants';
import type { VacancySearchItem, VacancySearchPage } from '../vacancies/vacancies.interfaces';
import {
  extractJsonLdEntries,
  findJobPostings,
  isRecord,
  readString,
} from '../vacancies/vacancy-json-ld.helpers';
import {
  IT_VACANCIES_JSON_LD_FIELD,
  IT_VACANCIES_SEARCH_CARD_HREF_PATTERN,
  IT_VACANCIES_SEARCH_CARD_ID_GROUP,
  IT_VACANCIES_TITLE_HIGHLIGHT_PATTERN,
  IT_VACANCIES_VACANCY_PAGE_PATH,
  IT_VACANCIES_WHITESPACE_RUN_PATTERN,
} from './it-vacancies.constants';
import { normalizeItVacanciesDate, readItVacanciesAreaName } from './it-vacancies-json-ld.helpers';

/**
 * §4.11.3: разбор страницы выдачи it-vacancies.ru. Принципиальное отличие от hh.ru:
 * в JobPosting выдачи НЕТ ни id вакансии, ни ссылки на неё. Поэтому внешние ID
 * берутся из ссылок карточек (href="/vacancies/{id}/…") и сопоставляются с
 * JobPosting'ами ПО ИНДЕКСУ — порядок карточек в разметке совпадает с порядком
 * JobPosting в @graph (проверено на живой выдаче 18.08.2026: 20 JobPosting,
 * 40 ссылок = по две на карточку, 20 уникальных ID в том же порядке).
 *
 * Из-за этого сопоставления число элементов — критичный инвариант: расхождение
 * означает, что разметка изменилась, и привязка ID к вакансии больше не надёжна.
 * Такой случай — fail-loud null (прогон останавливается с ERROR), а не «привяжем
 * как получится».
 *
 * Никогда не бросает: любой мусор на входе — null.
 */
export function parseItVacanciesSearchPage(
  html: unknown,
  siteBaseUrl: string,
): VacancySearchPage | null {
  if (typeof html !== 'string' || html.length === 0) {
    return null;
  }

  const entries = extractJsonLdEntries(html);

  // Ни одного блока ld+json — так выглядит редирект, капча или блокировка;
  // это не «нашли 0 вакансий», а поломка (§4.11.3).
  if (entries.length === 0) {
    return null;
  }

  const postings = findJobPostings(entries);
  const externalIds = readCardExternalIds(html);

  // Два независимых сигнала согласованно говорят «пусто» — штатный конец выдачи.
  if (postings.length === 0 && externalIds.length === 0) {
    return { items: [], lastPage: null, skippedInvalid: 0 };
  }

  if (postings.length !== externalIds.length) {
    return null;
  }

  const items: VacancySearchItem[] = [];
  let skippedInvalid = 0;

  postings.forEach((posting, index) => {
    // Длины совпали проверкой выше, поэтому индекс заведомо в границах; ?? '' здесь
    // только чтобы не расширять тип до undefined под noUncheckedIndexedAccess.
    const item = parseSearchItem(posting, externalIds[index] ?? '', siteBaseUrl);

    if (item === null) {
      skippedInvalid += 1;

      return;
    }

    items.push(item);
  });

  // lastPage всегда null: разметка показывает лишь окно пагинации (page=2..5 из 14),
  // и принять его за потолок означало бы обрезать прогон на пятой странице. Конец
  // выдачи определяется пустой страницей и бюджетом VACANCY_SCAN_MAX_PAGES (§4.11.1).
  return { items, lastPage: null, skippedInvalid };
}

/**
 * Диагностика провала разбора для лога сервиса (§4.11.3, «Наблюдаемость» блюпринта):
 * сколько JobPosting и сколько уникальных ссылок карточек нашлось на странице.
 * Расхождение этих двух чисел — самая вероятная поломка при правке разметки
 * источника, поэтому в лог обязаны попасть оба.
 *
 * Отдельная функция, а не поле результата: парсер остаётся чистым и с прежней
 * сигнатурой (VacancySearchPage | null), а повторный проход по HTML случается
 * только на пути ошибки — то есть редко.
 */
export function countItVacanciesSearchSignals(html: unknown): {
  postings: number;
  cards: number;
} {
  if (typeof html !== 'string') {
    return { postings: 0, cards: 0 };
  }

  return {
    postings: findJobPostings(extractJsonLdEntries(html)).length,
    cards: readCardExternalIds(html).length,
  };
}

/**
 * Уникальные ID карточек в порядке первого вхождения: каждая карточка даёт две
 * одинаковые ссылки (обёртка логотипа и заголовок), а сопоставление по индексу
 * требует ровно по одному ID на JobPosting.
 */
function readCardExternalIds(html: string): string[] {
  const seen = new Set<string>();

  // matchAll, а не exec в цикле: у глобального регекса lastIndex мутируется, и общий
  // экземпляр из constants сломал бы следующий вызов.
  for (const match of html.matchAll(IT_VACANCIES_SEARCH_CARD_HREF_PATTERN)) {
    const externalId = match[IT_VACANCIES_SEARCH_CARD_ID_GROUP];

    if (externalId !== undefined) {
      seen.add(externalId);
    }
  }

  return [...seen];
}

/**
 * §4.11.3: один JobPosting выдачи → элемент. Отсутствие обязательного поля
 * (title / hiringOrganization.name / datePosted) — мягкий пропуск одного элемента
 * (skippedInvalid), а не срыв разбора страницы.
 *
 * Поля, которых источник не отдаёт, остаются null осознанно (§4.11.3):
 * salaryCurrency — потому что источник рапортует "RUB" даже для карточки с окладом
 * в долларах, то есть значение недостоверно; salaryGross, experience,
 * employmentForm, workFormats — потому что в выдаче их нет вовсе (employmentType и
 * jobLocationType всегда «Не указан»/«Не указано»).
 */
function parseSearchItem(
  posting: Record<string, unknown>,
  externalId: string,
  siteBaseUrl: string,
): VacancySearchItem | null {
  const rawTitle = readString(posting, JSON_LD_FIELD.TITLE);
  const hiringOrganization = posting[JSON_LD_FIELD.HIRING_ORGANIZATION];
  const rawCompany = isRecord(hiringOrganization)
    ? readString(hiringOrganization, JSON_LD_FIELD.NAME)
    : null;
  const publishedAtIso = normalizeItVacanciesDate(
    readString(posting, IT_VACANCIES_JSON_LD_FIELD.DATE_POSTED),
  );

  if (rawTitle === null || rawCompany === null || publishedAtIso === null) {
    return null;
  }

  const position = normalizeSearchTitle(rawTitle);
  const company = normalizeWhitespace(unescapeHtmlEntities(rawCompany));

  if (position.length === 0 || company.length === 0 || externalId.length === 0) {
    return null;
  }

  const salary = readSalaryRange(posting);

  return {
    externalId,
    position,
    company,
    publishedAtIso,
    // Канонический URL, а не href карточки: тот несёт трекинговый ?query=… .
    vacancyUrl: `${siteBaseUrl}${IT_VACANCIES_VACANCY_PAGE_PATH}/${externalId}/`,
    areaName: readItVacanciesAreaName(posting),
    salaryFrom: salary.salaryFrom,
    salaryTo: salary.salaryTo,
    salaryCurrency: null,
    salaryGross: null,
    experience: null,
    employmentForm: null,
    workFormats: null,
  };
}

/** §4.11.3: заголовок выдачи размечен подсветкой совпадений — <em> вырезается. */
function normalizeSearchTitle(rawTitle: string): string {
  const withoutHighlight = rawTitle.replace(IT_VACANCIES_TITLE_HIGHLIGHT_PATTERN, '');

  return normalizeWhitespace(unescapeHtmlEntities(withoutHighlight));
}

/** Пробельные серии разметки схлопываются в один пробел — колонка хранит одну строку. */
function normalizeWhitespace(value: string): string {
  return value.replace(IT_VACANCIES_WHITESPACE_RUN_PATTERN, ' ').trim();
}

/**
 * §4.11.3: baseSalary.value.{minValue,maxValue}. Ноль и отрицательные значения —
 * это «оклад не указан» в разметке источника, а не оклад 0 ₽.
 */
function readSalaryRange(posting: Record<string, unknown>): {
  salaryFrom: number | null;
  salaryTo: number | null;
} {
  const baseSalary = posting[IT_VACANCIES_JSON_LD_FIELD.BASE_SALARY];

  if (!isRecord(baseSalary)) {
    return { salaryFrom: null, salaryTo: null };
  }

  const value = baseSalary[IT_VACANCIES_JSON_LD_FIELD.VALUE];

  if (!isRecord(value)) {
    return { salaryFrom: null, salaryTo: null };
  }

  return {
    salaryFrom: readPositiveNumber(value[IT_VACANCIES_JSON_LD_FIELD.MIN_VALUE]),
    salaryTo: readPositiveNumber(value[IT_VACANCIES_JSON_LD_FIELD.MAX_VALUE]),
  };
}

function readPositiveNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  return value;
}
