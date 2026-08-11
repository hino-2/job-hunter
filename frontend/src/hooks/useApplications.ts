import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchApplications, toApplicationsQueryParams } from '../api/applications.api';
import { DEFAULT_APPLICATION_FILTERS, STATUS_FILTER } from '../constants/application.constants';
import { APPLICATIONS_QUERY_KEY } from '../constants/query.constants';
import type {
  Application,
  ApplicationCounts,
  ApplicationsFilters,
} from '../types/application.interfaces';
import { countApplications } from '../utils/application.utils';

/**
 * Список записей под текущие фильтры (§5.1). retry/staleTime/refetchOnWindowFocus
 * не переопределяются — они заданы один раз в QUERY_CLIENT_OPTIONS.
 */
export function useApplications(filters: ApplicationsFilters): UseQueryResult<Application[]> {
  const params = useMemo(() => toApplicationsQueryParams(filters), [filters]);

  return useQuery({
    queryKey: [...APPLICATIONS_QUERY_KEY, params],
    queryFn: () => fetchApplications(params),
  });
}

/**
 * Счётчик «Открытых: N / M» (§7.8). Считает по нефильтрованному списку, потому что
 * §7.8 требует числа по всей базе: при фильтре «Закрытые» счёт по видимым записям
 * всегда давал бы 0.
 *
 * Ключ намеренно совпадает с ключом списка в дефолтном состоянии фильтров — React Query
 * схлопывает оба observer'а в один запрос, и лишнего трафика в типичном случае нет.
 */
export function useApplicationsCounts(): UseQueryResult<ApplicationCounts> {
  const params = useMemo(
    () =>
      toApplicationsQueryParams({
        ...DEFAULT_APPLICATION_FILTERS,
        status: STATUS_FILTER.ALL,
      }),
    [],
  );

  return useQuery({
    queryKey: [...APPLICATIONS_QUERY_KEY, params],
    queryFn: () => fetchApplications(params),
    // Ссылка на функцию, а не стрелка: инлайн пересоздавал бы select каждый рендер.
    select: countApplications,
  });
}
