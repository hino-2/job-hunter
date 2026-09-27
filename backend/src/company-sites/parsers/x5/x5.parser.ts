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
  X5_FIRST_PAGE_NUMBER,
  X5_HOST_PATTERN,
  X5_LIST_PATH,
  X5_PAGE_PARAM,
  X5_PARSER_KEY,
  X5_SITE_BASE_URL,
  X5_VACANCY_ANCHOR_PATTERN,
} from './x5.constants';

/** §4.14: x5.tech/vacancy — реальная постраничная пагинация ?page=N, n от 1 (живая проверка 2026-09-27). */
@Injectable()
export class X5SiteParser implements CompanySiteParser {
  readonly key = X5_PARSER_KEY;

  constructor(private readonly httpClient: CompanySiteHttpClient) {}

  matches(url: URL): boolean {
    return X5_HOST_PATTERN.test(url.hostname);
  }

  fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult> {
    return collectPagedVacancies((index) => this.fetchPage(site.name, index));
  }

  private async fetchPage(company: string, index: number): Promise<CompanySitePageResult> {
    const url = new URL(X5_LIST_PATH, X5_SITE_BASE_URL);

    url.searchParams.set(X5_PAGE_PARAM, String(index + X5_FIRST_PAGE_NUMBER));

    const htmlResult = await this.httpClient.getHtml(url.toString());

    if (!htmlResult.ok) {
      return { ok: false, message: htmlResult.message };
    }

    const anchors = matchVacancyAnchors(htmlResult.html, X5_VACANCY_ANCHOR_PATTERN);
    const items: VacancySearchItem[] = [];
    let skippedInvalid = 0;

    for (const anchor of anchors) {
      const title = decodeNumericHtmlEntities(htmlToPlainText(anchor.innerHtml)).trim();

      if (title.length === 0) {
        skippedInvalid += 1;
        continue;
      }

      items.push(
        buildCompanySiteItem({
          vacancyUrl: `${X5_SITE_BASE_URL}${X5_LIST_PATH}/${anchor.id}`,
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
