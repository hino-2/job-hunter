import { Injectable } from '@nestjs/common';

import { isAllowedHhSearchUrlOrigin } from '../../../hh/hh-search-url.helpers';
import { HhSearchService } from '../../../hh/hh-search.service';
import { parseHhVacancyId } from '../../../hh/hh-url.parser';
import type { VacancyDescriptionResult } from '../../../vacancies/vacancies.type';
import type { VacancySearchItem } from '../../../vacancies/vacancies.interfaces';
import type { CompanyCareerSite } from '../../company-career-sites/company-career-site.entity';
import { buildCompanySiteItem, collectPagedVacancies } from '../../company-sites.helpers';
import type { CompanySiteParser } from '../../company-sites.interfaces';
import type { CompanySiteListResult, CompanySitePageResult } from '../../company-sites.type';
import {
  HH_SEARCH_PARSER_KEY,
  HH_SEARCH_PARSER_NOT_SEARCH_URL_MESSAGE,
  HH_SEARCH_PARSER_ORDER_PARAM,
  HH_SEARCH_PARSER_ORDER_VALUE,
  HH_SEARCH_PARSER_PAGE_PARAM,
  HH_SEARCH_PARSER_SEARCH_PATH,
  HH_SEARCH_PARSER_VACANCY_ID_MISSING_MESSAGE,
} from './hh-search.constants';

/**
 * §4.14/D9: строка «сайт компании» — обычная ссылка на выдачу hh.ru (например, поиск
 * по названию компании или по её employer_id, §B4 сидов). Переиспользует
 * HhSearchService целиком: тот же разбор встроенного JSON-состояния, тот же троттл
 * hh.ru, та же схема ретраев — этот класс лишь строит URL страницы и ремапит
 * элементы под COMPANY_SITE (external_id = md5(vacancyUrl), логотип не качается —
 * §4.14 «logoUrl всегда null»).
 */
@Injectable()
export class HhSearchSiteParser implements CompanySiteParser {
  readonly key = HH_SEARCH_PARSER_KEY;

  constructor(private readonly hhSearch: HhSearchService) {}

  matches(url: URL): boolean {
    return isAllowedHhSearchUrlOrigin(url.href);
  }

  async fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult> {
    let rowUrl: URL;

    try {
      rowUrl = new URL(site.url);
    } catch {
      return { ok: false, message: HH_SEARCH_PARSER_NOT_SEARCH_URL_MESSAGE };
    }

    if (rowUrl.pathname !== HH_SEARCH_PARSER_SEARCH_PATH) {
      return { ok: false, message: HH_SEARCH_PARSER_NOT_SEARCH_URL_MESSAGE };
    }

    return collectPagedVacancies((index) => this.fetchPage(rowUrl, site.name, index));
  }

  private async fetchPage(
    rowUrl: URL,
    company: string,
    index: number,
  ): Promise<CompanySitePageResult> {
    const pageUrl = new URL(rowUrl);

    // §4.11.1/D9: order_by=publication_time — свежие вакансии первыми, тот же порядок,
    // что и у прогона hh.ru как основного источника (§4.11.3). {page} буквально в
    // строке никогда нет — URL уже абсолютный, buildHhSearchUrl ничего не подставляет.
    pageUrl.searchParams.set(HH_SEARCH_PARSER_ORDER_PARAM, HH_SEARCH_PARSER_ORDER_VALUE);
    pageUrl.searchParams.set(HH_SEARCH_PARSER_PAGE_PARAM, String(index));

    const pageResult = await this.hhSearch.fetchSearchPage({
      searchUrlTemplate: pageUrl.toString(),
      page: index,
    });

    if (!pageResult.ok) {
      return { ok: false, message: pageResult.message };
    }

    const { lastPage } = pageResult.page;
    const items: VacancySearchItem[] = pageResult.page.items.map((item) =>
      buildCompanySiteItem({
        vacancyUrl: item.vacancyUrl,
        // §4.14/D9: имя строки, а не company, разобранная со страницы hh.ru — строка
        // может искать по подстроке в названии (Fix Price, Папа Джонс), и hh.ru
        // способен вернуть однофамильца-непричастного работодателя.
        position: item.position,
        company,
        publishedAtIso: item.publishedAtIso,
        areaName: item.areaName,
        salaryFrom: item.salaryFrom,
        salaryTo: item.salaryTo,
      }),
    );

    return {
      ok: true,
      items,
      skippedInvalid: pageResult.page.skippedInvalid,
      hasMore: lastPage === null ? items.length > 0 : index < lastPage,
    };
  }

  async fetchDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const hhId = parseHhVacancyId(item.vacancyUrl);

    if (hhId === null) {
      return { ok: false, message: HH_SEARCH_PARSER_VACANCY_ID_MISSING_MESSAGE };
    }

    const result = await this.hhSearch.fetchVacancyDescription({ ...item, externalId: hhId });

    if (!result.ok) {
      return result;
    }

    // §4.14/D9: логотип не качается через троттл сайтов компаний — hh.ru-логотип уже
    // покрыт своим источником (лид HH), повторное скачивание тем же файлом было бы лишним.
    return { ok: true, description: result.description, logoUrl: null, logoAllowedHostPattern: null };
  }
}
