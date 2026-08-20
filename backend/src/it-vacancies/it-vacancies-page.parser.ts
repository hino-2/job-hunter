import { JSON_LD_FIELD } from '../vacancies/vacancies.constants';
import type { Vacancy } from '../vacancies/vacancies.interfaces';
import {
  extractJsonLdEntries,
  findJobPosting,
  isRecord,
  readString,
} from '../vacancies/vacancy-json-ld.helpers';
import {
  IT_VACANCIES_ARCHIVED_MARKER_PATTERN,
  IT_VACANCIES_LOGO_ALLOWED_HOST_PATTERN,
} from './it-vacancies.constants';
import { extractContentBlock } from './it-vacancies-html.helpers';
import { readItVacanciesLogoUrl } from './it-vacancies-json-ld.helpers';

/**
 * §4.3, §4.10: разбор страницы вакансии it-vacancies.ru для синхронизации. Чистая
 * функция, как и parseHhVacancyPage/parseGetmatchVacancyPage: без зависимостей и
 * состояния, никогда не бросает.
 *
 * Отсутствие блока JobPosting — fail-loud null (исход ERROR), как у hh.ru: значит
 * вёрстка или разметка источника изменилась, и молча писать «вакансия активна» на
 * основании нераспознанной страницы нельзя. «Вакансии нет» приезжает статусом 404,
 * а не пустой страницей, поэтому третьего состояния (как ABSENT у getmatch) здесь
 * не нужно.
 */
export function parseItVacanciesVacancyPage(html: unknown, logoBaseUrl: string): Vacancy | null {
  if (typeof html !== 'string' || html.length === 0) {
    return null;
  }

  const jobPosting = findJobPosting(extractJsonLdEntries(html));

  if (jobPosting === null) {
    return null;
  }

  const logoUrl = readItVacanciesLogoUrl(jobPosting, logoBaseUrl);
  const hiringOrganization = jobPosting[JSON_LD_FIELD.HIRING_ORGANIZATION];

  return {
    name: readString(jobPosting, JSON_LD_FIELD.TITLE),
    archived: resolveArchived(html),
    employerName: isRecord(hiringOrganization)
      ? readString(hiringOrganization, JSON_LD_FIELD.NAME)
      : null,
    logoUrl,
    // Тот же allow-list, которым уже проверили logoUrl (§4.10) — CompanyLogoService
    // повторит эту проверку на каждом хопе редиректа, а не только на исходном URL.
    logoAllowedHostPattern: logoUrl === null ? null : IT_VACANCIES_LOGO_ALLOWED_HOST_PATTERN,
  };
}

/**
 * §4.3: НЕ ПРОВЕРЕНО. Ни на одной живой странице маркера снятой вакансии нет —
 * archived_at/is_active существуют только внутри минифицированного window.__NUXT__,
 * а вычислять его запрещено (§2.4). Проектное допущение: снятая вакансия отвечает
 * 404 → исход NOT_FOUND, поэтому дефолт здесь false, а не null: возвращать
 * «признак не определён» на КАЖДОЙ живой странице означало бы ERROR на каждой
 * синхронизации (в отличие от hh.ru, где признак в разметке есть и его отсутствие
 * действительно является поломкой).
 *
 * Маркер ищется по странице БЕЗ блока описания: текст вакансии сам может содержать
 * «вакансия закрыта» (например, в истории правок), и это не должно переводить
 * запись в архив.
 */
function resolveArchived(html: string): boolean {
  const contentBlock = extractContentBlock(html);
  const withoutDescription = contentBlock === null ? html : html.split(contentBlock).join('');

  return IT_VACANCIES_ARCHIVED_MARKER_PATTERN.test(withoutDescription);
}
