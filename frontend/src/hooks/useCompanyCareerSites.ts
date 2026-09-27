import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchCompanyCareerSites } from '../api/company-career-sites.api';
import { COMPANY_CAREER_SITES_QUERY_KEY } from '../constants/query.constants';
import type { CompanyCareerSite } from '../types/company-career-site.interfaces';

/**
 * Список сайтов компаний целиком (§5.9) — без пагинации и фильтров: записей
 * ожидается не больше нескольких десятков (§4.14), а плоский список проще выпадающего
 * списка «источник по URL» на клиенте. retry/staleTime — из QUERY_CLIENT_OPTIONS.
 */
export function useCompanyCareerSites(): UseQueryResult<CompanyCareerSite[]> {
  return useQuery({
    queryKey: COMPANY_CAREER_SITES_QUERY_KEY,
    queryFn: fetchCompanyCareerSites,
  });
}
