import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { fetchVacancySearchSettings } from '../api/vacancy-search.api';
import { VACANCY_SEARCH_SETTINGS_QUERY_KEY } from '../constants/query.constants';
import type { VacancySearchSettings } from '../types/vacancy-search.interfaces';

/** Настройки поиска вакансий (§3.6, §7.9.4) — ресурс один, без параметров запроса. */
export function useVacancySearchSettings(): UseQueryResult<VacancySearchSettings> {
  return useQuery({
    queryKey: VACANCY_SEARCH_SETTINGS_QUERY_KEY,
    queryFn: fetchVacancySearchSettings,
  });
}
