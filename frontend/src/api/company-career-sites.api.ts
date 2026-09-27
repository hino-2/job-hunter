import { API_PATH_SEPARATOR, COMPANY_CAREER_SITES_ENDPOINT } from '../constants/api.constants';
import type {
  CompanyCareerSite,
  CompanyCareerSiteCreate,
  CompanyCareerSiteUpdate,
} from '../types/company-career-site.interfaces';
import { apiClient } from './client';

/** GET /api/company-career-sites (§5.9) — упорядочено name ASC, id ASC на сервере. */
export async function fetchCompanyCareerSites(): Promise<CompanyCareerSite[]> {
  const response = await apiClient.get<CompanyCareerSite[]>(COMPANY_CAREER_SITES_ENDPOINT);

  return response.data;
}

/** POST /api/company-career-sites (§5.9) — добавление строки таблицы «Сайты компаний». */
export async function createCompanyCareerSite(
  payload: CompanyCareerSiteCreate,
): Promise<CompanyCareerSite> {
  const response = await apiClient.post<CompanyCareerSite>(COMPANY_CAREER_SITES_ENDPOINT, payload);

  return response.data;
}

/** PATCH /api/company-career-sites/:id (§5.9) — автосейв поля по blur. */
export async function updateCompanyCareerSite(
  id: string,
  patch: CompanyCareerSiteUpdate,
): Promise<CompanyCareerSite> {
  const response = await apiClient.patch<CompanyCareerSite>(
    `${COMPANY_CAREER_SITES_ENDPOINT}${API_PATH_SEPARATOR}${id}`,
    patch,
  );

  return response.data;
}

/** DELETE /api/company-career-sites/:id (§5.9) — удаление без подтверждения (§7.9). */
export async function deleteCompanyCareerSite(id: string): Promise<void> {
  await apiClient.delete(`${COMPANY_CAREER_SITES_ENDPOINT}${API_PATH_SEPARATOR}${id}`);
}
