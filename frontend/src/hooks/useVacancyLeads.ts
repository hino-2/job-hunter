import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchVacancyLeads, toVacancyLeadsQueryParams } from '../api/vacancy-search.api';
import { VACANCY_LEADS_QUERY_KEY } from '../constants/query.constants';
import type { VacancyLead, VacancyLeadsFilters } from '../types/vacancy-search.interfaces';

/**
 * Список найденных вакансий под текущие фильтры (§5.7). retry/staleTime/refetchOnWindowFocus
 * не переопределяются — заданы один раз в QUERY_CLIENT_OPTIONS, тем же приёмом,
 * что useApplications.
 */
export function useVacancyLeads(filters: VacancyLeadsFilters): UseQueryResult<VacancyLead[]> {
  const params = useMemo(() => toVacancyLeadsQueryParams(filters), [filters]);

  return useQuery({
    queryKey: [...VACANCY_LEADS_QUERY_KEY, params],
    queryFn: () => fetchVacancyLeads(params),
  });
}
