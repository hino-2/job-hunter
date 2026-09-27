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
  MAGNIT_TECH_API_BASE_URL,
  MAGNIT_TECH_DETAIL_PATH,
  MAGNIT_TECH_FIELD,
  MAGNIT_TECH_FIRST_PAGE_NUMBER,
  MAGNIT_TECH_HOST_PATTERN,
  MAGNIT_TECH_LIST_PATH,
  MAGNIT_TECH_NOT_LIST_MESSAGE,
  MAGNIT_TECH_PAGE_PARAM,
  MAGNIT_TECH_PARSER_KEY,
  MAGNIT_TECH_SITE_BASE_URL,
  MAGNIT_TECH_VACANCY_ID_MISSING_MESSAGE,
  MAGNIT_TECH_VACANCY_PATH,
  MAGNIT_TECH_VACANCY_PATH_PATTERN,
} from './magnit-tech.constants';

/**
 * §4.14/Stage 3: magnit.tech — JSON API с реальной постраничной пагинацией,
 * meta.has_more_pages (живая проверка 2026-09-27: 54 вакансии, 9 на страницу).
 */
@Injectable()
export class MagnitTechSiteParser implements CompanySiteParser {
  readonly key = MAGNIT_TECH_PARSER_KEY;

  constructor(private readonly httpClient: CompanySiteHttpClient) {}

  matches(url: URL): boolean {
    return MAGNIT_TECH_HOST_PATTERN.test(url.hostname);
  }

  fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult> {
    return collectPagedVacancies((index) => this.fetchPage(site.name, index));
  }

  private async fetchPage(company: string, index: number): Promise<CompanySitePageResult> {
    const url = new URL(MAGNIT_TECH_LIST_PATH, MAGNIT_TECH_API_BASE_URL);

    url.searchParams.set(MAGNIT_TECH_PAGE_PARAM, String(index + MAGNIT_TECH_FIRST_PAGE_NUMBER));

    const jsonResult = await this.httpClient.getJson(url.toString());

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return { ok: false, message: MAGNIT_TECH_NOT_LIST_MESSAGE };
    }

    const results = readArray(jsonResult.json, MAGNIT_TECH_FIELD.RESULTS);

    if (results === null) {
      return { ok: false, message: MAGNIT_TECH_NOT_LIST_MESSAGE };
    }

    const metaRaw = jsonResult.json[MAGNIT_TECH_FIELD.META];
    const hasMorePages = isRecord(metaRaw) ? metaRaw[MAGNIT_TECH_FIELD.HAS_MORE_PAGES] : null;

    const items: VacancySearchItem[] = [];
    let skippedInvalid = 0;

    for (const raw of results) {
      if (!isRecord(raw)) {
        skippedInvalid += 1;
        continue;
      }

      const id = readId(raw, MAGNIT_TECH_FIELD.ID);
      const title = readString(raw, MAGNIT_TECH_FIELD.TITLE);
      const position = title?.trim() ?? '';

      if (id === null || position.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      items.push(
        buildCompanySiteItem({
          vacancyUrl: `${MAGNIT_TECH_SITE_BASE_URL}${MAGNIT_TECH_VACANCY_PATH}/${id}`,
          position,
          company,
          areaName: readString(raw, MAGNIT_TECH_FIELD.LOCATION),
        }),
      );
    }

    return { ok: true, items, skippedInvalid, hasMore: hasMorePages === true };
  }

  async fetchDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const id = MAGNIT_TECH_VACANCY_PATH_PATTERN.exec(item.vacancyUrl)?.[1];

    if (id === undefined) {
      return { ok: false, message: MAGNIT_TECH_VACANCY_ID_MISSING_MESSAGE };
    }

    const jsonResult = await this.httpClient.getJson(
      `${MAGNIT_TECH_API_BASE_URL}${MAGNIT_TECH_DETAIL_PATH}/${id}`,
    );

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return toDescriptionResult(null);
    }

    const resultsRaw = jsonResult.json[MAGNIT_TECH_FIELD.RESULTS];

    if (!isRecord(resultsRaw)) {
      return toDescriptionResult(null);
    }

    return toDescriptionResult(
      joinDescriptionParts([readString(resultsRaw, MAGNIT_TECH_FIELD.DESCRIPTION)]),
    );
  }
}
