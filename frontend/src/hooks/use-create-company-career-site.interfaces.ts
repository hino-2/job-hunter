import type { CompanyCareerSite } from '../types/company-career-site.interfaces';

/**
 * Колбэки исхода живут в опциях хука, а не в вызове mutate() — тем же приёмом,
 * что CreateApplicationOptions.
 */
export interface CreateCompanyCareerSiteOptions {
  onCreated: (created: CompanyCareerSite) => void;
  onFailed: (error: Error) => void;
}
