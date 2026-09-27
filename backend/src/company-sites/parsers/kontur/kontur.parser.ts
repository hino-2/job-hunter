import { Injectable } from '@nestjs/common';

import { decodeNumericHtmlEntities, htmlToPlainText } from '../../../common/html.helpers';
import type { VacancyDescriptionResult } from '../../../vacancies/vacancies.type';
import type { VacancySearchItem } from '../../../vacancies/vacancies.interfaces';
import type { CompanyCareerSite } from '../../company-career-sites/company-career-site.entity';
import { CompanySiteHttpClient } from '../../company-sites.http-client';
import {
  buildCompanySiteItem,
  collectPagedVacancies,
  extractPageText,
  matchVacancyAnchors,
  toDescriptionResult,
} from '../../company-sites.helpers';
import type { CompanySiteParser } from '../../company-sites.interfaces';
import type { CompanySiteListResult, CompanySitePageResult } from '../../company-sites.type';
import {
  KONTUR_FIRST_PAGE_NUMBER,
  KONTUR_HOST_PATTERN,
  KONTUR_LIST_PATH,
  KONTUR_PAGE_PARAM,
  KONTUR_PARSER_KEY,
  KONTUR_SITE_BASE_URL,
  KONTUR_VACANCY_ANCHOR_PATTERN,
  KONTUR_VACANCY_TITLE_SPAN_PATTERN,
} from './kontur.constants';

/**
 * §4.14: kontur.ru/career/vacancies — вся выдача рендерится на одной серверной
 * странице, сгруппированной по рубрикам (§4.14 — живая проверка 2026-09-27
 * подтвердила, что ?page=2 отдаёт байт-в-байт тот же HTML, что и ?page=1). Отдельный
 * код для этого не нужен: collectPagedVacancies сам остановится на второй странице,
 * не добавившей ни одного нового external_id — тратится один лишний запрос, не более.
 */
@Injectable()
export class KonturSiteParser implements CompanySiteParser {
  readonly key = KONTUR_PARSER_KEY;

  constructor(private readonly httpClient: CompanySiteHttpClient) {}

  matches(url: URL): boolean {
    return KONTUR_HOST_PATTERN.test(url.hostname);
  }

  fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult> {
    return collectPagedVacancies((index) => this.fetchPage(site.name, index));
  }

  private async fetchPage(company: string, index: number): Promise<CompanySitePageResult> {
    const url = new URL(KONTUR_LIST_PATH, KONTUR_SITE_BASE_URL);

    url.searchParams.set(KONTUR_PAGE_PARAM, String(index + KONTUR_FIRST_PAGE_NUMBER));

    const htmlResult = await this.httpClient.getHtml(url.toString());

    if (!htmlResult.ok) {
      return { ok: false, message: htmlResult.message };
    }

    const anchors = matchVacancyAnchors(htmlResult.html, KONTUR_VACANCY_ANCHOR_PATTERN);
    const items: VacancySearchItem[] = [];
    let skippedInvalid = 0;

    for (const anchor of anchors) {
      const titleHtml = KONTUR_VACANCY_TITLE_SPAN_PATTERN.exec(anchor.innerHtml)?.[1];

      if (titleHtml === undefined) {
        skippedInvalid += 1;
        continue;
      }

      const title = decodeNumericHtmlEntities(htmlToPlainText(titleHtml)).trim();

      if (title.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      items.push(
        buildCompanySiteItem({
          vacancyUrl: `${KONTUR_SITE_BASE_URL}${KONTUR_LIST_PATH}/${anchor.id}`,
          position: title,
          company,
        }),
      );
    }

    return { ok: true, items, skippedInvalid, hasMore: items.length > 0 };
  }

  async fetchDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const htmlResult = await this.httpClient.getHtml(item.vacancyUrl);

    if (!htmlResult.ok) {
      return { ok: false, message: htmlResult.message };
    }

    return toDescriptionResult(extractPageText(htmlResult.html));
  }
}
