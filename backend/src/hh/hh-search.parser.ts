import { unescapeHtmlEntities } from '../common/html.helpers';
import { isRecord, readString } from '../vacancies/vacancy-json-ld.helpers';
import {
  HH_SEARCH_COMPANY_VISIBLE_NAME_FIELD,
  HH_SEARCH_COMPENSATION_FIELD,
  HH_SEARCH_ITEM_FIELD,
  HH_SEARCH_LAST_PAGE_FIELD,
  HH_SEARCH_NESTED_NAME_FIELD,
  HH_SEARCH_PAGE_FIELD,
  HH_SEARCH_PAGING_FIELD,
  HH_SEARCH_RESULT_FIELD,
  HH_SEARCH_STATE_CONTENT_GROUP,
  HH_SEARCH_STATE_TEMPLATE_PATTERN,
  HH_SEARCH_VACANCIES_FIELD,
  HH_SEARCH_WORK_FORMATS_SEPARATOR,
  HH_VACANCY_PAGE_PATH,
} from './hh.constants';
import type { VacancySearchItem, VacancySearchPage } from '../vacancies/vacancies.interfaces';
import type { HhSearchState } from './hh.interfaces';

/**
 * §4.11.3 шаг 3: явный предикат сужения unknown → HhSearchState. Отсутствие
 * vacancies или paging — fail-loud (возврат null из parseHhSearchPage целиком,
 * а не пропуск элементов): без них разбирать нечего. paging.lastPage при этом
 * не проверяется вглубь — он законно бывает null (см. комментарий к HhSearchState
 * в hh.interfaces.ts), читает его отдельно readLastPage с мягкой деградацией.
 */
function isHhSearchState(value: unknown): value is HhSearchState {
  if (!isRecord(value)) {
    return false;
  }

  const searchResult = value[HH_SEARCH_RESULT_FIELD];

  if (!isRecord(searchResult) || !Array.isArray(searchResult[HH_SEARCH_VACANCIES_FIELD])) {
    return false;
  }

  return isRecord(searchResult[HH_SEARCH_PAGING_FIELD]);
}

/**
 * §4.11.1/§4.11.3: мягкая деградация в null — проверено на живой выдаче
 * (14.08.2026): при короткой пагинации hh.ru отдаёт paging.lastPage: null,
 * а не объект {page}. «Сколько ещё страниц» не обязательно для разбора текущей.
 */
function readLastPage(paging: Record<string, unknown>): number | null {
  const lastPage = paging[HH_SEARCH_LAST_PAGE_FIELD];

  if (!isRecord(lastPage)) {
    return null;
  }

  const page = lastPage[HH_SEARCH_PAGE_FIELD];

  return typeof page === 'number' ? page : null;
}

/** vacancyId в живой выдаче — число, но narrowing принимает и строку про запас. */
function readIdentifier(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];

  if (typeof value === 'string') {
    return value;
  }

  return typeof value === 'number' ? String(value) : null;
}

function readNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];

  return typeof value === 'number' ? value : null;
}

function readBoolean(source: Record<string, unknown>, key: string): boolean | null {
  const value = source[key];

  return typeof value === 'boolean' ? value : null;
}

/** §4.11.6: creationTime обязателен, publicationTime.$ — фолбэк на тот же формат. */
function readPublishedAtIso(raw: Record<string, unknown>): string | null {
  const creationTime = readString(raw, HH_SEARCH_ITEM_FIELD.CREATION_TIME);

  if (creationTime !== null) {
    return creationTime;
  }

  const publicationTime = raw[HH_SEARCH_ITEM_FIELD.PUBLICATION_TIME];

  return isRecord(publicationTime)
    ? readString(publicationTime, HH_SEARCH_ITEM_FIELD.PUBLICATION_TIME_VALUE)
    : null;
}

function readAreaName(raw: Record<string, unknown>): string | null {
  const area = raw[HH_SEARCH_ITEM_FIELD.AREA];

  return isRecord(area) ? readString(area, HH_SEARCH_NESTED_NAME_FIELD) : null;
}

type CompensationFields = Pick<
  VacancySearchItem,
  'salaryFrom' | 'salaryTo' | 'salaryCurrency' | 'salaryGross'
>;

/** §4.11.3: compensation.{from,to,currencyCode,gross} — мягкая деградация в null поодиночке. */
function readCompensation(raw: Record<string, unknown>): CompensationFields {
  const compensation = raw[HH_SEARCH_ITEM_FIELD.COMPENSATION];

  if (!isRecord(compensation)) {
    return { salaryFrom: null, salaryTo: null, salaryCurrency: null, salaryGross: null };
  }

  return {
    salaryFrom: readNumber(compensation, HH_SEARCH_COMPENSATION_FIELD.FROM),
    salaryTo: readNumber(compensation, HH_SEARCH_COMPENSATION_FIELD.TO),
    salaryCurrency: readString(compensation, HH_SEARCH_COMPENSATION_FIELD.CURRENCY),
    salaryGross: readBoolean(compensation, HH_SEARCH_COMPENSATION_FIELD.GROSS),
  };
}

/** §4.11.3: workFormats[].workFormatsElement[] — склеены через запятую в одну строку. */
function readWorkFormats(raw: Record<string, unknown>): string | null {
  const workFormats = raw[HH_SEARCH_ITEM_FIELD.WORK_FORMATS];

  if (!Array.isArray(workFormats)) {
    return null;
  }

  const elements: string[] = [];

  for (const entry of workFormats as unknown[]) {
    if (!isRecord(entry)) {
      continue;
    }

    const inner = entry[HH_SEARCH_ITEM_FIELD.WORK_FORMATS_ELEMENT];

    if (!Array.isArray(inner)) {
      continue;
    }

    for (const value of inner as unknown[]) {
      if (typeof value === 'string') {
        elements.push(value);
      }
    }
  }

  return elements.length > 0 ? elements.join(HH_SEARCH_WORK_FORMATS_SEPARATOR) : null;
}

/**
 * §4.11.3: название компании. У анонимных работодателей `name` отсутствует, но есть
 * `visibleName` — без этого фолбэка такие вакансии выпадали бы из выдачи целиком.
 * Значение попадает и в ключ дедупликации, поэтому важно, что оно стабильно между
 * прогонами: обезличенное имя у одной вакансии не меняется.
 */
function readCompanyName(company: Record<string, unknown>): string | null {
  return (
    readString(company, HH_SEARCH_NESTED_NAME_FIELD) ??
    readString(company, HH_SEARCH_COMPANY_VISIBLE_NAME_FIELD)
  );
}

/**
 * §4.11.3: один элемент выдачи. externalId/position/company/publishedAtIso обязательны —
 * отсутствие любого из них возвращает null, и вызывающий считает это в skippedInvalid,
 * а не роняет разбор страницы целиком (мягкая деградация в противоположность
 * isHhSearchState выше).
 */
function parseSearchItem(raw: unknown, siteBaseUrl: string): VacancySearchItem | null {
  if (!isRecord(raw)) {
    return null;
  }

  const externalId = readIdentifier(raw, HH_SEARCH_ITEM_FIELD.EXTERNAL_ID);
  const position = readString(raw, HH_SEARCH_ITEM_FIELD.NAME);
  const companyRaw = raw[HH_SEARCH_ITEM_FIELD.COMPANY];
  const company = isRecord(companyRaw) ? readCompanyName(companyRaw) : null;
  const publishedAtIso = readPublishedAtIso(raw);

  if (externalId === null || position === null || company === null || publishedAtIso === null) {
    return null;
  }

  return {
    externalId,
    position,
    company,
    publishedAtIso,
    // §4.11.3: канонический адрес, а не links.desktop — тот несёт региональный хост.
    vacancyUrl: `${siteBaseUrl}${HH_VACANCY_PAGE_PATH}/${externalId}`,
    areaName: readAreaName(raw),
    ...readCompensation(raw),
    experience: readString(raw, HH_SEARCH_ITEM_FIELD.WORK_EXPERIENCE),
    employmentForm: readString(raw, HH_SEARCH_ITEM_FIELD.EMPLOYMENT_FORM),
    workFormats: readWorkFormats(raw),
  };
}

/**
 * Разбор страницы выдачи hh.ru (§4.11.3). Чистая функция, как и parseHhVacancyPage:
 * без зависимостей и состояния.
 *
 * Порядок: регекс достаёт содержимое <template id="HH-Lux-InitialState">, снимает
 * HTML-экранирование (unescapeHtmlEntities — &amp; последним, иначе &amp;quot;
 * превратится в кавычку и сломает JSON), JSON.parse, затем isHhSearchState сужает
 * unknown явным предикатом.
 *
 * Fail-loud (§4.11.3): нет тега, не распарсился JSON или нет обязательных полей
 * состояния — null целиком, а не «нашли 0 вакансий». Внутри списка вакансий —
 * мягкая деградация поэлементно (см. parseSearchItem).
 */
export function parseHhSearchPage(html: unknown, siteBaseUrl: string): VacancySearchPage | null {
  if (typeof html !== 'string' || html.length === 0) {
    return null;
  }

  const match = HH_SEARCH_STATE_TEMPLATE_PATTERN.exec(html);
  const raw = match?.[HH_SEARCH_STATE_CONTENT_GROUP];

  if (raw === undefined) {
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(unescapeHtmlEntities(raw));
  } catch {
    return null;
  }

  if (!isHhSearchState(parsed)) {
    return null;
  }

  const { vacancies, paging } = parsed.vacancySearchResult;
  const items: VacancySearchItem[] = [];
  let skippedInvalid = 0;

  for (const entry of vacancies) {
    const item = parseSearchItem(entry, siteBaseUrl);

    if (item === null) {
      skippedInvalid += 1;
      continue;
    }

    items.push(item);
  }

  return { items, lastPage: readLastPage(paging), skippedInvalid };
}
