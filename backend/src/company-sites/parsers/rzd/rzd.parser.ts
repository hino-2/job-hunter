import { Injectable } from '@nestjs/common';

import { isRecord, readString } from '../../../vacancies/vacancy-json-ld.helpers';
import type { VacancyDescriptionResult } from '../../../vacancies/vacancies.type';
import type { VacancySearchItem } from '../../../vacancies/vacancies.interfaces';
import type { CompanyCareerSite } from '../../company-career-sites/company-career-site.entity';
import { CompanySiteHttpClient } from '../../company-sites.http-client';
import {
  buildCompanySiteItem,
  collectPagedVacancies,
  joinDescriptionParts,
  readArray,
  readId,
  toDescriptionResult,
} from '../../company-sites.helpers';
import type { CompanySiteParser } from '../../company-sites.interfaces';
import type { CompanySiteListResult, CompanySitePageResult } from '../../company-sites.type';
import {
  RZD_API_BASE_URL,
  RZD_DETAIL_PATH,
  RZD_DIRECTION_ID_PARAM,
  RZD_DIRECTION_ID_VALUE,
  RZD_FIELD,
  RZD_FIRST_PAGE_NUMBER,
  RZD_HOST_PATTERN,
  RZD_LIST_PATH,
  RZD_NOT_LIST_MESSAGE,
  RZD_PAGE_PARAM,
  RZD_PARSER_KEY,
  RZD_PER_PAGE_PARAM,
  RZD_PER_PAGE_VALUE,
  RZD_SITE_BASE_URL,
  RZD_VACANCY_ID_MISSING_MESSAGE,
  RZD_VACANCY_PATH,
  RZD_VACANCY_PATH_PATTERN,
} from './rzd.constants';

/** Число внутри JSON-ответа team.rzd.ru — meta.page/pages, salary_from/salary_to. */
function readNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];

  return typeof value === 'number' ? value : null;
}

/**
 * §4.14/Stage 3: team.rzd.ru — единственный парсер, отдающий настоящий published_at
 * (остальные источники company-sites/ — first-seen, §4.14). Реальная постраничная
 * пагинация: meta.page/meta.pages (живая проверка 2026-09-27 — 13 вакансий на одной
 * странице при per_page=100).
 */
@Injectable()
export class RzdSiteParser implements CompanySiteParser {
  readonly key = RZD_PARSER_KEY;

  constructor(private readonly httpClient: CompanySiteHttpClient) {}

  matches(url: URL): boolean {
    return RZD_HOST_PATTERN.test(url.hostname);
  }

  fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult> {
    return collectPagedVacancies((index) => this.fetchPage(site.name, index));
  }

  private async fetchPage(company: string, index: number): Promise<CompanySitePageResult> {
    const url = new URL(RZD_LIST_PATH, RZD_API_BASE_URL);

    url.searchParams.set(RZD_DIRECTION_ID_PARAM, RZD_DIRECTION_ID_VALUE);
    url.searchParams.set(RZD_PER_PAGE_PARAM, RZD_PER_PAGE_VALUE);
    url.searchParams.set(RZD_PAGE_PARAM, String(index + RZD_FIRST_PAGE_NUMBER));

    const jsonResult = await this.httpClient.getJson(url.toString());

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return { ok: false, message: RZD_NOT_LIST_MESSAGE };
    }

    const data = readArray(jsonResult.json, RZD_FIELD.DATA);

    if (data === null) {
      return { ok: false, message: RZD_NOT_LIST_MESSAGE };
    }

    const metaRaw = jsonResult.json[RZD_FIELD.META];
    const meta = isRecord(metaRaw) ? metaRaw : null;
    const page = meta === null ? null : readNumber(meta, RZD_FIELD.PAGE);
    const pages = meta === null ? null : readNumber(meta, RZD_FIELD.PAGES);

    const items: VacancySearchItem[] = [];
    let skippedInvalid = 0;

    for (const raw of data) {
      if (!isRecord(raw)) {
        skippedInvalid += 1;
        continue;
      }

      const id = readId(raw, RZD_FIELD.ID);
      const position = readString(raw, RZD_FIELD.POSITION_TITLE);
      const title = position?.trim() ?? '';

      if (id === null || title.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      items.push(
        buildCompanySiteItem({
          vacancyUrl: `${RZD_SITE_BASE_URL}${RZD_VACANCY_PATH}/${id}`,
          position: title,
          company,
          publishedAtIso: readString(raw, RZD_FIELD.PUBLISHED_AT),
          areaName: readString(raw, RZD_FIELD.LOCALITY_NAME),
          salaryFrom: readNumber(raw, RZD_FIELD.SALARY_FROM),
          salaryTo: readNumber(raw, RZD_FIELD.SALARY_TO),
        }),
      );
    }

    const hasMore = page !== null && pages !== null && page < pages && data.length > 0;

    return { ok: true, items, skippedInvalid, hasMore };
  }

  async fetchDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const id = RZD_VACANCY_PATH_PATTERN.exec(item.vacancyUrl)?.[1];

    if (id === undefined) {
      return { ok: false, message: RZD_VACANCY_ID_MISSING_MESSAGE };
    }

    const jsonResult = await this.httpClient.getJson(`${RZD_API_BASE_URL}${RZD_DETAIL_PATH}/${id}`);

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return toDescriptionResult(null);
    }

    return toDescriptionResult(
      joinDescriptionParts([
        readString(jsonResult.json, RZD_FIELD.DESCRIPTION),
        readString(jsonResult.json, RZD_FIELD.RESPONSIBILITIES),
        readString(jsonResult.json, RZD_FIELD.REQUIREMENTS),
        readString(jsonResult.json, RZD_FIELD.CONDITIONS),
      ]),
    );
  }
}
