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
  DODO_API_BASE_URL,
  DODO_DESCRIPTION_CONTENT_TYPES,
  DODO_DETAIL_PATH,
  DODO_FIELD,
  DODO_HOST_PATTERN,
  DODO_LIST_PATH,
  DODO_NOT_LIST_MESSAGE,
  DODO_PARSER_KEY,
  DODO_SITE_BASE_URL,
  DODO_VACANCY_ID_MISSING_MESSAGE,
  DODO_VACANCY_ID_QUERY_PARAM,
  DODO_VACANCY_PATH,
} from './dodo.constants';

/**
 * §4.14/Stage 3: job-site-backend.dodo-ai-platform.io — один вызов на весь список
 * (живая проверка 2026-09-27, без пагинации), сгруппированный по speciality/
 * subspeciality. Описание — отдельный JSON-эндпоинт (см. dodo.constants.ts), а не
 * HTML-фолбэк: SPA-страница пуста без него.
 */
@Injectable()
export class DodoSiteParser implements CompanySiteParser {
  readonly key = DODO_PARSER_KEY;

  constructor(private readonly httpClient: CompanySiteHttpClient) {}

  matches(url: URL): boolean {
    return DODO_HOST_PATTERN.test(url.hostname);
  }

  fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult> {
    return collectPagedVacancies((index) => this.fetchPage(site.name, index));
  }

  private async fetchPage(company: string, index: number): Promise<CompanySitePageResult> {
    if (index > 0) {
      return { ok: true, items: [], skippedInvalid: 0, hasMore: false };
    }

    const jsonResult = await this.httpClient.getJson(`${DODO_API_BASE_URL}${DODO_LIST_PATH}`);

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return { ok: false, message: DODO_NOT_LIST_MESSAGE };
    }

    const groups = readArray(jsonResult.json, DODO_FIELD.DATA);

    if (groups === null) {
      return { ok: false, message: DODO_NOT_LIST_MESSAGE };
    }

    const items: VacancySearchItem[] = [];
    let skippedInvalid = 0;

    for (const raw of this.flattenGroups(groups)) {
      if (!isRecord(raw)) {
        skippedInvalid += 1;
        continue;
      }

      const id = readId(raw, DODO_FIELD.ID);
      const position = readString(raw, DODO_FIELD.POSITION);
      const title = position?.trim() ?? '';

      if (id === null || title.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      items.push(
        buildCompanySiteItem({
          vacancyUrl: this.buildVacancyUrl(id),
          position: title,
          company,
          areaName: readString(raw, DODO_FIELD.VACANCY_LOCATION) || null,
        }),
      );
    }

    return { ok: true, items, skippedInvalid, hasMore: false };
  }

  /**
   * §4.14/Stage 3: каждая speciality-группа несёт свои вакансии в items[]. В живой
   * выдаче subspeciality — просто список названий подрубрик (string[]), но блюпринт
   * (§4.14) допускает и форму [{ items: [...] }] — она тоже разворачивается, если
   * когда-нибудь встретится: isRecord(sub) молча пропускает голые строки.
   */
  private flattenGroups(groups: readonly unknown[]): unknown[] {
    const flattened: unknown[] = [];

    for (const group of groups) {
      if (!isRecord(group)) {
        continue;
      }

      flattened.push(...(readArray(group, DODO_FIELD.ITEMS) ?? []));

      for (const sub of readArray(group, DODO_FIELD.SUBSPECIALITY) ?? []) {
        if (isRecord(sub)) {
          flattened.push(...(readArray(sub, DODO_FIELD.ITEMS) ?? []));
        }
      }
    }

    return flattened;
  }

  private buildVacancyUrl(id: string): string {
    const url = new URL(DODO_VACANCY_PATH, DODO_SITE_BASE_URL);

    url.searchParams.set(DODO_VACANCY_ID_QUERY_PARAM, id);

    return url.toString();
  }

  async fetchDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const id = new URL(item.vacancyUrl).searchParams.get(DODO_VACANCY_ID_QUERY_PARAM);

    if (id === null) {
      return { ok: false, message: DODO_VACANCY_ID_MISSING_MESSAGE };
    }

    const jsonResult = await this.httpClient.getJson(
      `${DODO_API_BASE_URL}${DODO_DETAIL_PATH}/${id}`,
    );

    if (!jsonResult.ok) {
      return { ok: false, message: jsonResult.message };
    }

    if (!isRecord(jsonResult.json)) {
      return toDescriptionResult(null);
    }

    const dataRaw = jsonResult.json[DODO_FIELD.DATA];
    const pageRaw = isRecord(dataRaw) ? dataRaw[DODO_FIELD.PAGE] : null;
    const content = isRecord(pageRaw) ? readArray(pageRaw, DODO_FIELD.CONTENT) : null;

    if (content === null) {
      return toDescriptionResult(null);
    }

    const parts = content.map((entry) => {
      if (!isRecord(entry)) {
        return null;
      }

      const type = readString(entry, DODO_FIELD.TYPE);

      if (type === null || !DODO_DESCRIPTION_CONTENT_TYPES.includes(type)) {
        return null;
      }

      const data = entry[DODO_FIELD.DATA];

      return isRecord(data) ? readString(data, DODO_FIELD.TEXT) : null;
    });

    return toDescriptionResult(joinDescriptionParts(parts));
  }
}
