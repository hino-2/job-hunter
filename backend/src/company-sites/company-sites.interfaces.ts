import type { VacancyDescriptionResult } from '../vacancies/vacancies.type';
import type { VacancySearchItem } from '../vacancies/vacancies.interfaces';
import type { CompanyCareerSite } from './company-career-sites/company-career-site.entity';
import type { CompanySiteListResult } from './company-sites.type';

/**
 * §4.14: парсер сайта компании; диспетчеризация по хосту (CompanySiteParserRegistry).
 * Исключений наружу не выпускает.
 */
export interface CompanySiteParser {
  readonly key: string;
  matches(url: URL): boolean;
  fetchVacancies(site: CompanyCareerSite): Promise<CompanySiteListResult>;
  fetchDescription(item: VacancySearchItem): Promise<VacancyDescriptionResult>;
}

/** Вход buildCompanySiteItem: всё, чего парсер не знает, заполняется null/«сейчас». */
export interface CompanySiteItemInput {
  vacancyUrl: string;
  position: string;
  company: string;
  publishedAtIso?: string | null;
  areaName?: string | null;
  salaryFrom?: number | null;
  salaryTo?: number | null;
}

/** §4.14: один анкор списка вакансий, уже разобранный matchVacancyAnchors — id и его внутренний HTML. */
export interface CompanySiteAnchor {
  id: string;
  innerHtml: string;
}
