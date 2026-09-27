import { Injectable, Logger } from '@nestjs/common';

import { VACANCY_SOURCE } from '../../applications/applications.constants';
import type { VacancySource } from '../../applications/applications.type';
import type {
  VacancyLeadSearchProvider,
  VacancySearchItem,
  VacancySearchPageRequest,
} from '../../vacancies/vacancies.interfaces';
import type {
  VacancyDescriptionResult,
  VacancySearchPageResult,
} from '../../vacancies/vacancies.type';
import { describeTransportError } from '../../vacancies/vacancy-retry.helpers';
import { CompanyCareerSitesService } from '../company-career-sites/company-career-sites.service';
import { CompanySiteParserRegistry } from '../company-site-parser/company-site-parser.registry';
import {
  COMPANY_SITE_LIST_FAILED_MESSAGE,
  COMPANY_SITE_PARSER_MISSING_MESSAGE,
} from '../company-sites.constants';
import { CompanySiteHttpClient } from '../company-sites.http-client';

/**
 * §4.14: реализация VacancyLeadSearchProvider для источника COMPANY_SITE — «страница»
 * прогона это N-я по счёту строка company_career_sites (§3.8), а не страница выдачи
 * одного сайта; searchUrlTemplate из плана ноги игнорируется (это фиксированный
 * сентинел, а не настоящая ссылка, §4.11.1). publicationDateKnown = false — конвейор
 * отбора (vacancy-scan.service.ts) на основании этого флага выключает возрастную
 * отсечку и переключает дедупликацию эшелона 2 на external_id (§4.11.5/§4.14).
 *
 * Никогда не бросает наружу: ошибка БД внутри fetchSearchPage превращается в
 * { ok: false }, ровно как транспортная ошибка у HTTP-источников.
 */
@Injectable()
export class CompanySiteSearchService implements VacancyLeadSearchProvider {
  readonly source: VacancySource = VACANCY_SOURCE.COMPANY_SITE;

  readonly publicationDateKnown = false;

  /** §4.11.2: тот же слот троттла, которым уже пользуется CompanySiteHttpClient — единый лимит на все хосты. */
  readonly acquireRequestSlot: () => Promise<void>;

  private readonly logger = new Logger(CompanySiteSearchService.name);

  constructor(
    private readonly sites: CompanyCareerSitesService,
    private readonly registry: CompanySiteParserRegistry,
    httpClient: CompanySiteHttpClient,
  ) {
    this.acquireRequestSlot = httpClient.acquireRequestSlot;
  }

  async fetchSearchPage(request: VacancySearchPageRequest): Promise<VacancySearchPageResult> {
    const { page } = request;

    try {
      const count = await this.sites.count();
      const lastPage = count > 0 ? count - 1 : null;

      if (page >= count) {
        return { ok: true, page: { items: [], lastPage, skippedInvalid: 0 } };
      }

      const site = await this.sites.findByIndex(page);

      if (site === null) {
        return { ok: true, page: { items: [], lastPage, skippedInvalid: 0 } };
      }

      const parser = this.registry.resolve(site.url);

      if (parser === null) {
        this.logger.warn(
          `Сайт компании «${site.name}» пропущен: ${COMPANY_SITE_PARSER_MISSING_MESSAGE}`,
        );

        return { ok: true, page: { items: [], lastPage, skippedInvalid: 0 } };
      }

      const list = await parser.fetchVacancies(site);

      if (!list.ok) {
        return { ok: false, message: `${site.name}: ${list.message}` };
      }

      return {
        ok: true,
        page: { items: list.items, lastPage, skippedInvalid: list.skippedInvalid },
      };
    } catch (error) {
      return {
        ok: false,
        message: describeTransportError(COMPANY_SITE_LIST_FAILED_MESSAGE, error),
      };
    }
  }

  async fetchVacancyDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult> {
    const parser = this.registry.resolve(item.vacancyUrl);

    if (parser === null) {
      return { ok: false, message: COMPANY_SITE_PARSER_MISSING_MESSAGE };
    }

    return parser.fetchDescription(item);
  }
}
