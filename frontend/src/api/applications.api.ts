import { APPLICATIONS_ENDPOINT } from '../constants/api.constants';
import { STATUS_FILTER } from '../constants/application.constants';
import type {
  Application,
  ApplicationsFilters,
  ApplicationsQueryParams,
} from '../types/application.interfaces';
import { apiClient } from './client';

/**
 * Состояние панели фильтров → query-параметры §5.1.
 *
 * Ключи с пустым значением не добавляются вовсе: React Query хеширует объект-параметры
 * целиком, поэтому `search: ''` завёл бы отдельную запись в кэше, эквивалентную запросу
 * без поиска (бэкенд пустой search и так игнорирует).
 */
export function toApplicationsQueryParams(filters: ApplicationsFilters): ApplicationsQueryParams {
  const search = filters.search.trim();
  const params: ApplicationsQueryParams = {
    sort: filters.sort,
    order: filters.order,
  };

  if (filters.status !== STATUS_FILTER.ALL) {
    params.status = filters.status;
  }

  if (search.length > 0) {
    params.search = search;
  }

  return params;
}

/** GET /api/applications (§5.1). Плоский массив без пагинации; клиент ничего не досортировывает. */
export async function fetchApplications(params: ApplicationsQueryParams): Promise<Application[]> {
  const response = await apiClient.get<Application[]>(APPLICATIONS_ENDPOINT, { params });

  return response.data;
}
