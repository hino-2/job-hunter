import type { CompanyCareerSiteUpdate } from '../types/company-career-site.interfaces';

/** Аргументы мутации PATCH /api/company-career-sites/:id (§5.9). */
export interface UpdateCompanyCareerSiteVariables {
  id: string;
  patch: CompanyCareerSiteUpdate;
}

/**
 * Колбэки исхода живут в опциях хука, а не в вызове mutate() — тем же приёмом,
 * что UpdateApplicationOptions: строка правится по blur каждого поля независимо,
 * и второй mutate() отцепил бы колбэки первого от MutationObserver.
 */
export interface UpdateCompanyCareerSiteOptions {
  onFailed: (error: Error, variables: UpdateCompanyCareerSiteVariables) => void;
}
