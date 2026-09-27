/**
 * §5.9, §4.14: сайт компании как источник поиска лидов. Ручная копия CompanyCareerSiteDto
 * из backend/src/company-sites/company-career-sites/dto/company-career-site.dto.ts (§3.4) —
 * порядок и имена полей совпадают построчно. Даты здесь строки ISO 8601, JSON их не оживляет.
 */
export interface CompanyCareerSite {
  id: string;
  name: string;
  url: string;
  parserSupported: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Тело POST /api/company-career-sites (§5.9). */
export interface CompanyCareerSiteCreate {
  name: string;
  url: string;
}

/** Тело PATCH /api/company-career-sites/:id (§5.9): оба поля опциональны, отсутствие — «не трогать». */
export interface CompanyCareerSiteUpdate {
  name?: string;
  url?: string;
}
