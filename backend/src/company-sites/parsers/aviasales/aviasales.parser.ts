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
  readId,
  toDescriptionResult,
} from '../../company-sites.helpers';
import type { CompanySiteParser } from '../../company-sites.interfaces';
import type { CompanySiteListResult, CompanySitePageResult } from '../../company-sites.type';
import {
  AVIASALES_DETAIL_LANGUAGE_PARAM,
  AVIASALES_DETAIL_LANGUAGE_VALUE,
  AVIASALES_DETAIL_URL_BASE,
  AVIASALES_FIELD,
  AVIASALES_HOST_PATTERN,
  AVIASALES_LIST_URL,
  AVIASALES_NOT_LIST_MESSAGE,
  AVIASALES_PARSER_KEY,
  AVIASALES_SITE_BASE_URL,
  AVIASALES_VACANCY_ID_MISSING_MESSAGE,
  AVIASALES_VACANCY_PATH,
  AVIASALES_VACANCY_PATH_PATTERN,
} from './aviasales.constants';

/**
 * §4.14/Stage 3: vacancies-app.aviasales.ru — JSON API, один вызов на весь список
 * (живая проверка 2026-09-27: 27 вакансий одним ответом, пагинации у источника нет).
 */
@Injectable()
export class AviasalesSiteParser implements CompanySiteParser {
  readonly key = AVIASALES_PARSER_KEY;

  constructor(private readonly httpClient: CompanySiteHttpClient) {}

  matches(url: URL): boolean {
    return AVIASALES_HOST_PATTERN.test(url.hostname);
  }

  fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult> {
    return collectPagedVacancies((index) => this.fetchPage(site.name, index));
  }

  private async fetchPage(company: string, index: number): Promise<CompanySitePageResult> {
    if (index > 0) {
      return { ok: true, items: [], skippedInvalid: 0, hasMore: false };
    }

    const jsonResult = await this.httpClient.getJson(AVIASALES_LIST_URL);

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!Array.isArray(jsonResult.json)) {
      return { ok: false, message: AVIASALES_NOT_LIST_MESSAGE };
    }

    const items: VacancySearchItem[] = [];
    let skippedInvalid = 0;

    for (const raw of jsonResult.json) {
      if (!isRecord(raw)) {
        skippedInvalid += 1;
        continue;
      }

      const id = readId(raw, AVIASALES_FIELD.ID);
      const position = readString(raw, AVIASALES_FIELD.POSITION);
      const title = position?.trim() ?? '';

      if (id === null || title.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      items.push(
        buildCompanySiteItem({
          vacancyUrl: `${AVIASALES_SITE_BASE_URL}${AVIASALES_VACANCY_PATH}/${id}`,
          position: title,
          company,
          areaName: readString(raw, AVIASALES_FIELD.WORK_PLACE),
        }),
      );
    }

    return { ok: true, items, skippedInvalid, hasMore: false };
  }

  async fetchDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const id = AVIASALES_VACANCY_PATH_PATTERN.exec(item.vacancyUrl)?.[1];

    if (id === undefined) {
      return { ok: false, message: AVIASALES_VACANCY_ID_MISSING_MESSAGE };
    }

    const url = new URL(`${AVIASALES_DETAIL_URL_BASE}/${id}`);

    url.searchParams.set(AVIASALES_DETAIL_LANGUAGE_PARAM, AVIASALES_DETAIL_LANGUAGE_VALUE);

    const jsonResult = await this.httpClient.getJson(url.toString());

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return toDescriptionResult(null);
    }

    return toDescriptionResult(
      joinDescriptionParts([readString(jsonResult.json, AVIASALES_FIELD.DESCRIPTION)]),
    );
  }
}
