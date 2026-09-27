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
  WILDBERRIES_API_BASE_URL,
  WILDBERRIES_DETAIL_PATH,
  WILDBERRIES_DIRECTION_IDS_PARAM,
  WILDBERRIES_DIRECTION_ID_VALUE,
  WILDBERRIES_FIELD,
  WILDBERRIES_HOST_PATTERN,
  WILDBERRIES_LIMIT,
  WILDBERRIES_LIST_PATH,
  WILDBERRIES_NOT_LIST_MESSAGE,
  WILDBERRIES_PARSER_KEY,
  WILDBERRIES_SITE_BASE_URL,
  WILDBERRIES_VACANCY_ID_MISSING_MESSAGE,
  WILDBERRIES_VACANCY_PATH,
  WILDBERRIES_VACANCY_PATH_PATTERN,
} from './wildberries.constants';

/** Число внутри JSON-ответа career.rwb.ru — range.count. */
function readNumber(source: Record<string, unknown>, key: string): number | null {
  const value = source[key];

  return typeof value === 'number' ? value : null;
}

/**
 * §4.14/Stage 3: career.rwb.ru — JSON API с реальным offset/limit (живая проверка
 * 2026-09-27: direction_ids[]=3 фильтрует до 10 вакансий «Разработки»). Строка URL
 * собирается литерально (см. WILDBERRIES_DIRECTION_IDS_PARAM) — квадратные скобки
 * не должны уйти закодированными.
 */
@Injectable()
export class WildberriesSiteParser implements CompanySiteParser {
  readonly key = WILDBERRIES_PARSER_KEY;

  constructor(private readonly httpClient: CompanySiteHttpClient) {}

  matches(url: URL): boolean {
    return WILDBERRIES_HOST_PATTERN.test(url.hostname);
  }

  fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult> {
    return collectPagedVacancies((index) => this.fetchPage(site.name, index));
  }

  private async fetchPage(company: string, index: number): Promise<CompanySitePageResult> {
    const offset = index * WILDBERRIES_LIMIT;
    const url =
      `${WILDBERRIES_API_BASE_URL}${WILDBERRIES_LIST_PATH}` +
      `?limit=${WILDBERRIES_LIMIT}&offset=${offset}` +
      `&${WILDBERRIES_DIRECTION_IDS_PARAM}=${WILDBERRIES_DIRECTION_ID_VALUE}`;

    const jsonResult = await this.httpClient.getJson(url);

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return { ok: false, message: WILDBERRIES_NOT_LIST_MESSAGE };
    }

    const dataRaw = jsonResult.json[WILDBERRIES_FIELD.DATA];

    if (!isRecord(dataRaw)) {
      return { ok: false, message: WILDBERRIES_NOT_LIST_MESSAGE };
    }

    const rawItems = readArray(dataRaw, WILDBERRIES_FIELD.ITEMS);

    if (rawItems === null) {
      return { ok: false, message: WILDBERRIES_NOT_LIST_MESSAGE };
    }

    const rangeRaw = dataRaw[WILDBERRIES_FIELD.RANGE];
    const count = isRecord(rangeRaw) ? readNumber(rangeRaw, WILDBERRIES_FIELD.COUNT) : null;

    const items: VacancySearchItem[] = [];
    let skippedInvalid = 0;

    for (const raw of rawItems) {
      if (!isRecord(raw)) {
        skippedInvalid += 1;
        continue;
      }

      const id = readId(raw, WILDBERRIES_FIELD.ID);
      const name = readString(raw, WILDBERRIES_FIELD.NAME);
      const title = name?.trim() ?? '';

      if (id === null || title.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      items.push(
        buildCompanySiteItem({
          vacancyUrl: `${WILDBERRIES_SITE_BASE_URL}${WILDBERRIES_VACANCY_PATH}/${id}`,
          position: title,
          company,
          areaName: readString(raw, WILDBERRIES_FIELD.CITY_TITLE) || null,
        }),
      );
    }

    const hasMore = count !== null && offset + rawItems.length < count && rawItems.length > 0;

    return { ok: true, items, skippedInvalid, hasMore };
  }

  async fetchDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const id = WILDBERRIES_VACANCY_PATH_PATTERN.exec(item.vacancyUrl)?.[1];

    if (id === undefined) {
      return { ok: false, message: WILDBERRIES_VACANCY_ID_MISSING_MESSAGE };
    }

    const jsonResult = await this.httpClient.getJson(
      `${WILDBERRIES_API_BASE_URL}${WILDBERRIES_DETAIL_PATH}/${id}`,
    );

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return toDescriptionResult(null);
    }

    const dataRaw = jsonResult.json[WILDBERRIES_FIELD.DATA];

    if (!isRecord(dataRaw)) {
      return toDescriptionResult(null);
    }

    return toDescriptionResult(
      joinDescriptionParts([
        readString(dataRaw, WILDBERRIES_FIELD.DESCRIPTION),
        readString(dataRaw, WILDBERRIES_FIELD.DUTIES),
        readString(dataRaw, WILDBERRIES_FIELD.REQUIREMENTS),
        readString(dataRaw, WILDBERRIES_FIELD.CONDITIONS),
      ]),
    );
  }
}
